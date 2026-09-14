-- ===========================================================================
-- Vérification AUTOMATIQUE des nouveaux étudiants à l'inscription
-- ---------------------------------------------------------------------------
-- Objectif : si l'étudiant figure déjà dans la liste officielle
-- (`student_verification_records`), il est vérifié immédiatement et reçoit son
-- billet sans attendre une validation manuelle.
--
-- Règle de sûreté (inchangée) : seuls les critères FIABLES déclenchent une
-- vérification automatique — email normalisé ou identifiant externe, et
-- uniquement si la correspondance est UNIQUE. Une correspondance sur le seul
-- nom reste ambiguë et part en revue manuelle (voir BUSINESS_RULES.md).
--
-- La décision reste 100 % serveur : le client ne peut pas se faire vérifier.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Identifiant officiel (numéro étudiant) — facultatif, renforce le matching.
-- ---------------------------------------------------------------------------
alter table public.participants
  add column if not exists external_identifier text;

create index if not exists participants_external_ident_idx
  on public.participants (upper(external_identifier));

-- ---------------------------------------------------------------------------
-- Tentative de vérification automatique d'un participant.
-- Retourne true si le participant a été vérifié.
-- ---------------------------------------------------------------------------
create or replace function public.try_auto_verify_new_student(p_participant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_p public.participants;
  v_email text;
  v_ident text;
  v_record_id uuid;
  v_count integer;
begin
  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then return false; end if;
  if v_p.participant_type <> 'NEW_STUDENT' then return false; end if;
  if v_p.verification_status = 'VERIFIED' then return false; end if;

  v_email := lower(trim(coalesce(v_p.email, '')));

  -- 1) Correspondance par EMAIL normalisé (critère le plus fiable).
  if v_email <> '' then
    select count(*), min(id) into v_count, v_record_id
    from public.student_verification_records
    where status = 'AVAILABLE' and lower(trim(coalesce(email, ''))) = v_email;
  end if;

  -- 2) À défaut, par IDENTIFIANT EXTERNE s'il a été fourni à l'inscription.
  if coalesce(v_count, 0) <> 1 then
    v_ident := upper(regexp_replace(coalesce(v_p.external_identifier, ''), '\s', '', 'g'));
    if v_ident <> '' then
      select count(*), min(id) into v_count, v_record_id
      from public.student_verification_records
      where status = 'AVAILABLE'
        and upper(regexp_replace(coalesce(external_identifier, ''), '\s', '', 'g')) = v_ident;
    end if;
  end if;

  -- Aucune correspondance, ou plusieurs → revue manuelle.
  if coalesce(v_count, 0) <> 1 or v_record_id is null then
    return false;
  end if;

  -- Vérification confirmée.
  update public.participants
    set verification_status = 'VERIFIED',
        verified_at = now(),
        registration_status = 'CONFIRMED'
    where id = p_participant_id;

  update public.student_verification_records
    set status = 'MATCHED',
        matched_participant_id = p_participant_id,
        matched_at = now()
    where id = v_record_id;

  perform public.log_audit('VERIFY_STUDENT', 'participant', p_participant_id,
    jsonb_build_object('auto', true, 'record_id', v_record_id));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Inscription publique — avec vérification automatique intégrée.
-- (Remplace la version précédente ; le reste du comportement est identique.)
-- ---------------------------------------------------------------------------
create or replace function public.register_participant(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
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
  v_verified boolean := false;
  v_verification text;
  v_ticket text;
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
    external_identifier,
    verification_status, payment_status, registration_status, ticket_status,
    payment_required, access_token_hash, source
  ) values (
    v_event_id, trim(payload->>'first_name'), trim(payload->>'last_name'),
    lower(trim(payload->>'email')), trim(payload->>'phone'), v_type, v_school_id,
    nullif(trim(coalesce(payload->>'external_identifier','')), ''),
    case when v_type = 'NEW_STUDENT' then 'PENDING'::verification_status else 'NOT_REQUIRED'::verification_status end,
    case when v_required then 'PENDING'::payment_status else 'NOT_REQUIRED'::payment_status end,
    'PENDING'::registration_status, 'NOT_GENERATED'::ticket_status,
    v_required, v_hash, 'PUBLIC'
  ) returning id into v_id;

  perform set_config('app.bypass_status_trigger', 'off', true);

  -- Paiement (catégories payantes)
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

  -- Vérification automatique (nouveaux étudiants uniquement)
  if v_type = 'NEW_STUDENT' then
    v_verified := public.try_auto_verify_new_student(v_id);
    if v_verified then
      -- Éligible immédiatement : billet émis dans la foulée.
      begin
        v_ticket := public._generate_ticket_internal(v_id);
      exception when others then
        v_ticket := null; -- l'échec d'émission ne doit pas casser l'inscription
      end;
    end if;
  end if;

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
$$;

-- ---------------------------------------------------------------------------
-- Privilèges (rappel : REVOKE FROM PUBLIC ne suffit pas chez Supabase)
-- ---------------------------------------------------------------------------
revoke execute on function public.try_auto_verify_new_student(uuid) from public, anon, authenticated;

revoke execute on function public.register_participant(jsonb) from public;
grant  execute on function public.register_participant(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
