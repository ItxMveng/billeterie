-- ===========================================================================
-- Sprint 1 — Row Level Security (RLS) et privilèges
-- ---------------------------------------------------------------------------
-- Modèle de sécurité (voir SECURITY.md) :
--  * Aucun accès public en lecture aux participants.
--  * Le public peut UNIQUEMENT créer une inscription (INSERT participants) ;
--    les statuts sensibles sont réécrits par un trigger.
--  * Les écoles actives et les événements publiés sont lisibles publiquement
--    (nécessaire à la landing page et au formulaire).
--  * Toute écriture administrative est réservée aux rôles adéquats.
-- ===========================================================================

-- --- Privilèges de base (RLS reste le garde-fou effectif) ------------------
grant usage on schema public to anon, authenticated;

grant select on public.events to anon, authenticated;
grant select on public.schools to anon, authenticated;
grant insert on public.participants to anon, authenticated;
grant select, update, delete on public.participants to authenticated;
grant insert, update, delete on public.events to authenticated;
grant insert, update, delete on public.schools to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

-- --- Activation de la RLS --------------------------------------------------
alter table public.events enable row level security;
alter table public.schools enable row level security;
alter table public.participants enable row level security;
alter table public.user_roles enable row level security;

-- ===========================================================================
-- events
-- ===========================================================================
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select
  using (status = 'PUBLISHED');

drop policy if exists events_staff_read on public.events;
create policy events_staff_read on public.events
  for select
  to authenticated
  using (public.is_staff());

drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- schools
-- ===========================================================================
drop policy if exists schools_public_read on public.schools;
create policy schools_public_read on public.schools
  for select
  using (is_active = true);

drop policy if exists schools_staff_read on public.schools;
create policy schools_staff_read on public.schools
  for select
  to authenticated
  using (public.is_staff());

drop policy if exists schools_admin_write on public.schools;
create policy schools_admin_write on public.schools
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- participants
-- ---------------------------------------------------------------------------
-- INSERT public : autorisé. Les colonnes de statut sont neutralisées par le
-- trigger set_participant_initial_status() (BEFORE INSERT), donc un client ne
-- peut pas se déclarer « vérifié » ou « payé ».
-- Lecture : réservée au staff. Aucune lecture publique.
-- ===========================================================================
drop policy if exists participants_public_insert on public.participants;
create policy participants_public_insert on public.participants
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists participants_staff_read on public.participants;
create policy participants_staff_read on public.participants
  for select
  to authenticated
  using (public.is_staff());

drop policy if exists participants_admin_update on public.participants;
create policy participants_admin_update on public.participants
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists participants_superadmin_delete on public.participants;
create policy participants_superadmin_delete on public.participants
  for delete
  to authenticated
  using (public.has_role('SUPER_ADMIN'));

-- ===========================================================================
-- user_roles
-- ---------------------------------------------------------------------------
-- Chaque utilisateur lit SES rôles (nécessaire à l'app). Seul un SUPER_ADMIN
-- lit/écrit les rôles de tous.
-- ===========================================================================
drop policy if exists user_roles_read_own on public.user_roles;
create policy user_roles_read_own on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_roles_superadmin_read on public.user_roles;
create policy user_roles_superadmin_read on public.user_roles
  for select
  to authenticated
  using (public.has_role('SUPER_ADMIN'));

drop policy if exists user_roles_superadmin_write on public.user_roles;
create policy user_roles_superadmin_write on public.user_roles
  for all
  to authenticated
  using (public.has_role('SUPER_ADMIN'))
  with check (public.has_role('SUPER_ADMIN'));
