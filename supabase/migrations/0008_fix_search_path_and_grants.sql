-- ===========================================================================
-- Sprint 3 — CORRECTIFS critiques découverts en test contre Supabase réel
-- ---------------------------------------------------------------------------
-- 1) search_path : chez Supabase, pgcrypto est installé dans le schéma
--    `extensions`, pas `public`. Les fonctions SECURITY DEFINER déclarées avec
--    `set search_path = public` ne trouvaient donc ni `digest()` ni
--    `gen_random_bytes()` → erreur 42883 à l'exécution (inscription, billet,
--    check-in cassés). On ajoute `extensions` au search_path.
--
-- 2) Privilèges : Supabase applique des DEFAULT PRIVILEGES qui accordent
--    EXECUTE à `anon`/`authenticated` sur les nouvelles fonctions. Un simple
--    `REVOKE ... FROM PUBLIC` ne retire donc PAS ces droits. Exemple constaté :
--    `next_ticket_number()` était appelable anonymement. On révoque
--    explicitement pour `anon` (et `authenticated` sur les fonctions internes).
--
-- Idempotent : ré-exécutable sans effet de bord.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) search_path des fonctions SECURITY DEFINER
-- ---------------------------------------------------------------------------
alter function public.has_role(app_role)                      set search_path = public, extensions;
alter function public.is_staff()                              set search_path = public, extensions;
alter function public.is_admin()                              set search_path = public, extensions;
alter function public.is_finance()                            set search_path = public, extensions;
alter function public.is_checkin()                            set search_path = public, extensions;
alter function public.active_event_id()                       set search_path = public, extensions;
alter function public.log_audit(text, text, uuid, jsonb)      set search_path = public, extensions;
alter function public._generate_ticket_internal(uuid)         set search_path = public, extensions;

-- Fonctions utilisant pgcrypto (digest / gen_random_bytes) — correctif clé.
alter function public.register_participant(jsonb)             set search_path = public, extensions;
alter function public.submit_payment_declaration(text)        set search_path = public, extensions;
alter function public.get_participant_status(text)            set search_path = public, extensions;
alter function public.get_ticket_by_token(text)               set search_path = public, extensions;
alter function public.import_participants(jsonb, text)        set search_path = public, extensions;
alter function public.validate_checkin(text)                  set search_path = public, extensions;

alter function public.admin_verify_student(uuid, text)        set search_path = public, extensions;
alter function public.admin_reject_student(uuid, text)        set search_path = public, extensions;
alter function public.admin_confirm_payment(uuid, text)       set search_path = public, extensions;
alter function public.admin_reject_payment(uuid, text)        set search_path = public, extensions;
alter function public.admin_waive_payment(uuid, text)         set search_path = public, extensions;
alter function public.admin_generate_ticket(uuid)             set search_path = public, extensions;
alter function public.admin_cancel_ticket(uuid, text)         set search_path = public, extensions;
alter function public.import_verification_records(jsonb, text) set search_path = public, extensions;
alter function public.get_event_stats()                       set search_path = public, extensions;
alter function public.get_time_series(integer)                set search_path = public, extensions;
alter function public.list_admin_users()                      set search_path = public, extensions;
alter function public.grant_role_by_email(text, app_role)     set search_path = public, extensions;
alter function public.revoke_role(uuid, app_role)             set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 2) Fonctions INTERNES : inaccessibles à anon ET authenticated
--    (appelées uniquement depuis les fonctions SECURITY DEFINER, exécutées
--     par le propriétaire, qui conserve ses droits.)
-- ---------------------------------------------------------------------------
revoke execute on function public.log_audit(text, text, uuid, jsonb) from anon, authenticated;
revoke execute on function public.next_payment_reference()           from anon, authenticated;
revoke execute on function public.next_ticket_number()               from anon, authenticated;
revoke execute on function public.can_generate_ticket(public.participants) from anon, authenticated;
revoke execute on function public.active_event_id()                  from anon, authenticated;
revoke execute on function public._generate_ticket_internal(uuid)    from anon, authenticated;
revoke execute on function public.is_checkin()                       from anon;
revoke execute on function public.set_updated_at()                   from anon, authenticated;
revoke execute on function public.set_participant_initial_status()   from anon, authenticated;

-- Helpers de rôle : nécessaires à l'évaluation des policies RLS pour les
-- utilisateurs authentifiés → on ne révoque que pour `anon`.
revoke execute on function public.has_role(app_role) from anon;
revoke execute on function public.is_staff()         from anon;
revoke execute on function public.is_admin()         from anon;
revoke execute on function public.is_finance()       from anon;

-- ---------------------------------------------------------------------------
-- 3) RPC ADMINISTRATIVES : jamais appelables en anonyme
--    (la garde de rôle interne reste la protection principale)
-- ---------------------------------------------------------------------------
revoke execute on function public.admin_verify_student(uuid, text)         from anon;
revoke execute on function public.admin_reject_student(uuid, text)         from anon;
revoke execute on function public.admin_confirm_payment(uuid, text)        from anon;
revoke execute on function public.admin_reject_payment(uuid, text)         from anon;
revoke execute on function public.admin_waive_payment(uuid, text)          from anon;
revoke execute on function public.admin_generate_ticket(uuid)              from anon;
revoke execute on function public.admin_cancel_ticket(uuid, text)          from anon;
revoke execute on function public.import_participants(jsonb, text)         from anon;
revoke execute on function public.import_verification_records(jsonb, text) from anon;
revoke execute on function public.validate_checkin(text)                   from anon;
revoke execute on function public.get_event_stats()                        from anon;
revoke execute on function public.get_time_series(integer)                 from anon;
revoke execute on function public.list_admin_users()                       from anon;
revoke execute on function public.grant_role_by_email(text, app_role)      from anon;
revoke execute on function public.revoke_role(uuid, app_role)              from anon;

-- ---------------------------------------------------------------------------
-- 4) RPC PUBLIQUES : accès confirmé (inscription + consultation par token)
-- ---------------------------------------------------------------------------
grant execute on function public.register_participant(jsonb)      to anon, authenticated;
grant execute on function public.submit_payment_declaration(text) to anon, authenticated;
grant execute on function public.get_participant_status(text)     to anon, authenticated;
grant execute on function public.get_ticket_by_token(text)        to anon, authenticated;

-- Rafraîchit le cache de schéma PostgREST.
notify pgrst, 'reload schema';
