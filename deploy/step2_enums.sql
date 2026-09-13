-- ============================================================================
-- DEPLOIEMENT — ETAPE 2 : Valeurs d'enum (DOIT etre execute SEUL)
-- Coller INTEGRALEMENT dans l'editeur SQL Supabase, puis RUN.
-- Contient : 0003_sprint2_enums.sql
-- IMPORTANT : executer les etapes DANS L'ORDRE (1, 2, 3, puis 4 optionnel).
-- ============================================================================

-- ===========================================================================
-- Sprint 2 — Ajout de valeurs d'enum
-- ---------------------------------------------------------------------------
-- IMPORTANT : `ALTER TYPE ... ADD VALUE` doit être committé AVANT d'être
-- référencé par des fonctions/DDL. Ce fichier est donc séparé et doit être
-- exécuté et validé avant la migration 0004.
-- ===========================================================================

alter type payment_status add value if not exists 'AWAITING_CONFIRMATION';
alter type payment_status add value if not exists 'REFUNDED';
