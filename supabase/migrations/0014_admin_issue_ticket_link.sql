-- ===========================================================================
-- Régénération d'un lien d'accès au billet (perte de session / navigateur)
-- ---------------------------------------------------------------------------
-- Problème traité : le lien privé remis à l'inscription est la seule clé
-- d'accès au billet, et seule son empreinte (SHA-256) est conservée. Un
-- participant qui perd ce lien — changement de navigateur, session effacée —
-- se retrouve sans billet, et personne ne peut le lui retrouver.
--
-- `admin_issue_ticket_link` permet à un administrateur de :
--   1. s'assurer que le billet existe (il est émis s'il manque et que le
--      participant est éligible) ;
--   2. générer un NOUVEAU jeton d'accès et le renvoyer en clair, une fois.
--
-- ⚠️ L'ancien lien cesse immédiatement de fonctionner : c'est volontaire, un
-- seul lien valide à la fois évite qu'un lien égaré reste exploitable.
-- L'opération est réservée aux administrateurs et journalisée.
-- ===========================================================================

create or replace function public.admin_issue_ticket_link(p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_p public.participants;
  v_t public.tickets;
  v_school text;
  v_ev public.events;
  v_token text;
  v_hash text;
  v_number text;
begin
  if not public.is_admin() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then
    raise exception 'Participant introuvable' using errcode = 'P0002';
  end if;

  -- Émettre le billet s'il n'existe pas encore et que le participant est éligible.
  select * into v_t from public.tickets
    where participant_id = p_participant_id and status = 'GENERATED';
  if not found then
    if not public.can_generate_ticket(v_p) then
      raise exception 'Ce participant n''est pas éligible à un billet' using errcode = 'P0001';
    end if;
    v_number := public._generate_ticket_internal(p_participant_id);
    select * into v_t from public.tickets
      where participant_id = p_participant_id and status = 'GENERATED';
  end if;

  -- Nouveau jeton d'accès : l'ancien lien devient inopérant.
  v_token := encode(gen_random_bytes(24), 'hex');
  v_hash  := encode(digest(v_token, 'sha256'), 'hex');
  update public.participants set access_token_hash = v_hash where id = p_participant_id;

  select name into v_school from public.schools where id = v_p.school_id;
  select * into v_ev from public.events where id = v_p.event_id;

  perform public.log_audit('RESET_ACCESS_TOKEN', 'participant', p_participant_id,
    jsonb_build_object('ticket_number', v_t.ticket_number));

  return jsonb_build_object(
    'access_token', v_token,
    'ticket_number', v_t.ticket_number,
    'first_name', v_p.first_name,
    'last_name', v_p.last_name,
    'email', v_p.email,
    'participant_type', v_p.participant_type,
    'school_name', v_school,
    'event_name', v_ev.name,
    'event_date', v_ev.date,
    'event_location', v_ev.location
  );
end;
$fn$;

revoke execute on function public.admin_issue_ticket_link(uuid) from public, anon;
grant  execute on function public.admin_issue_ticket_link(uuid) to authenticated;

notify pgrst, 'reload schema';
