-- ===========================================================================
-- Gratuité pour tous + émission immédiate du billet
-- ---------------------------------------------------------------------------
-- Deux changements de règle métier :
--
-- 1) Le paiement n'est plus déduit de la CATÉGORIE mais du TARIF configuré
--    pour l'événement. Un tarif à 0 => participation gratuite. Les tarifs sont
--    mis à 0 en fin de script : tout le monde participe gratuitement.
--    Pour réactiver un tarif plus tard, il suffit de le saisir dans
--    Dashboard > Événement — aucun déploiement de code n'est nécessaire.
--
-- 2) Le billet est émis DÈS L'INSCRIPTION, sans validation manuelle. La
--    vérification d'un nouveau étudiant ne bloque plus l'émission : elle reste
--    disponible pour le suivi, et un REJET explicite annule le billet.
--    Cohérent avec la gratuité : sans enjeu financier, faire attendre chaque
--    inscrit une validation humaine n'apporte plus de garantie utile.
--
-- Idempotent (CREATE OR REPLACE). À exécuter après les migrations précédentes.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Éligibilité au billet : la vérification ne bloque plus, seul un REJET si
-- ---------------------------------------------------------------------------
create or replace function public.can_generate_ticket(p public.participants)
returns boolean language plpgsql immutable as $fn$
begin
  -- Inscription rejetée par un administrateur : jamais de billet.
  if p.registration_status = 'REJECTED' then return false; end if;

  -- Vérification explicitement REJETÉE : jamais de billet.
  -- (Un statut PENDING n'est plus bloquant.)
  if p.verification_status = 'REJECTED' then return false; end if;

  -- Si un paiement est réellement requis, il doit être encaissé.
  if coalesce(p.payment_required, false) then
    return p.payment_status = 'PAID';
  end if;

  return true;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 2) Inscription : le tarif détermine l'obligation, puis billet immédiat
-- ---------------------------------------------------------------------------
create or replace function public.register_participant(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $fn$
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
  v_p public.participants;
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
    external_identifier,
    verification_status, payment_status, registration_status, ticket_status,
    payment_required, access_token_hash, source
  ) values (
    v_event_id, trim(payload->>'first_name'), trim(payload->>'last_name'),
    lower(trim(payload->>'email')), trim(payload->>'phone'), v_type, v_school_id,
    nullif(trim(coalesce(payload->>'external_identifier','')), ''),
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

-- ---------------------------------------------------------------------------
-- 3) Rejeter un étudiant annule désormais son billet (il est émis d'emblée)
-- ---------------------------------------------------------------------------
create or replace function public.admin_reject_student(p_participant_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;

  update public.participants
    set verification_status = 'REJECTED', registration_status = 'REJECTED',
        rejected_reason = p_reason
    where id = p_participant_id and participant_type = 'NEW_STUDENT';
  if not found then raise exception 'Participant introuvable' using errcode = 'P0002'; end if;

  -- Le billet ayant été émis à l'inscription, le rejet doit l'invalider.
  update public.tickets set status = 'CANCELLED'
    where participant_id = p_participant_id and status = 'GENERATED';
  update public.participants set ticket_status = 'CANCELLED'
    where id = p_participant_id and ticket_status = 'GENERATED';

  perform public.log_audit('REJECT_STUDENT', 'participant', p_participant_id,
                           jsonb_build_object('reason', p_reason, 'ticket_cancelled', true));
  return jsonb_build_object('verification_status', 'REJECTED');
end;
$fn$;

revoke execute on function public.admin_reject_student(uuid, text) from public, anon;
grant  execute on function public.admin_reject_student(uuid, text) to authenticated;
revoke execute on function public.register_participant(jsonb) from public;
grant  execute on function public.register_participant(jsonb) to anon, authenticated;
revoke execute on function public.can_generate_ticket(public.participants) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) GRATUITÉ : tarifs à zéro pour toutes les catégories
-- ---------------------------------------------------------------------------
update public.events
set alumni_price_cents = 0,
    other_price_cents  = 0;

-- Les inscriptions en attente de paiement deviennent gratuites et confirmées ;
-- leurs paiements en cours sont classés sans suite.
update public.payments
set status = 'REJECTED',
    metadata = metadata || jsonb_build_object('annule_gratuite', true)
where status in ('PENDING', 'AWAITING_CONFIRMATION');

-- Les littéraux d'un CASE sont du texte : il faut les convertir explicitement
-- vers le type enum de la colonne (sinon erreur 42804).
update public.participants
set payment_required = false,
    payment_status = 'NOT_REQUIRED'::payment_status,
    registration_status = case
      when registration_status = 'REJECTED' then 'REJECTED'::registration_status
      else 'CONFIRMED'::registration_status
    end
where coalesce(payment_required, true) = true
  and payment_status <> 'PAID';

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 5) Rattrapage : émettre le billet des inscrits déjà enregistrés et éligibles
--    (ils attendaient une validation manuelle qui n'a plus lieu d'être)
-- ---------------------------------------------------------------------------
do $backfill$
declare
  v_p public.participants;
  v_count integer := 0;
begin
  for v_p in
    select p.* from public.participants p
    left join public.tickets t on t.participant_id = p.id
    where t.id is null
  loop
    if public.can_generate_ticket(v_p) then
      begin
        perform public._generate_ticket_internal(v_p.id);
        v_count := v_count + 1;
      exception when others then
        raise notice 'Billet non emis pour % : %', v_p.id, sqlerrm;
      end;
    end if;
  end loop;
  raise notice 'Billets emis lors du rattrapage : %', v_count;
end;
$backfill$;

notify pgrst, 'reload schema';
