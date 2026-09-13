# Journal de développement

Format par entrée : Problème → Cause → Correction → Test ajouté → Résultat.

---

## Sprint 2

### 1. Types Node manquants (héritage Sprint 1, non bloquant)
- **Problème** : rappel — `vite.config.ts` utilisait `node:path`/`__dirname`.
- **État** : déjà corrigé en fin de Sprint 1 (résolution ESM + `@types/node`).

### 2. `ALTER TYPE ADD VALUE` et fonctions
- **Problème** : ajouter `AWAITING_CONFIRMATION`/`REFUNDED` à `payment_status`
  puis les référencer dans des fonctions dans la même transaction échoue
  (validation du corps de fonction).
- **Cause** : PostgreSQL interdit l'usage d'une valeur d'enum non committée.
- **Correction** : migration dédiée `0003_sprint2_enums.sql`, séparée de la
  logique (`0004`), à exécuter et valider en premier.
- **Résultat** : migrations ordonnées et sûres.

### 3. Fonctions SECURITY DEFINER exécutables par le public (risque)
- **Problème** : par défaut, `CREATE FUNCTION` accorde `EXECUTE` à `PUBLIC`.
  Les helpers internes (`_generate_ticket_internal`, `log_audit`, générateurs de
  références) auraient été appelables par `anon` → génération de ticket sans
  contrôle.
- **Cause** : privilège par défaut de PostgreSQL.
- **Correction** : `0005_sprint2_rls.sql` — `REVOKE ALL ... FROM PUBLIC` sur les
  fonctions internes/privilégiées ; `GRANT EXECUTE` ciblé (RPC publiques →
  anon/authenticated ; RPC admin → authenticated avec contrôle de rôle interne).
- **Test** : contrôle de rôle unitaire (RBAC) + garde `is_admin/is_finance` dans
  chaque RPC ; vérification manuelle des grants dans la migration.
- **Résultat** : surface d'attaque fermée.

### 4. Écrasement des statuts par le trigger lors des imports « déjà payé »
- **Problème** : le trigger Sprint 1 forçait tous les statuts à l'INSERT,
  empêchant d'importer un participant `PAID`.
- **Cause** : trigger inconditionnel.
- **Correction** : GUC `app.bypass_status_trigger` posé par les RPC contrôlées
  (`register_participant`, `import_participants`) ; le trigger ne force que les
  inserts non privilégiés (défense en profondeur conservée).
- **Résultat** : imports « déjà payé » possibles sans affaiblir la sécurité.

### 5. Erreur typecheck — `payment_required: boolean | null`
- **Problème** : `ParticipantRow.payment_required` (`boolean | null`) non
  assignable à `ParticipantLike.payment_required` (`boolean | undefined`).
- **Correction** : `ParticipantLike.payment_required?: boolean | null` ;
  `resolvePaymentRequired` traite `null` comme « non défini » (dérivation).
- **Résultat** : typecheck vert.

### 6. Erreur lint — caractère BOM littéral dans un regex (`csv.ts`)
- **Problème** : `no-irregular-whitespace` sur `/^﻿/`.
- **Cause** : BOM (U+FEFF) écrit littéralement.
- **Correction** : suppression du BOM via `charCodeAt(0) === 0xfeff`
  (aucun caractère irrégulier dans le source).
- **Test** : `csv.test.ts` (« ignore le BOM ») toujours vert.
- **Résultat** : lint 0/0.

### 7. Import unused (`TicketsPage`)
- **Problème** : `Card`/`CardContent` importés mais non utilisés.
- **Correction** : import retiré.
- **Résultat** : typecheck vert.

### Note environnement
La machine hôte est lente (analyse antivirus probable) : lint/tests/build durent
plusieurs minutes. Sans impact sur la validité des résultats. Les commandes ont
été exécutées avec marqueur de complétion pour fiabiliser la lecture.

---

## Sprint 3

### 8. `audit_logs` inexistante à la création de `log_audit` (bloquant en production)
- **Problème** : l'exécution du script de migration Sprint 2 échouait —
  `42P01 : la relation « public.audit_logs » n'existe pas`.
- **Cause** : `log_audit()` est déclarée `language sql`. PostgreSQL valide le
  corps d'une fonction SQL **dès sa création** (`check_function_bodies`). Or la
  table `audit_logs` était créée plus bas dans le même fichier.
- **Correction** : déplacement de la création de `audit_logs` **avant**
  `log_audit()` dans `0004_sprint2_business.sql`.
- **Vérification** : contrôle d'ordre des dépendances sur le bundle complet
  (`audit_logs` l.53 → `log_audit` l.102 ; `tickets` → `_generate_ticket_internal` ;
  `checkins` → `validate_checkin`).
- **Résultat** : migration appliquée avec succès sur le projet Supabase réel.

### 9. pgcrypto hors du `search_path` (CRITIQUE — découvert en test réel)
- **Problème** : `get_participant_status` / `get_ticket_by_token` renvoyaient
  `42883 : No function matches the given name`. Toute la chaîne inscription →
  billet → check-in aurait échoué en production.
- **Cause** : chez Supabase, l'extension `pgcrypto` est installée dans le schéma
  **`extensions`**, pas `public`. Nos fonctions `SECURITY DEFINER` déclaraient
  `set search_path = public`, donc `digest()` et `gen_random_bytes()` étaient
  introuvables. `CREATE EXTENSION IF NOT EXISTS pgcrypto` était un no-op puisque
  l'extension existait déjà ailleurs.
- **Correction** : migration `0008` — `search_path = public, extensions` sur
  toutes les fonctions `SECURITY DEFINER`.
- **Test ajouté** : sonde d'intégration contre la base réelle
  (`scripts de vérification`), rejouable : les RPC publiques doivent répondre
  HTTP 200 et non 42883.
- **Résultat** : inscription, statut, déclaration de paiement et lecture de
  billet fonctionnent sur la base réelle.

### 10. `REVOKE ... FROM PUBLIC` insuffisant chez Supabase (sécurité)
- **Problème** : `next_ticket_number()` appelable **anonymement** (retournait
  `EVT-2026-00001`) malgré `revoke all ... from public`.
- **Cause** : Supabase applique des `DEFAULT PRIVILEGES` accordant `EXECUTE` à
  `anon` et `authenticated` sur les nouvelles fonctions du schéma `public`.
  Révoquer à `PUBLIC` ne retire pas ces accords nominatifs.
- **Correction** : migration `0008` — `REVOKE EXECUTE ... FROM anon,
  authenticated` explicite sur les fonctions internes, et `FROM anon` sur les
  RPC administratives (la garde de rôle interne restant la protection
  principale : défense en profondeur).
- **Vérification** : `next_ticket_number` → HTTP 401 `permission denied` ;
  `get_event_stats` / `list_admin_users` → 401 au niveau privilège.
- **Résultat** : plus aucune fonction interne accessible en anonyme.

### 11. Bundle principal > 500 kB
- **Problème** : avertissement Vite, chunk principal à 595 kB.
- **Cause** : `html5-qrcode` (scanner) importé statiquement par le routeur.
- **Correction** : `React.lazy` + `Suspense` sur `ScannerPage` — la librairie
  n'est téléchargée que par les agents de contrôle.
- **Résultat** : chunk principal **595 → 255 kB**, avertissement disparu.

### Leçon transverse
Les trois bugs 8/9/10 étaient **invisibles en local** : ni le typecheck, ni le
lint, ni les 175 tests unitaires ne les auraient détectés. Seule l'exécution
réelle des migrations et des sondes HTTP contre le projet Supabase les a
révélés. Toute évolution du SQL doit être validée contre une instance réelle.
