-- ===========================================================================
-- Remise des diplômes : catégorie « Invité du CPBA » et école facultative
-- ---------------------------------------------------------------------------
-- 1. Nouvelle catégorie CPBA_GUEST (invités de marque conviés par le CPBA).
--    Elle se comporte comme OTHER : ni vérification ni école demandée.
-- 2. L'école n'est plus obligatoire que pour les étudiants (NEW_STUDENT).
--    Les diplômés (ALUMNI) s'inscrivent sans école.
-- 3. Même règle dans la modification d'un participant par un admin.
--
-- Note : la nouvelle valeur d'enum n'est utilisée par aucune instruction de
-- ce script (PostgreSQL l'interdit dans la transaction qui la crée).
-- ===========================================================================

alter type participant_type add value if not exists 'CPBA_GUEST';

alter table public.participants
  drop constraint if exists participant_requires_school;

alter table public.participants
  add constraint participant_requires_school
  check (participant_type <> 'NEW_STUDENT' or school_id is not null)
  not valid;

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
        external_identifier = nullif(trim(coalesce(p_external_identifier, '')), '')
    where id = p_participant_id;

  perform public.log_audit('UPDATE_PARTICIPANT', 'participant', p_participant_id,
    jsonb_build_object('email', lower(trim(p_email))));

  return jsonb_build_object('id', p_participant_id);
end;
$$;

notify pgrst, 'reload schema';
