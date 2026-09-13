# Sécurité

Modèle de sécurité de la plateforme. **Le Sprint 2 doit le lire avant toute
modification touchant l'accès aux données.**

## Principes

1. **Ne jamais faire confiance au frontend.** La validation client (Zod) et le
   RBAC client (masquage) améliorent l'UX mais **ne sont pas** la sécurité. La
   sécurité effective est appliquée côté base : contraintes, triggers, RLS.
2. **Moindre privilège.** Chaque rôle n'obtient que le strict nécessaire.
3. **Clés.** Seule la clé **anon** (publique) est exposée au client. La clé
   `service_role` ne doit **jamais** figurer dans le frontend ni dans le dépôt.
4. **Minimisation des données.** On ne collecte que prénom, nom, email,
   téléphone, catégorie et (si ALUMNI) l'école. Aucune donnée sensible (pièce
   d'identité, coordonnées bancaires, mot de passe superflu).

## Authentification

- Supabase Auth (email + mot de passe) pour l'espace d'administration.
- `AuthProvider` résout la session, écoute les changements, et charge les rôles
  depuis `user_roles`.
- Routes `/dashboard/*` protégées par `ProtectedRoute` : un utilisateur non
  authentifié est redirigé vers `/login` (avec mémorisation de la destination).

## RBAC

Rôles : `SUPER_ADMIN`, `ADMIN`, `FINANCE`, `CHECKIN`, `VIEWER`.

Matrice des permissions côté client : `src/features/auth/rbac.ts`.

| Permission          | SUPER_ADMIN | ADMIN | FINANCE | CHECKIN | VIEWER |
| ------------------- | :---------: | :---: | :-----: | :-----: | :----: |
| dashboard:access    |      ✓      |   ✓   |    ✓    |    ✓    |   ✓    |
| participants:read   |      ✓      |   ✓   |    ✓    |    ✓    |   ✓    |
| participants:write  |      ✓      |   ✓   |         |         |        |
| schools:read        |      ✓      |   ✓   |         |         |   ✓    |
| schools:write       |      ✓      |   ✓   |         |         |        |
| events:read         |      ✓      |   ✓   |         |         |   ✓    |
| events:write        |      ✓      |   ✓   |         |         |        |
| payments:read       |      ✓      |   ✓   |    ✓    |         |   ✓    |
| payments:write      |      ✓      |       |    ✓    |         |        |
| tickets:read        |      ✓      |   ✓   |         |    ✓    |   ✓    |
| tickets:write       |      ✓      |   ✓   |         |         |        |
| checkin:operate     |      ✓      |   ✓   |         |    ✓    |        |
| admins:manage       |      ✓      |       |         |         |        |
| settings:manage     |      ✓      |   ✓   |         |         |        |

> Le masquage RBAC en React **ne suffit pas** : l'autorisation est doublée par
> la RLS et les fonctions SQL `has_role()` / `is_admin()` / `is_staff()`.

## Row Level Security (RLS)

RLS activée sur **toutes** les tables. Résumé des policies
(`supabase/migrations/0002_rls.sql`) :

### `events`
- **SELECT public** : uniquement `status = 'PUBLISHED'`.
- **SELECT staff** : tous les événements.
- **ALL (write)** : `is_admin()` uniquement.

### `schools`
- **SELECT public** : uniquement `is_active = true`.
- **SELECT staff** : toutes.
- **ALL (write)** : `is_admin()` uniquement.

### `participants`
- **INSERT public** (`anon`, `authenticated`) : autorisé — c'est la seule
  opération publique. Les statuts sensibles sont réécrits par le trigger
  `set_participant_initial_status()`, donc `with check (true)` est sûr : le
  client **ne peut pas** injecter `VERIFIED`/`PAID`.
- **SELECT** : `is_staff()` uniquement. **Aucune lecture publique.**
- **UPDATE** : `is_admin()` uniquement (Sprint 1 ; l'écriture fine par
  FINANCE/CHECKIN passera par des RPC dédiés au Sprint 2/3).
- **DELETE** : `SUPER_ADMIN` uniquement.

### `user_roles`
- **SELECT** : chaque utilisateur lit ses propres rôles ; `SUPER_ADMIN` lit
  tout.
- **ALL (write)** : `SUPER_ADMIN` uniquement.

## Bootstrap du premier administrateur

Les écritures sur `user_roles` étant réservées au `SUPER_ADMIN`, le tout
premier rôle doit être créé via l'éditeur SQL Supabase (rôle `postgres`, qui
contourne la RLS). Procédure détaillée dans `supabase/seed.sql`.

## Points de vigilance (Sprint 2)

- Ne pas relâcher la policy d'INSERT public en autorisant l'écriture des
  statuts : conserver le trigger comme garde-fou.
- Le montant de paiement doit être vérifié **côté serveur** (Edge Function),
  jamais accepté depuis le client.
- Journaliser les erreurs sans exposer de détails techniques à l'utilisateur
  (déjà en place via `AppError` + `logger`).
- Ne jamais placer de données personnelles dans les URL / query strings.

---

# Sprint 2 — Sécurité complémentaire

## Écriture des statuts sensibles : uniquement côté serveur

`verification = VERIFIED`, `payment = PAID`, `ticket = GENERATED` et l'exemption
`payment_required = false` ne peuvent être posés **que** par des fonctions
`SECURITY DEFINER` qui vérifient le rôle de l'appelant (`is_admin`/`is_finance`)
et journalisent l'action. Conséquences :

- L'inscription publique passe par `register_participant` (RPC). L'INSERT direct
  public sur `participants` a été **révoqué** (`0005`).
- Le client ne peut pas s'auto-vérifier, s'auto-payer, s'auto-exempter ni
  générer un ticket : ces colonnes ne sont jamais écrites directement par lui.
- Le bouton « J'ai payé » (`submit_payment_declaration`) ne peut que passer
  `PENDING → AWAITING_CONFIRMATION`, jamais `PAID`.

## Verrouillage des privilèges d'exécution

Les fonctions internes/privilégiées (`_generate_ticket_internal`, `log_audit`,
générateurs de références, `can_generate_ticket`, `active_event_id`) sont
**retirées de `PUBLIC`** : elles ne s'exécutent que depuis les fonctions
`SECURITY DEFINER` (propriétaire). Les RPC publiques sont accordées à
`anon`/`authenticated` ; les RPC admin uniquement à `authenticated` (avec
contrôle de rôle interne).

## Accès au billet — pas d'énumération

Aucune route `/ticket/:id`. Le participant accède à son billet via un **token
privé** (`/mon-billet?t=<token>`) ; le serveur résout par hash. Le QR ne
contient aucune donnée personnelle, seulement l'URL de check-in avec le token.

## RLS des nouvelles tables

| Table                          | Lecture                              | Écriture            |
| ------------------------------ | ------------------------------------ | ------------------- |
| `student_verification_records` | ADMIN/SUPER_ADMIN                    | RPC only            |
| `payments`                     | FINANCE/ADMIN/SUPER_ADMIN + VIEWER  | RPC only            |
| `tickets`                      | tout le staff (dont CHECKIN)         | RPC only            |
| `audit_logs`                   | ADMIN/SUPER_ADMIN                   | RPC only (log_audit)|
| `import_batches`               | ADMIN/SUPER_ADMIN                   | RPC only            |

Aucune écriture directe n'est autorisée par policy sur ces tables : toutes les
mutations passent par les RPC contrôlées.

## Matrice RBAC (actions Sprint 2)

| Action              | SUPER_ADMIN | ADMIN | FINANCE | CHECKIN | VIEWER |
| ------------------- | :---------: | :---: | :-----: | :-----: | :----: |
| Vérifier étudiant   |      ✓      |   ✓   |         |         |        |
| Confirmer paiement  |      ✓      |   ✓   |    ✓    |         |        |
| Rejeter paiement    |      ✓      |   ✓   |    ✓    |         |        |
| Exemption           |      ✓      |   ✓   |         |         |        |
| Importer            |      ✓      |   ✓   |         |         |        |
| Générer ticket      |      ✓      |   ✓   |         |         |        |
| Annuler ticket      |      ✓      |   ✓   |         |         |        |

(Contrôlé côté serveur par `is_admin()` / `is_finance()`, pas seulement en UI.)
