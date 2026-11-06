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
