-- ===========================================================================
-- CORRECTIF CRITIQUE — `min(uuid)` n'existe pas en PostgreSQL
-- ---------------------------------------------------------------------------
-- La migration 0009 utilisait `select count(*), min(id) into ...` pour récupérer
-- l'enregistrement correspondant. PostgreSQL ne fournit pas d'agrégat `min()`
-- pour le type `uuid` : toute inscription d'un NOUVEAU ÉTUDIANT échouait avec
--     42883 : function min(uuid) does not exist
--
-- Correction : on compte d'abord, puis on récupère l'identifiant séparément
-- (uniquement lorsque la correspondance est unique).
--
-- Idempotent — `CREATE OR REPLACE`. À exécuter après 0009.
-- ===========================================================================

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
  v_count integer := 0;
begin
  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then return false; end if;
  if v_p.participant_type <> 'NEW_STUDENT' then return false; end if;
  if v_p.verification_status = 'VERIFIED' then return false; end if;

  v_email := lower(trim(coalesce(v_p.email, '')));

  -- 1) Correspondance par EMAIL normalisé (critère le plus fiable).
  if v_email <> '' then
    select count(*) into v_count
    from public.student_verification_records
    where status = 'AVAILABLE'
      and lower(trim(coalesce(email, ''))) = v_email;

    if v_count = 1 then
      select id into v_record_id
      from public.student_verification_records
      where status = 'AVAILABLE'
        and lower(trim(coalesce(email, ''))) = v_email
      limit 1;
    end if;
  end if;

  -- 2) À défaut, par IDENTIFIANT EXTERNE (numéro étudiant) s'il a été fourni.
  if v_record_id is null then
    v_ident := upper(regexp_replace(coalesce(v_p.external_identifier, ''), '\s', '', 'g'));
    if v_ident <> '' then
      select count(*) into v_count
      from public.student_verification_records
      where status = 'AVAILABLE'
        and upper(regexp_replace(coalesce(external_identifier, ''), '\s', '', 'g')) = v_ident;

      if v_count = 1 then
        select id into v_record_id
        from public.student_verification_records
        where status = 'AVAILABLE'
          and upper(regexp_replace(coalesce(external_identifier, ''), '\s', '', 'g')) = v_ident
        limit 1;
      end if;
    end if;
  end if;

  -- Aucune correspondance, ou plusieurs → revue manuelle (comportement sûr).
  if v_record_id is null then
    return false;
  end if;

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

revoke execute on function public.try_auto_verify_new_student(uuid)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
