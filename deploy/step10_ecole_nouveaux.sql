-- ============================================================================
-- ETAPE 10 — Ecole obligatoire pour les nouveaux etudiants
-- Coller dans l'editeur SQL Supabase, puis RUN.
-- ============================================================================

-- ===========================================================================
-- École obligatoire aussi pour les NOUVEAUX ÉTUDIANTS
-- ---------------------------------------------------------------------------
-- Jusqu'ici seule la catégorie ALUMNI exigeait un établissement. Les nouveaux
-- étudiants indiquent désormais l'école dans laquelle ils étudient (elle
-- remplace le numéro étudiant, qui n'était pas exploitable en pratique).
--
-- `NOT VALID` : la contrainte s'applique aux insertions et mises à jour à
-- venir, sans invalider les inscriptions déjà enregistrées sans école.
-- Pour l'appliquer rétroactivement une fois les données corrigées :
--     alter table public.participants validate constraint participant_requires_school;
-- ===========================================================================

alter table public.participants
  drop constraint if exists alumni_requires_school;

alter table public.participants
  drop constraint if exists participant_requires_school;

alter table public.participants
  add constraint participant_requires_school
  check (participant_type = 'OTHER' or school_id is not null)
  not valid;

notify pgrst, 'reload schema';
