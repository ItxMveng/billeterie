-- ===========================================================================
-- Sprint 2 — Cœur métier : vérification, paiements, tickets, imports, audit
-- ---------------------------------------------------------------------------
-- Principe de sécurité central : les statuts sensibles
-- (verification_status = VERIFIED, payment_status = PAID, ticket_status =
-- GENERATED, exemption payment_required = false) ne peuvent être posés QUE par
-- les fonctions SECURITY DEFINER ci-dessous, après contrôle du rôle. Le client
-- n'écrit jamais ces colonnes directement (voir SECURITY.md).
--
-- À exécuter APRÈS 0003_sprint2_enums.sql (valeurs d'enum committées).
-- ===========================================================================

-- --- Enum dédié à la liste officielle de vérification ----------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'verification_record_status') then
    create type verification_record_status as enum ('AVAILABLE', 'MATCHED', 'ARCHIVED');
  end if;
end $$;

-- --- Séquences de références lisibles --------------------------------------
create sequence if not exists public.payment_ref_seq;
create sequence if not exists public.ticket_seq;

-- --- Colonnes supplémentaires sur participants -----------------------------
alter table public.participants
  add column if not exists payment_required boolean,
  add column if not exists payment_reference text,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists verified_at timestamptz,
  add column if not exists rejected_reason text,
  add column if not exists access_token_hash text,
  add column if not exists source text not null default 'PUBLIC';

create index if not exists participants_email_lower_idx
  on public.participants (lower(email));
create index if not exists participants_access_token_idx
  on public.participants (access_token_hash);

-- ===========================================================================
-- Fonctions utilitaires
-- ===========================================================================

-- Rôle FINANCE (ou plus) — pour les confirmations de paiement.
create or replace function public.is_finance()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('FINANCE', 'ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Référence de paiement lisible et unique : PAY-YYYY-00001
create or replace function public.next_payment_reference()
returns text language sql volatile as $$
  select 'PAY-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.payment_ref_seq')::text, 5, '0');
$$;

-- Numéro de ticket lisible et unique : EVT-YYYY-00001
create or replace function public.next_ticket_number()
returns text language sql volatile as $$
  select 'EVT-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.ticket_seq')::text, 5, '0');
$$;

-- Événement actif (publié) le plus proche.
create or replace function public.active_event_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.events
  where status = 'PUBLISHED'
  order by date asc
  limit 1;
$$;

-- Journalisation d'audit (usage interne aux fonctions sécurisées).
create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb
) returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- ===========================================================================
-- Trigger d'états initiaux (mis à jour : GUC de contournement + payment_required)
-- ---------------------------------------------------------------------------
-- Les fonctions privilégiées posent app.bypass_status_trigger = 'on' pour
-- fournir des valeurs explicites contrôlées. Tout autre INSERT reçoit des
-- valeurs sûres dérivées de la catégorie (défense en profondeur).
-- ===========================================================================
create or replace function public.set_participant_initial_status()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.bypass_status_trigger', true), '') = 'on' then
    -- Chemin contrôlé (RPC sécurisée) : ne pas écraser les valeurs fournies.
    if new.payment_required is null then
      new.payment_required := (new.participant_type <> 'NEW_STUDENT');
    end if;
    return new;
  end if;

  if new.participant_type = 'NEW_STUDENT' then
    new.verification_status := 'PENDING';
    new.payment_status := 'NOT_REQUIRED';
    new.payment_required := false;
  else
    new.verification_status := 'NOT_REQUIRED';
    new.payment_status := 'PENDING';
    new.payment_required := true;
  end if;
  new.registration_status := 'PENDING';
  new.ticket_status := 'NOT_GENERATED';
  new.checked_in := false;
  new.checked_in_at := null;
  return new;
end;
$$;

-- ===========================================================================
-- Table : student_verification_records (liste officielle)
-- ===========================================================================
create table if not exists public.student_verification_records (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  school_id uuid references public.schools(id) on delete set null,
  external_identifier text,
  source text not null default 'IMPORT',
  status verification_record_status not null default 'AVAILABLE',
  matched_participant_id uuid references public.participants(id) on delete set null,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists svr_email_lower_idx
  on public.student_verification_records (lower(email));
create index if not exists svr_status_idx
  on public.student_verification_records (status);

drop trigger if exists trg_svr_updated_at on public.student_verification_records;
create trigger trg_svr_updated_at before update on public.student_verification_records
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Table : payments
-- ===========================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  provider text not null default 'WERO',
  reference text not null unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  status payment_status not null default 'PENDING',
  payment_method text,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_participant_idx on public.payments (participant_id);
create index if not exists payments_status_idx on public.payments (status);
-- Un seul paiement "actif" par participant (évite les doublons de référence).
create unique index if not exists payments_active_unique
  on public.payments (participant_id)
  where status in ('PENDING', 'AWAITING_CONFIRMATION');

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Table : tickets
-- ---------------------------------------------------------------------------
-- Le QR encode le TOKEN D'ACCÈS du participant (haute entropie, hashé dans
-- participants.access_token_hash) : aucune donnée personnelle, aucun secret en
-- clair stocké. Un seul ticket par participant (idempotence via unique).
-- ===========================================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  ticket_number text not null unique,
  status ticket_status not null default 'GENERATED',
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_participant_idx on public.tickets (participant_id);

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- Table : audit_logs
-- ===========================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_created_idx on public.audit_logs (created_at desc);

-- ===========================================================================
-- Table : import_batches (journalisation des imports)
-- ===========================================================================
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  kind text not null,
  filename text,
  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_rows integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- Éligibilité au ticket (miroir SQL de canGenerateTicket — défense serveur)
-- ===========================================================================
create or replace function public.can_generate_ticket(p public.participants)
returns boolean language plpgsql immutable as $$
begin
  if p.registration_status = 'REJECTED' then return false; end if;
  if p.participant_type = 'NEW_STUDENT' and p.verification_status <> 'VERIFIED' then
    return false;
  end if;
  if coalesce(p.payment_required, p.participant_type <> 'NEW_STUDENT') then
    return p.payment_status = 'PAID';
  end if;
  return true;
end;
$$;

-- Génération interne (idempotente) d'un ticket. Suppose l'autorisation déjà vérifiée.
create or replace function public._generate_ticket_internal(p_participant_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_p public.participants;
  v_number text;
  v_existing text;
begin
  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then
    raise exception 'Participant introuvable' using errcode = 'P0002';
  end if;

  select ticket_number into v_existing from public.tickets
  where participant_id = p_participant_id and status <> 'CANCELLED';
  if v_existing is not null then
    update public.participants set ticket_status = 'GENERATED' where id = p_participant_id;
    return v_existing; -- idempotent
  end if;

  if not public.can_generate_ticket(v_p) then
    raise exception 'Conditions de génération du ticket non remplies' using errcode = 'P0001';
  end if;

  v_number := public.next_ticket_number();
  insert into public.tickets (participant_id, event_id, ticket_number, status, issued_by)
  values (p_participant_id, v_p.event_id, v_number, 'GENERATED', auth.uid());

  update public.participants set ticket_status = 'GENERATED' where id = p_participant_id;
  perform public.log_audit('GENERATE_TICKET', 'participant', p_participant_id,
                           jsonb_build_object('ticket_number', v_number));
  return v_number;
end;
$$;

-- ===========================================================================
-- RPC PUBLIQUE : inscription (remplace l'INSERT direct public)
-- ===========================================================================
create or replace function public.register_participant(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_type participant_type;
  v_event_id uuid;
  v_school_id uuid;
  v_required boolean;
  v_id uuid;
  v_token text;
  v_hash text;
  v_ref text;
  v_amount integer := 0;
  v_currency text := 'EUR';
begin
  v_type := (payload->>'participant_type')::participant_type;
  v_event_id := coalesce(nullif(payload->>'event_id','')::uuid, public.active_event_id());
  v_school_id := nullif(payload->>'school_id','')::uuid;

  if coalesce(trim(payload->>'first_name'),'') = '' or
     coalesce(trim(payload->>'last_name'),'')  = '' or
     coalesce(trim(payload->>'email'),'')      = '' or
     coalesce(trim(payload->>'phone'),'')      = '' then
    raise exception 'Champs obligatoires manquants' using errcode = 'P0001';
  end if;

  v_required := (v_type <> 'NEW_STUDENT');
  v_token := encode(gen_random_bytes(24), 'hex');
  v_hash  := encode(digest(v_token, 'sha256'), 'hex');

  perform set_config('app.bypass_status_trigger', 'on', true);

  insert into public.participants (
    event_id, first_name, last_name, email, phone, participant_type, school_id,
    verification_status, payment_status, registration_status, ticket_status,
    payment_required, access_token_hash, source
  ) values (
    v_event_id, trim(payload->>'first_name'), trim(payload->>'last_name'),
    lower(trim(payload->>'email')), trim(payload->>'phone'), v_type, v_school_id,
    case when v_type = 'NEW_STUDENT' then 'PENDING'::verification_status else 'NOT_REQUIRED'::verification_status end,
    case when v_required then 'PENDING'::payment_status else 'NOT_REQUIRED'::payment_status end,
    'PENDING'::registration_status, 'NOT_GENERATED'::ticket_status,
    v_required, v_hash, 'PUBLIC'
  ) returning id into v_id;

  perform set_config('app.bypass_status_trigger', 'off', true);

  if v_required then
    select case when v_type = 'ALUMNI' then alumni_price_cents else other_price_cents end,
           currency
      into v_amount, v_currency
    from public.events where id = v_event_id;
    v_amount := coalesce(v_amount, 0);
    v_currency := coalesce(v_currency, 'EUR');

    v_ref := public.next_payment_reference();
    insert into public.payments (participant_id, event_id, provider, reference,
                                 amount_cents, currency, status)
    values (v_id, v_event_id, 'WERO', v_ref, v_amount, v_currency, 'PENDING');

    update public.participants set payment_reference = v_ref where id = v_id;
  end if;

  return jsonb_build_object(
    'participant_id', v_id,
    'access_token', v_token,
    'payment_required', v_required,
    'payment_reference', v_ref,
    'amount_cents', v_amount,
    'currency', v_currency
  );
end;
$$;

-- ===========================================================================
-- RPC PUBLIQUE : déclaration de paiement (jamais PAID)
-- ===========================================================================
create or replace function public.submit_payment_declaration(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_participant_id uuid;
  v_payment public.payments;
begin
  select id into v_participant_id from public.participants
  where access_token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex');
  if v_participant_id is null then
    raise exception 'Accès invalide' using errcode = '42501';
  end if;

  select * into v_payment from public.payments
  where participant_id = v_participant_id and status in ('PENDING','AWAITING_CONFIRMATION')
  order by created_at desc limit 1 for update;
  if not found then
    return jsonb_build_object('status', 'NONE');
  end if;

  if v_payment.status = 'PENDING' then
    update public.payments set status = 'AWAITING_CONFIRMATION' where id = v_payment.id;
    update public.participants set payment_status = 'AWAITING_CONFIRMATION'
      where id = v_participant_id;
  end if;

  return jsonb_build_object('status', 'AWAITING_CONFIRMATION', 'reference', v_payment.reference);
end;
$$;

-- ===========================================================================
-- RPC PUBLIQUES : consultation par token (pas d'énumération d'ID)
-- ===========================================================================
create or replace function public.get_participant_status(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.participants; v_ticket text;
begin
  select * into v_p from public.participants
  where access_token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex');
  if not found then return null; end if;
  select ticket_number into v_ticket from public.tickets
    where participant_id = v_p.id and status = 'GENERATED';
  return jsonb_build_object(
    'first_name', v_p.first_name,
    'participant_type', v_p.participant_type,
    'verification_status', v_p.verification_status,
    'payment_required', v_p.payment_required,
    'payment_status', v_p.payment_status,
    'payment_reference', v_p.payment_reference,
    'registration_status', v_p.registration_status,
    'ticket_status', v_p.ticket_status,
    'ticket_number', v_ticket
  );
end;
$$;

create or replace function public.get_ticket_by_token(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.participants; v_t public.tickets; v_school text; v_ev public.events;
begin
  select * into v_p from public.participants
  where access_token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex');
  if not found then return null; end if;

  select * into v_t from public.tickets
    where participant_id = v_p.id and status = 'GENERATED';
  if not found then return null; end if;

  select name into v_school from public.schools where id = v_p.school_id;
  select * into v_ev from public.events where id = v_p.event_id;

  return jsonb_build_object(
    'ticket_number', v_t.ticket_number,
    'first_name', v_p.first_name,
    'last_name', v_p.last_name,
    'participant_type', v_p.participant_type,
    'school_name', v_school,
    'event_name', v_ev.name,
    'event_date', v_ev.date,
    'event_location', v_ev.location
  );
end;
$$;

-- ===========================================================================
-- RPC ADMIN : vérification des nouveaux étudiants
-- ===========================================================================
create or replace function public.admin_verify_student(p_participant_id uuid, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.participants; v_ticket text;
begin
  if not public.is_admin() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;
  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then raise exception 'Participant introuvable' using errcode = 'P0002'; end if;
  if v_p.participant_type <> 'NEW_STUDENT' then
    raise exception 'Seuls les nouveaux étudiants sont vérifiables' using errcode = 'P0001';
  end if;

  if v_p.verification_status <> 'VERIFIED' then
    update public.participants
      set verification_status = 'VERIFIED', verified_by = auth.uid(),
          verified_at = now(), registration_status = 'CONFIRMED'
      where id = p_participant_id;
    perform public.log_audit('VERIFY_STUDENT', 'participant', p_participant_id,
                             jsonb_build_object('notes', p_notes));
    select * into v_p from public.participants where id = p_participant_id;
  end if;

  if public.can_generate_ticket(v_p) then
    v_ticket := public._generate_ticket_internal(p_participant_id);
  end if;
  return jsonb_build_object('verification_status', 'VERIFIED', 'ticket_number', v_ticket);
end;
$$;

create or replace function public.admin_reject_student(p_participant_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  update public.participants
    set verification_status = 'REJECTED', registration_status = 'REJECTED',
        rejected_reason = p_reason
    where id = p_participant_id and participant_type = 'NEW_STUDENT';
  if not found then raise exception 'Participant introuvable' using errcode = 'P0002'; end if;
  perform public.log_audit('REJECT_STUDENT', 'participant', p_participant_id,
                           jsonb_build_object('reason', p_reason));
  return jsonb_build_object('verification_status', 'REJECTED');
end;
$$;

-- ===========================================================================
-- RPC ADMIN/FINANCE : paiements
-- ===========================================================================
create or replace function public.admin_confirm_payment(p_payment_id uuid, p_method text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pay public.payments; v_p public.participants; v_ticket text;
begin
  if not public.is_finance() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Paiement introuvable' using errcode = 'P0002'; end if;

  if v_pay.status <> 'PAID' then
    if v_pay.status not in ('PENDING','AWAITING_CONFIRMATION') then
      raise exception 'Transition de paiement interdite : % -> PAID', v_pay.status using errcode = 'P0001';
    end if;
    update public.payments
      set status = 'PAID', confirmed_at = now(), confirmed_by = auth.uid(),
          payment_method = coalesce(p_method, payment_method)
      where id = p_payment_id;
    update public.participants
      set payment_status = 'PAID', registration_status = 'CONFIRMED'
      where id = v_pay.participant_id;
    perform public.log_audit('CONFIRM_PAYMENT', 'payment', p_payment_id,
                             jsonb_build_object('reference', v_pay.reference));
  end if;

  select * into v_p from public.participants where id = v_pay.participant_id;
  if public.can_generate_ticket(v_p) then
    v_ticket := public._generate_ticket_internal(v_pay.participant_id);
  end if;
  return jsonb_build_object('payment_status', 'PAID', 'ticket_number', v_ticket);
end;
$$;

create or replace function public.admin_reject_payment(p_payment_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pay public.payments;
begin
  if not public.is_finance() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Paiement introuvable' using errcode = 'P0002'; end if;
  if v_pay.status = 'PAID' then
    raise exception 'Un paiement confirmé ne peut être rejeté' using errcode = 'P0001';
  end if;
  update public.payments set status = 'REJECTED',
    metadata = v_pay.metadata || jsonb_build_object('reject_reason', p_reason)
    where id = p_payment_id;
  update public.participants set payment_status = 'REJECTED' where id = v_pay.participant_id;
  perform public.log_audit('REJECT_PAYMENT', 'payment', p_payment_id,
                           jsonb_build_object('reason', p_reason));
  return jsonb_build_object('payment_status', 'REJECTED');
end;
$$;

-- Exemption : payment_required = false (dirigeants/officiels), sans 4e catégorie.
create or replace function public.admin_waive_payment(p_participant_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_p public.participants; v_ticket text;
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then raise exception 'Participant introuvable' using errcode = 'P0002'; end if;

  update public.payments set status = 'REJECTED',
    metadata = metadata || jsonb_build_object('waived', true, 'reason', p_reason)
    where participant_id = p_participant_id and status in ('PENDING','AWAITING_CONFIRMATION');

  update public.participants
    set payment_required = false, payment_status = 'NOT_REQUIRED',
        registration_status = 'CONFIRMED'
    where id = p_participant_id;
  perform public.log_audit('WAIVE_PAYMENT', 'participant', p_participant_id,
                           jsonb_build_object('reason', p_reason));

  select * into v_p from public.participants where id = p_participant_id;
  if public.can_generate_ticket(v_p) then
    v_ticket := public._generate_ticket_internal(p_participant_id);
  end if;
  return jsonb_build_object('payment_required', false, 'ticket_number', v_ticket);
end;
$$;

-- ===========================================================================
-- RPC ADMIN : tickets
-- ===========================================================================
create or replace function public.admin_generate_ticket(p_participant_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_number text;
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  v_number := public._generate_ticket_internal(p_participant_id);
  return jsonb_build_object('ticket_number', v_number);
end;
$$;

create or replace function public.admin_cancel_ticket(p_participant_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  update public.tickets set status = 'CANCELLED'
    where participant_id = p_participant_id and status = 'GENERATED';
  update public.participants set ticket_status = 'CANCELLED' where id = p_participant_id;
  perform public.log_audit('CANCEL_TICKET', 'participant', p_participant_id,
                           jsonb_build_object('reason', p_reason));
  return jsonb_build_object('ticket_status', 'CANCELLED');
end;
$$;

-- ===========================================================================
-- RPC ADMIN : import des participants (dédup, idempotent, journalisé)
-- ---------------------------------------------------------------------------
-- p_rows : tableau JSON d'objets {first_name,last_name,email,phone,
--   participant_type, school_id?, payment_required?, already_paid?,
--   external_identifier?}. Dédup par email normalisé (+ événement actif).
-- ===========================================================================
create or replace function public.import_participants(p_rows jsonb, p_filename text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_batch uuid;
  v_event uuid := public.active_event_id();
  v_total int := 0; v_ins int := 0; v_skip int := 0; v_err int := 0;
  v_issues jsonb := '[]'::jsonb;
  v_tokens jsonb := '[]'::jsonb;
  v_type participant_type;
  v_email text; v_required boolean; v_already_paid boolean;
  v_id uuid; v_token text; v_hash text; v_ref text; v_amount int; v_currency text;
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;

  insert into public.import_batches (created_by, kind, filename, total_rows)
  values (auth.uid(), 'PARTICIPANTS', p_filename, jsonb_array_length(p_rows))
  returning id into v_batch;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_total := v_total + 1;
    begin
      v_email := lower(trim(coalesce(v_row->>'email','')));
      if v_email = '' or position('@' in v_email) < 2 then
        v_err := v_err + 1;
        v_issues := v_issues || jsonb_build_object('row', v_total, 'error', 'email invalide');
        continue;
      end if;
      if coalesce(trim(v_row->>'first_name'),'') = '' or coalesce(trim(v_row->>'last_name'),'') = '' then
        v_err := v_err + 1;
        v_issues := v_issues || jsonb_build_object('row', v_total, 'error', 'nom/prénom manquant');
        continue;
      end if;

      begin
        v_type := (v_row->>'participant_type')::participant_type;
      exception when others then
        v_err := v_err + 1;
        v_issues := v_issues || jsonb_build_object('row', v_total, 'error', 'catégorie invalide');
        continue;
      end;

      -- Déduplication : email déjà présent (même événement) → on saute.
      if exists (
        select 1 from public.participants
        where lower(email) = v_email
          and coalesce(event_id,'00000000-0000-0000-0000-000000000000'::uuid)
              = coalesce(v_event,'00000000-0000-0000-0000-000000000000'::uuid)
      ) then
        v_skip := v_skip + 1;
        v_issues := v_issues || jsonb_build_object('row', v_total, 'skipped', 'doublon email');
        continue;
      end if;

      v_already_paid := coalesce((v_row->>'already_paid')::boolean, false);
      if v_row ? 'payment_required' and (v_row->>'payment_required') <> '' then
        v_required := (v_row->>'payment_required')::boolean;
      else
        v_required := (v_type <> 'NEW_STUDENT');
      end if;

      v_token := encode(gen_random_bytes(24), 'hex');
      v_hash  := encode(digest(v_token, 'sha256'), 'hex');

      perform set_config('app.bypass_status_trigger', 'on', true);
      insert into public.participants (
        event_id, first_name, last_name, email, phone, participant_type, school_id,
        verification_status, payment_status, registration_status, ticket_status,
        payment_required, access_token_hash, source
      ) values (
        v_event, trim(v_row->>'first_name'), trim(v_row->>'last_name'), v_email,
        coalesce(trim(v_row->>'phone'),''), v_type, nullif(v_row->>'school_id','')::uuid,
        case when v_type = 'NEW_STUDENT' then 'PENDING'::verification_status else 'NOT_REQUIRED'::verification_status end,
        case
          when v_already_paid then 'PAID'::payment_status
          when v_required then 'PENDING'::payment_status
          else 'NOT_REQUIRED'::payment_status
        end,
        case when v_already_paid or not v_required then 'CONFIRMED'::registration_status else 'PENDING'::registration_status end,
        'NOT_GENERATED'::ticket_status,
        v_required, v_hash, 'IMPORT'
      ) returning id into v_id;
      perform set_config('app.bypass_status_trigger', 'off', true);

      if v_already_paid then
        v_ref := public.next_payment_reference();
        insert into public.payments (participant_id, event_id, provider, reference,
                                     amount_cents, currency, status, confirmed_at, confirmed_by, metadata)
        select v_id, v_event, 'IMPORT', v_ref,
               case when v_type = 'ALUMNI' then e.alumni_price_cents else e.other_price_cents end,
               coalesce(e.currency,'EUR'), 'PAID', now(), auth.uid(),
               jsonb_build_object('imported_paid', true)
        from (select * from public.events where id = v_event) e;
        update public.participants set payment_reference = v_ref where id = v_id;
      elsif v_required then
        v_ref := public.next_payment_reference();
        select case when v_type = 'ALUMNI' then alumni_price_cents else other_price_cents end,
               currency into v_amount, v_currency from public.events where id = v_event;
        insert into public.payments (participant_id, event_id, provider, reference,
                                     amount_cents, currency, status)
        values (v_id, v_event, 'WERO', v_ref, coalesce(v_amount,0), coalesce(v_currency,'EUR'), 'PENDING');
        update public.participants set payment_reference = v_ref where id = v_id;
      end if;

      v_ins := v_ins + 1;
      v_tokens := v_tokens || jsonb_build_object('email', v_email, 'access_token', v_token);
    exception when others then
      perform set_config('app.bypass_status_trigger', 'off', true);
      v_err := v_err + 1;
      v_issues := v_issues || jsonb_build_object('row', v_total, 'error', SQLERRM);
    end;
  end loop;

  update public.import_batches
    set inserted_rows = v_ins, skipped_rows = v_skip, error_rows = v_err,
        metadata = jsonb_build_object('issues', v_issues)
    where id = v_batch;
  perform public.log_audit('IMPORT_PARTICIPANTS', 'import_batch', v_batch,
    jsonb_build_object('total', v_total, 'inserted', v_ins, 'skipped', v_skip, 'errors', v_err));

  return jsonb_build_object('batch_id', v_batch, 'total', v_total, 'inserted', v_ins,
                            'skipped', v_skip, 'errors', v_err, 'issues', v_issues,
                            'tokens', v_tokens);
end;
$$;

-- ===========================================================================
-- RPC ADMIN : import de la liste officielle de vérification
-- ===========================================================================
create or replace function public.import_verification_records(p_rows jsonb, p_filename text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb; v_batch uuid;
  v_total int := 0; v_ins int := 0; v_skip int := 0; v_err int := 0;
  v_issues jsonb := '[]'::jsonb; v_email text;
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;

  insert into public.import_batches (created_by, kind, filename, total_rows)
  values (auth.uid(), 'VERIFICATION_RECORDS', p_filename, jsonb_array_length(p_rows))
  returning id into v_batch;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_total := v_total + 1;
    begin
      if coalesce(trim(v_row->>'first_name'),'') = '' or coalesce(trim(v_row->>'last_name'),'') = '' then
        v_err := v_err + 1;
        v_issues := v_issues || jsonb_build_object('row', v_total, 'error', 'nom/prénom manquant');
        continue;
      end if;
      v_email := lower(trim(coalesce(v_row->>'email','')));

      if v_email <> '' and exists (
        select 1 from public.student_verification_records where lower(email) = v_email
      ) then
        v_skip := v_skip + 1;
        v_issues := v_issues || jsonb_build_object('row', v_total, 'skipped', 'doublon');
        continue;
      end if;

      insert into public.student_verification_records
        (first_name, last_name, email, school_id, external_identifier, source, status)
      values (trim(v_row->>'first_name'), trim(v_row->>'last_name'),
              nullif(v_email,''), nullif(v_row->>'school_id','')::uuid,
              nullif(v_row->>'external_identifier',''), 'IMPORT', 'AVAILABLE');
      v_ins := v_ins + 1;
    exception when others then
      v_err := v_err + 1;
      v_issues := v_issues || jsonb_build_object('row', v_total, 'error', SQLERRM);
    end;
  end loop;

  update public.import_batches
    set inserted_rows = v_ins, skipped_rows = v_skip, error_rows = v_err,
        metadata = jsonb_build_object('issues', v_issues)
    where id = v_batch;
  perform public.log_audit('IMPORT_VERIFICATION_RECORDS', 'import_batch', v_batch,
    jsonb_build_object('total', v_total, 'inserted', v_ins, 'skipped', v_skip, 'errors', v_err));

  return jsonb_build_object('batch_id', v_batch, 'total', v_total, 'inserted', v_ins,
                            'skipped', v_skip, 'errors', v_err, 'issues', v_issues);
end;
$$;
