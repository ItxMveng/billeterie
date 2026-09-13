# SPRINT 1 — Rapport de développement

Fondation architecturale, socle technique et première version fonctionnelle.

---

## 1. Ce qui a été implémenté

- Socle technique complet : React 18 + TypeScript + Vite + Tailwind CSS +
  React Router + React Hook Form + Zod + Vitest + `vite-plugin-pwa`.
- Architecture en couches, modulaire par feature (voir `ARCHITECTURE.md`).
- Configuration centralisée (env validé + config événement de repli).
- Modèle métier complet (enums, types DB) et **logique métier pure et testée**.
- Base de données Supabase : schéma, enums, contraintes, triggers, RBAC.
- Row Level Security activée et documentée sur toutes les tables.
- Authentification Supabase + contexte + gardes de routes.
- Landing page (hero, cérémonie, association, catégories, programme, FAQ, CTA).
- Formulaire d'inscription fonctionnel avec école conditionnelle (ALUMNI).
- Dashboard protégé et structuré (9 sections), navigation filtrée par rôle.
- Gestion d'erreurs centralisée (`AppError`), états loading/empty/error/403/404.
- Fondation PWA (manifest, icônes, service worker via plugin).
- Design responsive mobile-first et accessible.
- Documentation de référence + tests.

## 2. Architecture créée

Voir `ARCHITECTURE.md`. Points clés :
- UI → logique métier pure → services d'accès aux données → client Supabase.
- Les composants n'accèdent jamais directement à Supabase.
- Frontières posées pour les modules futurs : `PaymentService`,
  `TicketService`, `CheckinService` (contrats sans implémentation factice).
- Enums = source de vérité unique, alignés avec le SQL.

## 3. Tables créées

`events`, `schools`, `participants`, `user_roles`. Détails, contraintes et
triggers dans `DATABASE.md`.

## 4. RLS créées

Policies documentées dans `SECURITY.md` :
- `events` : lecture publique des `PUBLISHED`, lecture staff, écriture admin.
- `schools` : lecture publique des actives, lecture staff, écriture admin.
- `participants` : **INSERT public uniquement** (statuts imposés par trigger),
  lecture staff, update admin, delete super-admin. **Aucune lecture publique.**
- `user_roles` : lecture de ses propres rôles, gestion réservée au super-admin.

## 5. Routes créées

Publiques : `/` (landing), `/inscription`, `/login`.
Dashboard protégé (`/dashboard/*`) : accueil, participants, écoles, événement,
paiements, billets, scanner, administrateurs, paramètres. `*` → 404.

## 6. Tests réalisés

| Suite                              | Objet                                             | Tests |
| ---------------------------------- | ------------------------------------------------- | ----- |
| `participant.logic.test.ts`        | Règles métier (paiement, vérification, billet)     | 16    |
| `participant.schema.test.ts`       | Validation formulaire (email, école conditionnelle) | 9   |
| `rbac.test.ts`                     | Permissions par rôle                              | 7     |
| `ProtectedRoute.test.tsx`          | Sécurité des routes (auth + rôle insuffisant)      | 4     |

Couvrent notamment : `NEW_STUDENT` / `ALUMNI` / `OTHER`, la détermination du
paiement requis, et le fait que `NEW_STUDENT + PENDING` **n'est pas** un nouveau
vérifié.

## 7. Résultats des tests

**36 tests / 36 réussis (4 fichiers), 0 échec.** `npm run test` → exit 0.

## 8. Problèmes rencontrés

1. **Types Node dans `vite.config.ts`** (`node:path`, `__dirname`) → erreurs de
   typecheck.
2. **Tests jsdom lents / timeouts RPC `/@vite/env`** sous Windows (init jsdom
   ~115 s, workers en timeout ; seul 1 fichier remontait).
3. **Avertissements de build** : import dynamique de `supabase.ts` incohérent
   avec des imports statiques ; chunk principal > 500 kB.
4. **Directives `eslint-disable` inutiles** (`no-console` non activé) →
   2 warnings lint.
5. **Machine hôte lente** (analyse antivirus probable) : build/lint/tests longs
   (build ≈ 3 min), sans incidence sur la validité des résultats.

## 9. Corrections effectuées

1. `vite.config.ts` : résolution ESM via `fileURLToPath(new URL(...))`, ajout de
   `@types/node` et `types: ["node"]` dans `tsconfig.node.json`.
2. Vitest : environnement `node` par défaut, `jsdom` uniquement pour `*.test.tsx`,
   `pool: 'forks'` + `singleFork`, timeouts relevés → suite stable et complète.
3. `SchoolService` : import statique de `requireSupabase` ; `manualChunks`
   (vendor react / supabase) → warnings de build supprimés.
4. Suppression des directives `eslint-disable` inutiles → lint 0/0.

## 10. Décisions architecturales

- **`getPaymentRequirement` fondé sur la catégorie**, pas sur une donnée
  manipulable ; la vérification conditionne le **billet**, pas le fait de payer.
- **Statuts imposés par trigger SQL** à l'insertion : le client ne peut pas se
  déclarer vérifié/payé, même via l'API (défense en profondeur au-delà de la RLS).
- **RBAC doublé** : matrice côté client (UX) + fonctions SQL + RLS (sécurité).
- **Anti-doublon** : unicité `(événement, email, catégorie)` — voir
  `BUSINESS_RULES.md` pour la justification.
- **Repli de configuration** : la landing reste utilisable sans Supabase ; les
  placeholders sont explicitement signalés (aucune donnée métier inventée).
- **Logique métier pure** isolée pour réutilisation serveur (Edge Function S2).

## 11. Points à surveiller pour Sprint 2

- Ne pas relâcher l'INSERT public sur `participants` : garder le trigger.
- Le montant de paiement Wero doit être **calculé/vérifié côté serveur**.
- L'import des inscrits existants nécessitera une voie d'insertion admin
  (RPC dédié) contournant proprement le trigger d'états initiaux.
- L'écriture fine par `FINANCE` (paiement) / `CHECKIN` (check-in) nécessitera
  des policies/RPC par colonne (aujourd'hui UPDATE = admin only).
- Bootstrap du premier `SUPER_ADMIN` via SQL (documenté dans `seed.sql`).

## 12. Dette technique éventuelle

- Types DB écrits à la main (`src/types/database.ts`) : à remplacer par
  `supabase gen types` au S2.
- Pas encore de tests d'intégration bout-en-bout du formulaire contre une base
  réelle (nécessite un projet Supabase).
- Performance de l'outillage sur la machine hôte (non lié au code).
- Icônes PWA = placeholders générés (à remplacer par le logo définitif).

---

## Livrable final synthétique

```
SPRINT 1 — TERMINÉ

Architecture :      OK
Base de données :   OK (migrations à exécuter sur le projet Supabase)
Authentification :  OK (nécessite les clés Supabase)
RLS :               OK (activée + documentée + testée côté logique)
Landing :           OK
Inscription :       OK (nécessite Supabase pour l'écriture réelle)
PWA :               OK (fondation : manifest + SW + icônes)
Tests :             36 réussis / 0 échoué
Build :             OK (npm run build → exit 0)
Typecheck :         OK (0 erreur)
Lint :              OK (0 erreur, 0 warning)

Problèmes connus :
- Aucun problème critique. La connexion effective à Supabase requiert la
  création du projet, l'exécution des migrations et la configuration des clés.

Décisions importantes :
- Sécurité en profondeur (trigger + RLS), prix non fiables côté client,
  logique métier pure réutilisable, frontières prêtes pour Wero/billets/scanner.

Prêt pour Sprint 2 : OUI
```
