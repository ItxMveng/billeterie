-- ============================================================================
-- ETAPE 6 — Mise a jour de l'evenement (tarifs et date reels)
-- Coller dans l'editeur SQL Supabase, puis RUN.
-- ----------------------------------------------------------------------------
-- Tarifs : 25 EUR pour les ANCIENS et pour les AUTRES / INVITES
--          (montants stockes en CENTIMES : 25 EUR = 2500)
-- Date   : 3 octobre 2026
-- Les nouveaux etudiants restent gratuits (regle metier, pas un tarif).
-- ============================================================================

update public.events
set
  date               = '2026-10-03',
  alumni_price_cents = 2500,
  other_price_cents  = 2500,
  currency           = 'EUR'
where status = 'PUBLISHED';

-- Verification : doit afficher 2500 / 2500 et la date 2026-10-03
select name, date, alumni_price_cents, other_price_cents, currency, status
from public.events
order by date;
