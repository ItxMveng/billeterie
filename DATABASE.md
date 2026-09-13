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
