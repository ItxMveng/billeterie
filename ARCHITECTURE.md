# Architecture

Document de référence de l'architecture du projet. **Le Sprint 2 doit le lire
avant toute modification.**

## Principe directeur

Séparation stricte des responsabilités et **modularité par feature** : une
anomalie dans un module se corrige sans provoquer de régression dans les
autres. On ne mélange jamais interface, logique métier, accès aux données,
validation, authentification, autorisation et paiement.

## Couches

```
UI (pages/, components/, layouts/)
        │  n'appelle jamais Supabase directement
        ▼
Logique métier pure (features/*/**.logic.ts)      ← testable, réutilisable serveur
        │
Services d'accès aux données (features/*/*Service.ts)
        │  seuls autorisés à parler à Supabase
        ▼
lib/supabase.ts (client bas-niveau)  →  Supabase (PostgreSQL + RLS)
```

- **`config/`** — configuration centralisée (env validé, config événement de
  repli). Aucune variable d'environnement lue ailleurs.
- **`types/`** — enums métier (source de vérité) et types de lignes DB.
- **`schemas/`** — validation Zod (frontières d'entrée).
- **`lib/`** — client Supabase, erreurs (`AppError`), logger, utilitaires.
- **`features/`** — un dossier par domaine, chacun avec sa logique et son
  service :
  - `auth/` — contexte d'auth, RBAC, gardes de routes.
  - `participants/` — logique métier + service + formulaire.
  - `events/`, `schools/` — services de lecture/écriture.
  - `payments/`, `tickets/`, `checkin/` — **frontières posées** pour les
    Sprints 2/3 (contrats sans implémentation réelle).
- **`hooks/`** — hooks transverses (`useAsync`).
- **`components/`** — `ui/` (kit accessible) et `common/` (états loading /
  empty / error / forbidden, placeholder, error boundary).
- **`pages/`, `layouts/`** — composition de l'UI.
- **`app/`** — routeur et configuration de navigation.

## Règles de dépendance

1. Les composants UI n'importent **jamais** `@/lib/supabase` : ils passent par
   un `*Service`.
2. La logique métier (`*.logic.ts`) est **pure** : pas d'import React ni réseau.
   Elle peut donc être réutilisée dans une Edge Function au Sprint 2.
3. Les enums de `types/enums.ts` sont la **seule** source des valeurs d'états.
   Le SQL (`supabase/migrations`) doit rester aligné avec eux.
4. Les frontières des modules futurs existent déjà : ajouter Wero, la
   billetterie ou le check-in ne doit pas modifier le frontend existant, mais
   implémenter le contrat du service correspondant.

## Extensibilité (Sprints suivants)

| Besoin S2/S3            | Point d'extension prévu                              |
| ----------------------- | ---------------------------------------------------- |
| Paiement Wero           | `PaymentService.initiatePayment` + Edge Function      |
| Vérification nouveaux   | `verification_status` + logique dédiée                |
| Import des inscrits      | `ParticipantService` (insertion en masse admin)      |
| Billets / QR codes      | `TicketService.generateTicket` + `canIssueTicket`     |
| Scanner / check-in      | `CheckinService.checkIn` + colonnes `checked_in*`     |
| RBAC complet (UI)       | table `user_roles` + `rbac.ts` + pages admin          |

## Gestion des erreurs

- Toute erreur est normalisée en `AppError` (`lib/errors.ts`) avec un
  `userMessage` sûr et un message technique **journalisé uniquement**.
- Les composants affichent `ErrorState` (message utilisateur) ; `ErrorBoundary`
  capture les erreurs de rendu.

## États d'interface

`LoadingState`, `EmptyState`, `ErrorState`, `ForbiddenState`,
`FeaturePlaceholder`, `FullPageLoader` couvrent les états standard. Aucune
fonctionnalité non implémentée n'est présentée comme fonctionnelle.

---

# Sprint 2 — Ajouts

## Nouvelles features (frontières respectées)

```
features/
  verification/  verification.logic.ts (matching pur) + VerificationService (RPC)
  payments/      payment.logic.ts (machine à états) + PaymentService (RPC)
  tickets/       TicketService (RPC) + TicketCard (UI)
  imports/       import-mappers.ts (pur) + ImportService (RPC)
  portal/        PortalService (statut par token)
```

## Sources de vérité uniques (métier)

- `getPaymentRequirement` / `resolvePaymentRequired` (exemptions)
- `canGenerateTicket` (éligibilité) — reflétée côté serveur par `can_generate_ticket`
- `canTransitionPayment` / `PAYMENT_TRANSITIONS` (machine à états)
- `matchVerificationRecord` (matching)

Ces fonctions sont **pures**, testées, et jamais recopiées dans des composants.

## Écritures via RPC sécurisées

Les composants UI n'écrivent jamais les statuts sensibles : ils appellent des
`*Service` qui appellent des RPC `SECURITY DEFINER` (contrôle de rôle + audit +
idempotence). Le frontend n'est jamais source de vérité (prix, statut, ticket).

## Espace participant

Accès sans compte via un **token privé** (`/mon-billet?t=`), stocké côté client ;
seul le hash est en base. Le billet (QR) est rendu par `TicketCard`.
