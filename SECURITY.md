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
