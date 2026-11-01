-- ============================================================================
-- ETAPE 13 — Remise des diplomes (28 novembre 2026) a la place de l'accueil
-- Coller dans l'editeur SQL Supabase, puis RUN.
-- ----------------------------------------------------------------------------
-- 1. Archive l'evenement publie actuel (ceremonie d'accueil du 3 octobre).
--    Ses participants, billets et paiements sont conserves tels quels.
-- 2. Cree et publie la remise des diplomes de la promotion 2025-2026.
--    Gratuite pour tous ; heure et lieu laisses vides => « a confirmer ».
-- Le site et les inscriptions utilisent l'evenement PUBLISHED le plus proche :
-- il ne doit en rester qu'un seul apres ce script.
-- ============================================================================

begin;

update public.events
set status = 'ARCHIVED'
where status = 'PUBLISHED';

insert into public.events (
  name, description, date, start_time, location,
  status, alumni_price_cents, other_price_cents, currency
) values (
  'Remise des diplômes — Promotion 2025-2026',
  'Cérémonie de remise des diplômes de la promotion 2025-2026 du CPBA.',
  '2026-11-28', null, null,
  'PUBLISHED', 0, 0, 'EUR'
);

commit;

-- Verification : un seul evenement PUBLISHED, date 2026-11-28, tarifs 0 / 0
select name, date, start_time, location, alumni_price_cents, other_price_cents, status
from public.events
order by date;

-- Plus tard, quand l'heure et le lieu sont connus (exemple) :
-- update public.events
-- set start_time = '18:00', location = '31 rue de Vendée, 29200 Brest'
-- where status = 'PUBLISHED';
