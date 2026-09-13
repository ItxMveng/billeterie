# Billetterie — Cérémonie d'accueil des étudiants camerounais

Plateforme web d'inscription, de billetterie et de gestion d'une cérémonie
d'accueil, organisée par une association d'étudiants camerounais.

> **Sprint 1** : fondation architecturale, socle technique et première version
> fonctionnelle. Le paiement Wero, la génération des billets/QR codes, le
> scanner et les emails arrivent aux Sprints 2 et 3.

## Stack

- **Frontend** : React 18, TypeScript, Vite, React Router, Tailwind CSS,
  React Hook Form, Zod, lucide-react.
- **Backend / données** : Supabase (PostgreSQL, Auth, RLS).
- **Tests** : Vitest + Testing Library.
- **PWA** : `vite-plugin-pwa` (manifest + service worker).
- **Déploiement** : Vercel (frontend) + Supabase (base).

## Démarrage local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env.local   # puis renseigner les valeurs Supabase

# 3. Lancer le serveur de développement
npm run dev
```

L'application démarre même **sans** Supabase configuré : la landing page reste
consultable ; l'inscription et l'authentification sont alors désactivées avec un
message explicite.

## Configuration Supabase

1. Créer un projet Supabase.
2. Exécuter les migrations dans l'éditeur SQL, dans l'ordre :
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
3. (Optionnel) Exécuter `supabase/seed.sql` pour des écoles et un événement
   d'exemple, puis créer le premier `SUPER_ADMIN` (voir les commentaires du
   fichier seed).
4. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`
   (clé **anon** publique uniquement — jamais la clé `service_role`).

## Scripts

| Script              | Rôle                                             |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Serveur de développement                         |
| `npm run build`     | Vérification des types puis build de production   |
| `npm run preview`   | Prévisualisation du build                         |
| `npm run lint`      | ESLint                                            |
| `npm run typecheck` | Vérification TypeScript sans émission             |
| `npm run test`      | Tests unitaires et d'intégration (Vitest)        |

## Documentation de référence

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — structure, couches, conventions.
- [`BUSINESS_RULES.md`](./BUSINESS_RULES.md) — règles métier (catégories,
  paiement, vérification, doublons).
- [`DATABASE.md`](./DATABASE.md) — schéma, enums, contraintes, triggers.
- [`SECURITY.md`](./SECURITY.md) — authentification, RBAC, politiques RLS.
- [`SPRINT_1_REPORT.md`](./SPRINT_1_REPORT.md) — bilan du Sprint 1.

## Déploiement Vercel

- Framework : **Vite**. Commande de build : `npm run build`. Dossier de
  sortie : `dist`.
- Définir les variables d'environnement `VITE_*` dans le projet Vercel.
- Le routage SPA est géré par `vercel.json` (réécriture vers `index.html`).
