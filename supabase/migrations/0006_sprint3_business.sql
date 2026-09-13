-- ===========================================================================
-- Sprint 3 — Check-in atomique, statistiques serveur, gestion des rôles
-- ---------------------------------------------------------------------------
-- À exécuter après 0001..0005. Toutes les écritures sensibles restent
-- exclusivement dans des fonctions SECURITY DEFINER contrôlées par rôle.
-- ===========================================================================

-- --- Helper : rôle habilité au contrôle d'entrée ---------------------------
create or replace function public.is_checkin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('CHECKIN', 'ADMIN', 'SUPER_ADMIN')
  );
$$;

-- --- Table : checkins ------------------------------------------------------
-- Contrainte d'unicité sur ticket_id : un ticket ne peut être validé qu'une
-- fois (backstop de l'atomicité assurée par l'UPDATE conditionnel).
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null,
  method text not null default 'QR',
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists checkins_participant_idx on public.checkins (participant_id);

-- ===========================================================================
-- RPC : validation d'entrée (check-in) — ATOMIQUE
-- ---------------------------------------------------------------------------
-- Le serveur retrouve le ticket à partir du TOKEN (jamais de confiance au QR).
-- Résultats : VALID | ALREADY_USED | CANCELLED | PAYMENT_UNPAID |
--             NOT_ELIGIBLE | NO_TICKET | INVALID
-- Atomicité : UPDATE ... WHERE checked_in = false (verrou de ligne) →
-- deux scans simultanés ⇒ un seul VALID, l'autre ALREADY_USED.
-- ===========================================================================
create or replace function public.validate_checkin(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_p public.participants;
  v_t public.tickets;
  v_school text;
  v_updated uuid;
  v_first timestamptz;
  v_required boolean;
  v_info jsonb;
begin
  if not public.is_checkin() then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  select * into v_p from public.participants
    where access_token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then
    return jsonb_build_object('result', 'INVALID');
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

-- ===========================================================================
-- RPC : statistiques agrégées (côté serveur — scalable)
-- ===========================================================================
create or replace function public.get_event_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select jsonb_build_object(
    'participants_total', (select count(*) from public.participants),
    'new_students', (select count(*) from public.participants where participant_type = 'NEW_STUDENT'),
    'alumni', (select count(*) from public.participants where participant_type = 'ALUMNI'),
    'others', (select count(*) from public.participants where participant_type = 'OTHER'),
    'verification_pending', (select count(*) from public.participants
       where participant_type = 'NEW_STUDENT' and verification_status = 'PENDING'),
    'payment_pending', (select count(*) from public.participants
       where payment_status in ('PENDING', 'AWAITING_CONFIRMATION')),
    'payment_awaiting', (select count(*) from public.participants where payment_status = 'AWAITING_CONFIRMATION'),
    'payment_paid', (select count(*) from public.participants where payment_status = 'PAID'),
    'tickets_generated', (select count(*) from public.participants where ticket_status = 'GENERATED'),
    'tickets_not_generated', (select count(*) from public.participants where ticket_status = 'NOT_GENERATED'),
    'checked_in', (select count(*) from public.participants where checked_in = true),
    'not_checked_in', (select count(*) from public.participants
       where checked_in = false and ticket_status = 'GENERATED'),
    'payment_breakdown', (select coalesce(jsonb_object_agg(payment_status, cnt), '{}'::jsonb)
       from (select payment_status, count(*) cnt from public.participants group by payment_status) a),
    'by_school', (select coalesce(jsonb_agg(jsonb_build_object('school', s.name, 'count', c.cnt)
                    order by c.cnt desc), '[]'::jsonb)
       from (select school_id, count(*) cnt from public.participants
             where school_id is not null group by school_id) c
       join public.schools s on s.id = c.school_id)
  ) into v;
  return v;
end;
$$;

-- Séries temporelles (inscriptions / check-ins par jour, N derniers jours).
create or replace function public.get_time_series(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select jsonb_build_object(
    'registrations', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
       from (select date_trunc('day', created_at)::date d, count(*) c from public.participants
             where created_at >= now() - make_interval(days => p_days) group by 1) t),
    'checkins', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
       from (select date_trunc('day', checked_in_at)::date d, count(*) c from public.participants
             where checked_in_at is not null and checked_in_at >= now() - make_interval(days => p_days) group by 1) t)
  ) into v;
  return v;
end;
$$;

-- ===========================================================================
-- RPC : gestion des rôles (SUPER_ADMIN uniquement — anti-escalade)
-- ===========================================================================
create or replace function public.list_admin_users()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.has_role('SUPER_ADMIN') then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email, 'roles', r.roles)
                  order by u.email), '[]'::jsonb)
  into v
  from auth.users u
  join (select user_id, jsonb_agg(role order by role) roles
        from public.user_roles group by user_id) r on r.user_id = u.id;
  return v;
end;
$$;

create or replace function public.grant_role_by_email(p_email text, p_role app_role)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.has_role('SUPER_ADMIN') then raise exception 'Non autorisé' using errcode = '42501'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  insert into public.user_roles (user_id, role) values (v_uid, p_role) on conflict do nothing;
  perform public.log_audit('GRANT_ROLE', 'user', v_uid,
    jsonb_build_object('role', p_role, 'email', lower(trim(p_email))));
  return jsonb_build_object('user_id', v_uid, 'role', p_role);
end;
$$;

create or replace function public.revoke_role(p_user_id uuid, p_role app_role)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('SUPER_ADMIN') then raise exception 'Non autorisé' using errcode = '42501'; end if;
  -- Ne jamais retirer le dernier SUPER_ADMIN (verrouillage du système).
  if p_role = 'SUPER_ADMIN'
     and (select count(*) from public.user_roles where role = 'SUPER_ADMIN') <= 1 then
    raise exception 'Impossible de retirer le dernier SUPER_ADMIN' using errcode = 'P0001';
  end if;
  delete from public.user_roles where user_id = p_user_id and role = p_role;
  perform public.log_audit('REVOKE_ROLE', 'user', p_user_id, jsonb_build_object('role', p_role));
  return jsonb_build_object('user_id', p_user_id, 'role', p_role);
end;
$$;
