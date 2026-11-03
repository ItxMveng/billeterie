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
