-- ============================================================================
-- DEPLOIEMENT — ETAPE 1 : Schema + RLS de base
-- Coller INTEGRALEMENT dans l'editeur SQL Supabase, puis RUN.
-- Contient : 0001_schema.sql, 0002_rls.sql
-- IMPORTANT : executer les etapes DANS L'ORDRE (1, 2, 3, puis 4 optionnel).
-- ============================================================================

-- ===========================================================================
-- Sprint 1 — Schéma initial (events, schools, participants, user_roles)
-- Base : PostgreSQL / Supabase
-- ---------------------------------------------------------------------------
-- Principes :
--  * Enums métier explicites, alignés sur src/types/enums.ts.
--  * Contraintes de cohérence côté base (défense en profondeur).
--  * Les statuts sensibles d'un participant sont IMPOSÉS par un trigger :
--    le client ne peut pas les falsifier, même via l'API (voir SECURITY.md).
-- ===========================================================================

-- --- Extensions -----------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- --- Enums ----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'participant_type') then
    create type participant_type as enum ('NEW_STUDENT', 'ALUMNI', 'OTHER');
  end if;
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('NOT_REQUIRED', 'PENDING', 'VERIFIED', 'REJECTED');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REJECTED');
  end if;
  if not exists (select 1 from pg_type where typname = 'registration_status') then
    create type registration_status as enum ('PENDING', 'CONFIRMED', 'REJECTED');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('NOT_GENERATED', 'GENERATED', 'CANCELLED');
  end if;
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type event_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('SUPER_ADMIN', 'ADMIN', 'FINANCE', 'CHECKIN', 'VIEWER');
  end if;
end $$;

-- --- Fonction utilitaire : updated_at --------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- --- Table : events --------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  date date not null,
  start_time time,
  end_time time,
  location text,
  status event_status not null default 'DRAFT',
  alumni_price_cents integer not null default 0 check (alumni_price_cents >= 0),
  other_price_cents integer not null default 0 check (other_price_cents >= 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- --- Table : schools -------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  short_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_schools_updated_at on public.schools;
create trigger trg_schools_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

-- --- Table : participants --------------------------------------------------
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  email text not null check (position('@' in email) > 1),
  phone text not null check (length(trim(phone)) > 0),
  participant_type participant_type not null,
  school_id uuid references public.schools(id) on delete set null,
  verification_status verification_status not null default 'NOT_REQUIRED',
  payment_status payment_status not null default 'NOT_REQUIRED',
  registration_status registration_status not null default 'PENDING',
  ticket_status ticket_status not null default 'NOT_GENERATED',
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cohérence métier : une ancienne école est obligatoire pour un ALUMNI.
  constraint alumni_requires_school
    check (participant_type <> 'ALUMNI' or school_id is not null)
);

-- Détection des doublons : une même personne (email) ne peut s'inscrire
-- qu'une seule fois par (événement, catégorie). event_id NULL est ramené à un
-- sentinel pour que la contrainte s'applique aussi hors événement rattaché.
-- Justification du choix : voir BUSINESS_RULES.md (§ Doublons).
create unique index if not exists participants_unique_registration
  on public.participants (
    coalesce(event_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(email),
    participant_type
  );

create index if not exists participants_event_idx on public.participants (event_id);
create index if not exists participants_type_idx on public.participants (participant_type);

drop trigger if exists trg_participants_updated_at on public.participants;
create trigger trg_participants_updated_at
  before update on public.participants
  for each row execute function public.set_updated_at();

-- Impose les statuts initiaux selon la catégorie, à l'INSERT.
-- Empêche un client de déclarer lui-même « vérifié » ou « payé ».
create or replace function public.set_participant_initial_status()
returns trigger
language plpgsql
as $$
begin
  if new.participant_type = 'NEW_STUDENT' then
    new.verification_status := 'PENDING';
    new.payment_status := 'NOT_REQUIRED';
  else
    new.verification_status := 'NOT_REQUIRED';
    new.payment_status := 'PENDING';
  end if;
  new.registration_status := 'PENDING';
  new.ticket_status := 'NOT_GENERATED';
  new.checked_in := false;
  new.checked_in_at := null;
  return new;
end;
$$;

drop trigger if exists trg_participants_initial_status on public.participants;
create trigger trg_participants_initial_status
  before insert on public.participants
  for each row execute function public.set_participant_initial_status();

-- --- Table : user_roles (RBAC) --------------------------------------------
create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- --- Fonctions RBAC (SECURITY DEFINER pour éviter la récursion RLS) --------
create or replace function public.has_role(check_role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$;

-- L'utilisateur possède-t-il un rôle quelconque (= membre du staff) ?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid()
  );
$$;

-- Rôles autorisés à gérer (écriture générale) : ADMIN / SUPER_ADMIN.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;


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
