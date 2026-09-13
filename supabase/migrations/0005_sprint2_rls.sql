-- ===========================================================================
-- Sprint 2 — RLS des nouvelles tables + verrouillage des privilèges d'exécution
-- ---------------------------------------------------------------------------
-- Règles :
--  * Toute nouvelle table sensible a la RLS activée, sans lecture publique.
--  * Les écritures des tables sensibles passent EXCLUSIVEMENT par les fonctions
--    SECURITY DEFINER (aucune policy d'écriture pour les clients).
--  * Les fonctions internes/privilégiées ne sont PAS exécutables par le public :
--    seules les RPC publiques (register/déclaration/consultation par token) et
--    les RPC admin (contrôle de rôle interne) sont exposées.
-- ===========================================================================

-- --- participants : l'inscription publique passe désormais par la RPC --------
revoke insert on public.participants from anon, authenticated;
drop policy if exists participants_public_insert on public.participants;

-- ===========================================================================
-- RLS : nouvelles tables
-- ===========================================================================
alter table public.student_verification_records enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.import_batches enable row level security;

grant select on public.student_verification_records to authenticated;
grant select on public.payments to authenticated;
grant select on public.tickets to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.import_batches to authenticated;

-- student_verification_records : lecture admin seulement.
drop policy if exists svr_admin_read on public.student_verification_records;
create policy svr_admin_read on public.student_verification_records
  for select to authenticated using (public.is_admin());

-- payments : lecture finance/admin/super + viewer (pas CHECKIN).
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments
  for select to authenticated
  using (public.is_finance() or public.has_role('VIEWER'));

-- tickets : lecture pour tout le staff (CHECKIN inclus).
drop policy if exists tickets_staff_read on public.tickets;
create policy tickets_staff_read on public.tickets
  for select to authenticated using (public.is_staff());

-- audit_logs : lecture admin seulement.
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select to authenticated using (public.is_admin());

-- import_batches : lecture admin seulement.
drop policy if exists imports_admin_read on public.import_batches;
create policy imports_admin_read on public.import_batches
  for select to authenticated using (public.is_admin());

-- ===========================================================================
-- Privilèges d'exécution des fonctions
-- ===========================================================================

-- 1) Fonctions internes / privilégiées : retirées du public (appelées uniquement
--    depuis les fonctions SECURITY DEFINER, exécutées par le propriétaire).
revoke all on function public._generate_ticket_internal(uuid) from public;
revoke all on function public.log_audit(text, text, uuid, jsonb) from public;
revoke all on function public.next_payment_reference() from public;
revoke all on function public.next_ticket_number() from public;
revoke all on function public.can_generate_ticket(public.participants) from public;
revoke all on function public.active_event_id() from public;

-- is_finance() peut être utilisée en contexte de policy → accessible authentifié.
grant execute on function public.is_finance() to authenticated;

-- 2) RPC publiques (anon + authentifié).
revoke all on function public.register_participant(jsonb) from public;
grant execute on function public.register_participant(jsonb) to anon, authenticated;

revoke all on function public.submit_payment_declaration(text) from public;
grant execute on function public.submit_payment_declaration(text) to anon, authenticated;

revoke all on function public.get_participant_status(text) from public;
grant execute on function public.get_participant_status(text) to anon, authenticated;

revoke all on function public.get_ticket_by_token(text) from public;
grant execute on function public.get_ticket_by_token(text) to anon, authenticated;

-- 3) RPC administratives (authentifié uniquement ; contrôle de rôle interne).
revoke all on function public.admin_verify_student(uuid, text) from public;
grant execute on function public.admin_verify_student(uuid, text) to authenticated;

revoke all on function public.admin_reject_student(uuid, text) from public;
grant execute on function public.admin_reject_student(uuid, text) to authenticated;

revoke all on function public.admin_confirm_payment(uuid, text) from public;
grant execute on function public.admin_confirm_payment(uuid, text) to authenticated;

revoke all on function public.admin_reject_payment(uuid, text) from public;
grant execute on function public.admin_reject_payment(uuid, text) to authenticated;

revoke all on function public.admin_waive_payment(uuid, text) from public;
grant execute on function public.admin_waive_payment(uuid, text) to authenticated;

revoke all on function public.admin_generate_ticket(uuid) from public;
grant execute on function public.admin_generate_ticket(uuid) to authenticated;

revoke all on function public.admin_cancel_ticket(uuid, text) from public;
grant execute on function public.admin_cancel_ticket(uuid, text) to authenticated;

revoke all on function public.import_participants(jsonb, text) from public;
grant execute on function public.import_participants(jsonb, text) to authenticated;

revoke all on function public.import_verification_records(jsonb, text) from public;
grant execute on function public.import_verification_records(jsonb, text) to authenticated;
