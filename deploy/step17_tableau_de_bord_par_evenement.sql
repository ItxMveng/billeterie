-- ============================================================================
-- ETAPE 17 — Tableau de bord par evenement + plan de salle
-- Coller dans l'editeur SQL Supabase (projet qmpgvwurjfrihstjddzo), puis RUN.
-- ----------------------------------------------------------------------------
-- A lancer AVANT le deploiement du site : sans ce script, les statistiques du
-- tableau de bord ne s'affichent pas.
-- Contient l'etape 16 (choix du diplome) : inutile de la lancer a part.
-- Idempotent : peut etre relance sans risque.
-- Contenu : supabase/migrations/0017_guest_of_graduates.sql
--           + supabase/migrations/0018_stats_per_event.sql
--           + description de l'evenement sans « du CPBA ».
-- ============================================================================

-- ===========================================================================
-- Familles / invités des diplômés : de quel(s) diplômé(s) sont-ils l'invité ?
-- ---------------------------------------------------------------------------
-- Sert au plan de salle. La liste des diplômés vit côté application
-- (src/config/graduates.ts) ; la base stocke les noms choisis tels quels.
--
-- La saisie est obligatoire dans le formulaire pour la catégorie OTHER, mais
-- pas imposée ici : les imports et les inscriptions faites avant ce script
-- n'ont pas de valeur.
--
-- Idempotent. Seul changement de register_participant par rapport à 0013 :
-- l'enregistrement de guest_of.
-- ===========================================================================

alter table public.participants
  add column if not exists guest_of text[] not null default '{}';

create or replace function public.register_participant(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_type participant_type;
  v_event_id uuid;
  v_school_id uuid;
  v_guest_of text[] := '{}';
  v_required boolean;
  v_id uuid;
  v_token text;
  v_hash text;
  v_ref text;
  v_amount integer := 0;
  v_currency text := 'EUR';
  v_verified boolean := false;
  v_verification text;
  v_ticket text;
  v_p public.participants;
begin
  v_type := (payload->>'participant_type')::participant_type;
  v_event_id := coalesce(nullif(payload->>'event_id','')::uuid, public.active_event_id());
  v_school_id := nullif(payload->>'school_id','')::uuid;

  -- Diplômé(s) dont la personne est l'invitée : noms nettoyés, sans doublon.
  if jsonb_typeof(payload->'guest_of') = 'array' then
    select coalesce(array_agg(distinct left(trim(v), 100)), '{}')
      into v_guest_of
    from jsonb_array_elements_text(payload->'guest_of') as g(v)
    where trim(v) <> '';
    if cardinality(v_guest_of) > 20 then
      raise exception 'Trop de diplômés sélectionnés' using errcode = 'P0001';
    end if;
  end if;

  if coalesce(trim(payload->>'first_name'),'') = '' or
     coalesce(trim(payload->>'last_name'),'')  = '' or
     coalesce(trim(payload->>'email'),'')      = '' or
     coalesce(trim(payload->>'phone'),'')      = '' then
    raise exception 'Champs obligatoires manquants' using errcode = 'P0001';
  end if;

  -- Tarif applicable : les nouveaux étudiants sont gratuits par construction.
  select case
           when v_type = 'NEW_STUDENT' then 0
           when v_type = 'ALUMNI' then alumni_price_cents
           else other_price_cents
         end,
         currency
    into v_amount, v_currency
  from public.events where id = v_event_id;

  v_amount   := coalesce(v_amount, 0);
  v_currency := coalesce(v_currency, 'EUR');
  v_required := (v_amount > 0);

  v_token := encode(gen_random_bytes(24), 'hex');
  v_hash  := encode(digest(v_token, 'sha256'), 'hex');

  perform set_config('app.bypass_status_trigger', 'on', true);

  insert into public.participants (
    event_id, first_name, last_name, email, phone, participant_type, school_id,
    external_identifier, guest_of,
    verification_status, payment_status, registration_status, ticket_status,
    payment_required, access_token_hash, source
  ) values (
    v_event_id, trim(payload->>'first_name'), trim(payload->>'last_name'),
    lower(trim(payload->>'email')), trim(payload->>'phone'), v_type, v_school_id,
    nullif(trim(coalesce(payload->>'external_identifier','')), ''), v_guest_of,
    case when v_type = 'NEW_STUDENT' then 'PENDING'::verification_status
         else 'NOT_REQUIRED'::verification_status end,
    case when v_required then 'PENDING'::payment_status
         else 'NOT_REQUIRED'::payment_status end,
    -- Rien à encaisser => l'inscription est confirmée d'emblée.
    case when v_required then 'PENDING'::registration_status
         else 'CONFIRMED'::registration_status end,
    'NOT_GENERATED'::ticket_status,
    v_required, v_hash, 'PUBLIC'
  ) returning id into v_id;

  perform set_config('app.bypass_status_trigger', 'off', true);

  -- Paiement uniquement si un tarif est réellement configuré.
  if v_required then
    v_ref := public.next_payment_reference();
    insert into public.payments (participant_id, event_id, provider, reference,
                                 amount_cents, currency, status)
    values (v_id, v_event_id, 'WERO', v_ref, v_amount, v_currency, 'PENDING');
    update public.participants set payment_reference = v_ref where id = v_id;
  end if;

  -- Rapprochement avec la liste officielle (suivi, n'est plus bloquant).
  if v_type = 'NEW_STUDENT' then
    v_verified := public.try_auto_verify_new_student(v_id);
  end if;

  -- Émission immédiate du billet dès que les conditions sont réunies.
  begin
    select * into v_p from public.participants where id = v_id;
    if public.can_generate_ticket(v_p) then
      v_ticket := public._generate_ticket_internal(v_id);
    end if;
  exception when others then
    v_ticket := null; -- un échec d'émission ne doit jamais casser l'inscription
  end;

  select verification_status::text into v_verification
  from public.participants where id = v_id;

  return jsonb_build_object(
    'participant_id', v_id,
    'access_token', v_token,
    'payment_required', v_required,
    'payment_reference', v_ref,
    'amount_cents', v_amount,
    'currency', v_currency,
    'verification_status', v_verification,
    'auto_verified', v_verified,
    'ticket_number', v_ticket
  );
end;
$fn$;

revoke execute on function public.register_participant(jsonb) from public;
grant  execute on function public.register_participant(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

-- ===========================================================================
-- Tableau de bord par événement
-- ---------------------------------------------------------------------------
-- 1. Statistiques et séries temporelles filtrables par événement
--    (p_event_id). Sans paramètre : tous les événements, comme avant.
--    Ajout du compte des invités CPBA (CPBA_GUEST).
-- 2. Modification d'un participant : on peut aussi corriger le ou les
--    diplômés dont il est l'invité (p_guest_of ; null = inchangé).
--
-- Les anciennes signatures sont supprimées pour éviter toute ambiguïté
-- d'appel. Idempotent.
-- ===========================================================================

drop function if exists public.get_event_stats();
drop function if exists public.get_time_series(integer);
drop function if exists public.admin_update_participant(uuid, text, text, text, text, uuid, text);

create or replace function public.get_event_stats(p_event_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Non autorisé' using errcode = '42501'; end if;

  with p as (
    select * from public.participants
    where p_event_id is null or event_id = p_event_id
  )
  select jsonb_build_object(
    'participants_total', (select count(*) from p),
    'new_students', (select count(*) from p where participant_type = 'NEW_STUDENT'),
    'alumni', (select count(*) from p where participant_type = 'ALUMNI'),
    'others', (select count(*) from p where participant_type = 'OTHER'),
    'cpba_guests', (select count(*) from p where participant_type::text = 'CPBA_GUEST'),
    'verification_pending', (select count(*) from p
       where participant_type = 'NEW_STUDENT' and verification_status = 'PENDING'),
    'payment_pending', (select count(*) from p
       where payment_status in ('PENDING', 'AWAITING_CONFIRMATION')),
    'payment_awaiting', (select count(*) from p where payment_status = 'AWAITING_CONFIRMATION'),
    'payment_paid', (select count(*) from p where payment_status = 'PAID'),
    'tickets_generated', (select count(*) from p where ticket_status = 'GENERATED'),
    'tickets_not_generated', (select count(*) from p where ticket_status = 'NOT_GENERATED'),
    'checked_in', (select count(*) from p where checked_in = true),
    'not_checked_in', (select count(*) from p
       where checked_in = false and ticket_status = 'GENERATED'),
    'payment_breakdown', (select coalesce(jsonb_object_agg(payment_status, cnt), '{}'::jsonb)
       from (select payment_status, count(*) cnt from p group by payment_status) a),
    'by_school', (select coalesce(jsonb_agg(jsonb_build_object('school', s.name, 'count', c.cnt)
                    order by c.cnt desc), '[]'::jsonb)
       from (select school_id, count(*) cnt from p
             where school_id is not null group by school_id) c
       join public.schools s on s.id = c.school_id)
  ) into v;
  return v;
end;
$$;

create or replace function public.get_time_series(p_days integer default 30, p_event_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Non autorisé' using errcode = '42501'; end if;

  with p as (
    select created_at, checked_in_at from public.participants
    where p_event_id is null or event_id = p_event_id
  )
  select jsonb_build_object(
    'registrations', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
       from (select date_trunc('day', created_at)::date d, count(*) c from p
             where created_at >= now() - make_interval(days => p_days) group by 1) t),
    'checkins', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
       from (select date_trunc('day', checked_in_at)::date d, count(*) c from p
             where checked_in_at is not null and checked_in_at >= now() - make_interval(days => p_days) group by 1) t)
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_update_participant(
  p_participant_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_school_id uuid default null,
  p_external_identifier text default null,
  p_guest_of text[] default null
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_p public.participants;
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;

  if coalesce(trim(p_first_name),'') = '' or coalesce(trim(p_last_name),'') = ''
     or coalesce(trim(p_email),'') = '' then
    raise exception 'Nom, prénom et email sont obligatoires' using errcode = 'P0001';
  end if;

  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then raise exception 'Participant introuvable' using errcode = 'P0002'; end if;

  -- Cohérence métier : un étudiant doit garder une école.
  if v_p.participant_type = 'NEW_STUDENT' and p_school_id is null then
    raise exception 'Une école est obligatoire pour un étudiant' using errcode = 'P0001';
  end if;

  update public.participants
    set first_name = trim(p_first_name),
        last_name  = trim(p_last_name),
        email      = lower(trim(p_email)),
        phone      = trim(coalesce(p_phone, '')),
        school_id  = p_school_id,
        external_identifier = nullif(trim(coalesce(p_external_identifier, '')), ''),
        guest_of = case
          when p_guest_of is null then guest_of
          else coalesce((select array_agg(distinct left(trim(g), 100))
                         from unnest(p_guest_of) as g where trim(g) <> ''), '{}')
        end
    where id = p_participant_id;

  perform public.log_audit('UPDATE_PARTICIPANT', 'participant', p_participant_id,
    jsonb_build_object('email', lower(trim(p_email))));

  return jsonb_build_object('id', p_participant_id);
end;
$$;

revoke all on function public.get_event_stats(uuid) from public, anon;
grant execute on function public.get_event_stats(uuid) to authenticated;
revoke all on function public.get_time_series(integer, uuid) from public, anon;
grant execute on function public.get_time_series(integer, uuid) to authenticated;
revoke all on function public.admin_update_participant(uuid, text, text, text, text, uuid, text, text[]) from public, anon;
grant execute on function public.admin_update_participant(uuid, text, text, text, text, uuid, text, text[]) to authenticated;

notify pgrst, 'reload schema';

update public.events
set description = replace(description, 'du CPBA', '— CPBA')
where description like '%du CPBA%';
