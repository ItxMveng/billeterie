-- ============================================================================
-- ETAPE 14 — Scanner : refuser les billets d'un autre evenement
-- Coller dans l'editeur SQL Supabase (projet qmpgvwurjfrihstjddzo), puis RUN.
-- ----------------------------------------------------------------------------
-- Apres ce script, un billet de la ceremonie d'accueil scanne a l'entree de la
-- remise des diplomes affiche « BILLET D'UN AUTRE EVENEMENT » (entree refusee).
-- Meme contenu que supabase/migrations/0015_checkin_active_event.sql.
-- ============================================================================

-- ===========================================================================
-- ===========================================================================
-- Contrôle d'entrée limité à l'événement actif
-- ---------------------------------------------------------------------------
-- Problème traité : `validate_checkin` retrouvait le participant par son token
-- sans regarder à quel événement il était inscrit. Un billet d'un événement
-- archivé (ex. la cérémonie d'accueil) aurait donc été accepté à l'entrée
-- d'un événement suivant (la remise des diplômes).
--
-- Règle : si un événement est publié (`active_event_id()`), seul un billet
-- rattaché à cet événement peut entrer. Sinon → résultat `WRONG_EVENT`, avec
-- le nom de l'événement d'origine pour que l'agent puisse l'expliquer.
-- Sans événement publié, le comportement précédent est conservé.
--
-- Le reste de la fonction est inchangé (0006). Le search_path inclut
-- `extensions` (pgcrypto / digest), comme fixé par 0008.
-- ===========================================================================

create or replace function public.validate_checkin(p_token text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_p public.participants;
  v_t public.tickets;
  v_school text;
  v_updated uuid;
  v_first timestamptz;
  v_required boolean;
  v_info jsonb;
  v_active uuid;
  v_event_name text;
  v_ticket_number text;
begin
  if not public.is_checkin() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  select * into v_p from public.participants
    where access_token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then
    return jsonb_build_object('result', 'INVALID');
  end if;

  -- Billet d'un autre événement : refusé avant toute autre vérification.
  v_active := public.active_event_id();
  if v_active is not null and v_p.event_id is distinct from v_active then
    select name into v_event_name from public.events where id = v_p.event_id;
    select ticket_number into v_ticket_number from public.tickets where participant_id = v_p.id;
    return jsonb_build_object(
      'result', 'WRONG_EVENT',
      'event_name', v_event_name,
      'first_name', v_p.first_name, 'last_name', v_p.last_name,
      'ticket_number', v_ticket_number);
  end if;

  v_required := coalesce(v_p.payment_required, v_p.participant_type <> 'NEW_STUDENT');

  select * into v_t from public.tickets where participant_id = v_p.id;
  if not found then
    if v_p.participant_type = 'NEW_STUDENT' and v_p.verification_status <> 'VERIFIED' then
      return jsonb_build_object('result', 'NOT_ELIGIBLE', 'reason', 'NOT_VERIFIED');
    elsif v_required and v_p.payment_status <> 'PAID' then
      return jsonb_build_object('result', 'PAYMENT_UNPAID');
    end if;
    return jsonb_build_object('result', 'NO_TICKET');
  end if;

  if v_t.status = 'CANCELLED' then
    return jsonb_build_object('result', 'CANCELLED', 'ticket_number', v_t.ticket_number);
  end if;

  -- Défense : re-vérifier le paiement même si un ticket existe.
  if v_required and v_p.payment_status <> 'PAID' then
    return jsonb_build_object('result', 'PAYMENT_UNPAID', 'ticket_number', v_t.ticket_number);
  end if;

  select name into v_school from public.schools where id = v_p.school_id;
  v_info := jsonb_build_object(
    'first_name', v_p.first_name, 'last_name', v_p.last_name,
    'participant_type', v_p.participant_type, 'school_name', v_school,
    'ticket_number', v_t.ticket_number);

  update public.participants set checked_in = true, checked_in_at = now()
    where id = v_p.id and checked_in = false
    returning id into v_updated;

  if v_updated is not null then
    insert into public.checkins (ticket_id, participant_id, checked_in_by, method)
      values (v_t.id, v_p.id, auth.uid(), 'QR')
      on conflict (ticket_id) do nothing;
    perform public.log_audit('CHECK_IN', 'ticket', v_t.id,
      jsonb_build_object('ticket_number', v_t.ticket_number));
    return jsonb_build_object('result', 'VALID', 'checked_in_at', now()) || v_info;
  else
    select checked_in_at into v_first from public.participants where id = v_p.id;
    return jsonb_build_object('result', 'ALREADY_USED', 'first_checkin_at', v_first) || v_info;
  end if;
end;
$$;

-- Droits inchangés (réaffirmés par sécurité) : agents connectés uniquement.
revoke all on function public.validate_checkin(text) from public;
revoke execute on function public.validate_checkin(text) from anon;
grant execute on function public.validate_checkin(text) to authenticated;
