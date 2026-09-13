-- ===========================================================================
-- Données de départ (seed) — exécutable dans l'éditeur SQL Supabase.
-- ---------------------------------------------------------------------------
-- Contenu : quelques écoles actives + un événement brouillon d'exemple.
-- Les valeurs restent des PLACEHOLDERS tant que les informations réelles ne
-- sont pas confirmées.
-- ===========================================================================

insert into public.schools (name, short_name, is_active) values
  ('École Nationale d''Ingénieurs de Brest', 'ENIB', true),
  ('Institut Africain d''Informatique', 'IAI', true)
on conflict do nothing;

-- Événement d'exemple (statut PUBLISHED pour être visible côté public).
-- ⚠️ Prix indicatifs — à confirmer. Montants en CENTIMES.
insert into public.events (name, description, date, location, status,
                           alumni_price_cents, other_price_cents, currency)
values (
  'Cérémonie d''accueil (à confirmer)',
  'Cérémonie d''accueil des nouveaux étudiants camerounais.',
  '2026-10-01',
  'Lieu à confirmer',
  'PUBLISHED',
  1000,
  1500,
  'EUR'
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Bootstrap du premier SUPER_ADMIN (à exécuter manuellement, une seule fois)
-- ---------------------------------------------------------------------------
-- Les écritures sur user_roles sont réservées à un SUPER_ADMIN via la RLS.
-- Le tout premier rôle doit donc être créé avec des privilèges élevés
-- (éditeur SQL Supabase = rôle postgres, qui contourne la RLS).
--
-- 1) Créez l'utilisateur dans Auth (Dashboard Supabase > Authentication).
-- 2) Récupérez son UUID, puis exécutez :
--
--    insert into public.user_roles (user_id, role)
--    values ('<UUID_DE_L_UTILISATEUR>', 'SUPER_ADMIN');
--
-- Ce SUPER_ADMIN pourra ensuite attribuer les autres rôles (Sprint 3 : via UI).
