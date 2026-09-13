-- ===========================================================================
-- Sprint 3 — RLS de `checkins` + verrouillage des privilèges d'exécution
-- ===========================================================================

-- --- checkins : lecture staff, écriture uniquement via RPC -----------------
alter table public.checkins enable row level security;
grant select on public.checkins to authenticated;

drop policy if exists checkins_staff_read on public.checkins;
create policy checkins_staff_read on public.checkins
  for select to authenticated using (public.is_staff());

-- ===========================================================================
-- Privilèges d'exécution des fonctions Sprint 3
-- ===========================================================================

-- Helper interne : jamais public.
revoke all on function public.is_checkin() from public;

-- RPC de contrôle d'entrée : authentifié (garde de rôle interne : is_checkin).
revoke all on function public.validate_checkin(text) from public;
grant execute on function public.validate_checkin(text) to authenticated;

-- Statistiques : authentifié (garde interne : is_staff).
revoke all on function public.get_event_stats() from public;
grant execute on function public.get_event_stats() to authenticated;

revoke all on function public.get_time_series(integer) from public;
grant execute on function public.get_time_series(integer) to authenticated;

-- Gestion des rôles : authentifié (garde interne : SUPER_ADMIN).
revoke all on function public.list_admin_users() from public;
grant execute on function public.list_admin_users() to authenticated;

revoke all on function public.grant_role_by_email(text, app_role) from public;
grant execute on function public.grant_role_by_email(text, app_role) to authenticated;

revoke all on function public.revoke_role(uuid, app_role) from public;
grant execute on function public.revoke_role(uuid, app_role) to authenticated;
