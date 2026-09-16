-- ============================================================================
-- ETAPE 9 — CRUD administratif, correctif billet, adresse et horaire
-- Coller integralement dans l'editeur SQL Supabase, puis RUN.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Informations de l'evenement (adresse reelle, debut a 19h00, nom definitif)
-- ---------------------------------------------------------------------------
update public.events
set
  name       = 'Ceremonie d''accueil',
  location   = '31 rue de Vendee, 29200 Brest',
  start_time = '19:00',
  date       = '2026-10-03'
where status = 'PUBLISHED';

-- ===========================================================================
-- CRUD administratif complet + correctif de régénération de billet
-- ---------------------------------------------------------------------------
-- Toutes les écritures restent dans des fonctions SECURITY DEFINER avec
-- contrôle de rôle et journalisation d'audit.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- CORRECTIF : régénérer un billet ANNULÉ échouait.
-- `tickets.participant_id` est UNIQUE : après une annulation, la fonction
-- cherchait un ticket non annulé (aucun), puis tentait un INSERT → violation
-- de contrainte. On réactive désormais le ticket existant.
-- ---------------------------------------------------------------------------
create or replace function public._generate_ticket_internal(p_participant_id uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_p public.participants;
  v_number text;
  v_existing public.tickets;
begin
  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then
    raise exception 'Participant introuvable' using errcode = 'P0002';
  end if;

  select * into v_existing from public.tickets where participant_id = p_participant_id;

  -- Billet déjà actif → idempotent.
  if found and v_existing.status = 'GENERATED' then
    update public.participants set ticket_status = 'GENERATED' where id = p_participant_id;
    return v_existing.ticket_number;
  end if;

  if not public.can_generate_ticket(v_p) then
    raise exception 'Conditions de génération du ticket non remplies' using errcode = 'P0001';
  end if;

  -- Billet annulé → on le réactive (même numéro, pas de doublon).
  if found then
    update public.tickets
      set status = 'GENERATED', issued_at = now(), issued_by = auth.uid()
      where id = v_existing.id;
    update public.participants set ticket_status = 'GENERATED' where id = p_participant_id;
    perform public.log_audit('GENERATE_TICKET', 'participant', p_participant_id,
      jsonb_build_object('ticket_number', v_existing.ticket_number, 'restored', true));
    return v_existing.ticket_number;
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

-- ---------------------------------------------------------------------------
-- Participants : modification des coordonnées (jamais des statuts)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_participant(
  p_participant_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_school_id uuid default null,
  p_external_identifier text default null
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

  -- Cohérence métier : un ancien étudiant doit garder une école.
  if v_p.participant_type = 'ALUMNI' and p_school_id is null then
    raise exception 'Une école est obligatoire pour un ancien étudiant' using errcode = 'P0001';
  end if;

  update public.participants
    set first_name = trim(p_first_name),
        last_name  = trim(p_last_name),
        email      = lower(trim(p_email)),
        phone      = trim(coalesce(p_phone, '')),
        school_id  = p_school_id,
        external_identifier = nullif(trim(coalesce(p_external_identifier, '')), '')
    where id = p_participant_id;

  perform public.log_audit('UPDATE_PARTICIPANT', 'participant', p_participant_id,
    jsonb_build_object('email', lower(trim(p_email))));

  return jsonb_build_object('id', p_participant_id);
end;
$$;

create or replace function public.admin_delete_participant(p_participant_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_email text;
begin
  if not public.has_role('SUPER_ADMIN') then
    raise exception 'Suppression réservée au super-administrateur' using errcode = '42501';
  end if;
  select email into v_email from public.participants where id = p_participant_id;
  if v_email is null then raise exception 'Participant introuvable' using errcode = 'P0002'; end if;

  -- Libère l'enregistrement de la liste officielle éventuellement rattaché.
  update public.student_verification_records
    set status = 'AVAILABLE', matched_participant_id = null, matched_at = null
    where matched_participant_id = p_participant_id;

  delete from public.participants where id = p_participant_id;

  perform public.log_audit('DELETE_PARTICIPANT', 'participant', p_participant_id,
    jsonb_build_object('email', v_email));
  return jsonb_build_object('deleted', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Liste officielle de vérification : modification / suppression
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_verification_record(
  p_record_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_school_id uuid default null,
  p_external_identifier text default null
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  if coalesce(trim(p_first_name),'') = '' or coalesce(trim(p_last_name),'') = '' then
    raise exception 'Nom et prénom obligatoires' using errcode = 'P0001';
  end if;

  update public.student_verification_records
    set first_name = trim(p_first_name),
        last_name  = trim(p_last_name),
        email      = nullif(lower(trim(coalesce(p_email, ''))), ''),
        school_id  = p_school_id,
        external_identifier = nullif(trim(coalesce(p_external_identifier, '')), '')
    where id = p_record_id;
  if not found then raise exception 'Enregistrement introuvable' using errcode = 'P0002'; end if;

  perform public.log_audit('UPDATE_VERIFICATION_RECORD', 'verification_record', p_record_id, '{}'::jsonb);
  return jsonb_build_object('id', p_record_id);
end;
$$;

create or replace function public.admin_delete_verification_record(p_record_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  delete from public.student_verification_records where id = p_record_id;
  if not found then raise exception 'Enregistrement introuvable' using errcode = 'P0002'; end if;
  perform public.log_audit('DELETE_VERIFICATION_RECORD', 'verification_record', p_record_id, '{}'::jsonb);
  return jsonb_build_object('deleted', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Écoles : suppression contrôlée
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_school(p_school_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_used integer; v_name text;
begin
  if not public.is_admin() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select name into v_name from public.schools where id = p_school_id;
  if v_name is null then raise exception 'École introuvable' using errcode = 'P0002'; end if;

  select count(*) into v_used from public.participants where school_id = p_school_id;
  if v_used > 0 then
    raise exception 'Cette école est utilisée par % participant(s). Désactivez-la plutôt que de la supprimer.', v_used
      using errcode = 'P0001';
  end if;

  delete from public.schools where id = p_school_id;
  perform public.log_audit('DELETE_SCHOOL', 'school', p_school_id, jsonb_build_object('name', v_name));
  return jsonb_build_object('deleted', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilèges
-- ---------------------------------------------------------------------------
revoke execute on function public._generate_ticket_internal(uuid) from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_update_participant(uuid,text,text,text,text,uuid,text)',
    'admin_delete_participant(uuid)',
    'admin_update_verification_record(uuid,text,text,text,uuid,text)',
    'admin_delete_verification_record(uuid)',
    'admin_delete_school(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Verification finale
select name, date, start_time, location, alumni_price_cents, other_price_cents
from public.events where status = 'PUBLISHED';
