# Base de données

PostgreSQL (Supabase). Migrations dans `supabase/migrations`, à exécuter dans
l'ordre. Les enums SQL sont alignés sur
[`src/types/enums.ts`](./src/types/enums.ts).

## Enums

| Type SQL              | Valeurs                                                     |
| --------------------- | ---------------------------------------------------------- |
| `participant_type`    | `NEW_STUDENT`, `ALUMNI`, `OTHER`                           |
| `verification_status` | `NOT_REQUIRED`, `PENDING`, `VERIFIED`, `REJECTED`         |
| `payment_status`      | `NOT_REQUIRED`, `PENDING`, `PAID`, `FAILED`, `REJECTED`   |
| `registration_status` | `PENDING`, `CONFIRMED`, `REJECTED`                        |
| `ticket_status`       | `NOT_GENERATED`, `GENERATED`, `CANCELLED`                 |
| `event_status`        | `DRAFT`, `PUBLISHED`, `ARCHIVED`                          |
| `app_role`            | `SUPER_ADMIN`, `ADMIN`, `FINANCE`, `CHECKIN`, `VIEWER`    |

## Tables

### `events`
Événement(s). Prix stockés en **centimes** (`alumni_price_cents`,
`other_price_cents`, `currency`). `status` contrôle la visibilité publique
(seul `PUBLISHED` est lisible par le public via RLS).

### `schools`
Écoles configurables (`is_active`). Seules les écoles actives sont lisibles
publiquement (formulaire). Ex. : ENIB, IAI (voir `seed.sql`).

### `participants`
Une ligne par inscription. Champs de contact + `participant_type` + `school_id`
fournis par le public ; les **statuts** sont posés par trigger. Colonnes
séparées pour chaque dimension métier (voir BUSINESS_RULES.md).

### `user_roles`
RBAC : `(user_id, role)`, clé primaire composite. Référence `auth.users`.

## Contraintes clés

- `events.name`, `schools.name`, `participants.{first_name,last_name,phone}`
  non vides ; `participants.email` contient un `@`.
- `alumni_requires_school` : `participant_type <> 'ALUMNI' OR school_id IS NOT NULL`.
- Prix `>= 0`.
- **Unicité** `participants_unique_registration` :
  `(coalesce(event_id, sentinel), lower(email), participant_type)` — anti-doublon
  (voir BUSINESS_RULES.md § Doublons).
- Index : `participants_event_idx`, `participants_type_idx`.

## Triggers

- `set_updated_at()` — met à jour `updated_at` avant chaque UPDATE (events,
  schools, participants).
- `set_participant_initial_status()` — **BEFORE INSERT** sur `participants` :
  réécrit `verification_status`, `payment_status`, `registration_status`,
  `ticket_status`, `checked_in`, `checked_in_at` selon la catégorie. Garantit
  qu'un client **ne peut pas** falsifier ces statuts, même via l'API.

## Fonctions RBAC (SECURITY DEFINER)

- `has_role(app_role) → boolean` — l'utilisateur courant a-t-il ce rôle ?
- `is_staff() → boolean` — a-t-il un rôle quelconque ?
- `is_admin() → boolean` — est-il `ADMIN` ou `SUPER_ADMIN` ?

`SECURITY DEFINER` + `search_path = public` évitent la récursion RLS lors de la
lecture de `user_roles` dans les policies.

## Migration / évolution (Sprint 2+)

- Ajouter des colonnes/tables pour paiements (transactions Wero), billets
  (codes/QR) et audit sans casser l'existant.
- Le trigger d'états initiaux devra être assoupli pour les insertions
  administratives (import des inscrits) — prévu via une fonction dédiée plutôt
  qu'un accès direct.
- Envisager la génération des types TS via `supabase gen types` pour remplacer
  `src/types/database.ts` (les frontières d'architecture ne changent pas).

---

# Sprint 2 — Évolutions

Migrations ajoutées (à exécuter dans l'ordre, après 0001/0002) :

- `0003_sprint2_enums.sql` — ajoute `AWAITING_CONFIRMATION` et `REFUNDED` à
  `payment_status` (isolé car `ALTER TYPE ADD VALUE` doit être committé avant usage).
- `0004_sprint2_business.sql` — colonnes, tables, fonctions sécurisées, triggers.
- `0005_sprint2_rls.sql` — RLS des nouvelles tables + verrouillage des privilèges
  d'exécution des fonctions.

## Nouvelles colonnes `participants`

`payment_required`, `payment_reference`, `verified_by`, `verified_at`,
`rejected_reason`, `access_token_hash` (SHA-256 du token privé — jamais le token
en clair), `source` (`PUBLIC`/`IMPORT`).

## Nouvelles tables

- `student_verification_records` — liste officielle (matching).
- `payments` — transactions (référence unique `PAY-AAAA-00001`, montant en
  centimes, statut, `confirmed_by/at`, `metadata`). Index unique partiel :
  un seul paiement actif (`PENDING`/`AWAITING_CONFIRMATION`) par participant.
- `tickets` — un ticket par participant (`participant_id` unique), numéro unique
  `EVT-AAAA-00001`. **Aucun secret n'y est stocké** : le QR encode le token
  d'accès du participant (hashé dans `participants.access_token_hash`).
- `audit_logs` — journal des actions sensibles.
- `import_batches` — journalisation des imports.

## Fonctions

- Trigger `set_participant_initial_status` mis à jour : respecte le GUC
  `app.bypass_status_trigger` (posé par les RPC contrôlées) et dérive
  `payment_required` sinon.
- Helpers : `is_finance`, `next_payment_reference`, `next_ticket_number`,
  `active_event_id`, `log_audit`, `can_generate_ticket` (miroir SQL).
- RPC publiques : `register_participant`, `submit_payment_declaration`,
  `get_participant_status`, `get_ticket_by_token`.
- RPC admin/finance (contrôle de rôle + audit + idempotence) :
  `admin_verify_student`, `admin_reject_student`, `admin_confirm_payment`,
  `admin_reject_payment`, `admin_waive_payment`, `admin_generate_ticket`,
  `admin_cancel_ticket`, `import_participants`, `import_verification_records`.

## Choix : token d'accès unique par participant

Le QR encode `/(...)checkin?t=<token>` où `<token>` est le token d'accès du
participant. Seul son **hash** (SHA-256) est stocké (`access_token_hash`). Le
token en clair n'est jamais persisté : il est remis une fois à l'inscription /
à l'import (liste de liens). Cela satisfait « QR sans donnée personnelle » et
« stocker un hash plutôt qu'un secret en clair », tout en permettant de
ré-afficher le billet et, au Sprint 3, de valider le check-in par hash.
