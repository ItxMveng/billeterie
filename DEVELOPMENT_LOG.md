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
