# SPRINT 2 — Rapport de développement

Cœur métier : vérification, paiement (Wero V1), imports et tickets.

**Statut : TERMINÉ.**

---

## 1. Fonctionnalités implémentées

- **Vérification des nouveaux étudiants** : liste officielle importable,
  matching pur (email → identifiant → nom+école → nom seul), file d'attente
  admin avec proposition de correspondance, actions Vérifier / Rejeter
  (serveur, auditées). Un `NEW_STUDENT` non vérifié n'obtient pas de billet.
- **Paiement Wero V1** : référence unique côté serveur, instructions
  configurables, bouton « J'ai payé » → `AWAITING_CONFIRMATION` (jamais `PAID`),
  confirmation/rejet par admin/finance, machine à états centralisée.
- **Exemptions** (dirigeants/officiels) : `payment_required = false` via RPC
  auditée, sans créer de 4ᵉ catégorie.
- **Imports CSV** (participants & liste de vérification) : parsing sans
  dépendance, aperçu, validation, déduplication (email + événement),
  idempotence, journalisation ; gestion des « déjà payés ».
- **Tickets** : génération serveur idempotente conditionnée par `canGenerateTicket`,
  numéro unique `EVT-AAAA-00001`, QR sécurisé (token privé, aucune donnée perso).
- **Espace participant** (`/mon-billet?t=`) : suivi de statut, déclaration de
  paiement, affichage du billet + QR — accès par token privé, sans compte.
- **Audit** des actions sensibles (`audit_logs`).

## 2. Fichiers principaux modifiés / créés

- Métier pur : `features/participants/participant.logic.ts` (étendu),
  `features/payments/payment.logic.ts`, `features/verification/verification.logic.ts`,
  `features/imports/import-mappers.ts`, `lib/csv.ts`.
- Services (RPC) : `ParticipantService`, `PaymentService`, `TicketService`,
  `VerificationService`, `ImportService`, `PortalService`.
- UI : `RegistrationForm` (RPC + lien privé), `PortalPage`, `TicketCard`,
  `components/ui/QRCode`, pages dashboard `VerificationPage`, `ImportsPage`,
  `PaymentsPage` (réelle), `TicketsPage` (réelle) ; `app/router.tsx`,
  `app/dashboard-nav.ts`, `layouts/PublicLayout`.
- Types/config : `types/enums.ts`, `types/database.ts`, `config/event.config.ts`,
  `vite-env.d.ts`, `.env.example`.

## 3. Migrations créées

- `0003_sprint2_enums.sql` — `AWAITING_CONFIRMATION`, `REFUNDED`.
- `0004_sprint2_business.sql` — colonnes participants, tables
  (`student_verification_records`, `payments`, `tickets`, `audit_logs`,
  `import_batches`), fonctions & RPC, trigger mis à jour.
- `0005_sprint2_rls.sql` — RLS des nouvelles tables + verrouillage des
  privilèges d'exécution.

## 4. Règles métier implémentées (source de vérité unique)

`getPaymentRequirement`, `resolvePaymentRequired` (exemptions), `canGenerateTicket`
(reflétée en SQL par `can_generate_ticket`), `canTransitionPayment` /
`PAYMENT_TRANSITIONS`, `matchVerificationRecord`. Aucune duplication dans les
composants. Détails : `BUSINESS_RULES.md`.

## 5. Paiement Wero V1

Déclaration utilisateur + confirmation administrative manuelle. Aucune preuve
côté client (clic, page de retour, capture) n'est acceptée. Abstraction
`PaymentService` → RPC `admin_confirm_payment`, prête à accueillir une API /
webhook Wero au Sprint 3 sans réécriture. Montant déterminé côté serveur.

## 6. Vérification étudiants

Matching hiérarchisé et normalisé (casse/accents/espaces), jamais un match
automatique sur le seul prénom. La décision `VERIFIED`/`REJECTED` est serveur,
auditée. `NEW_STUDENT + PENDING` ≠ vérifié (garanti par tests et par la logique).

## 7. Imports

CSV → parsing → aperçu (valides/erreurs) → confirmation → RPC (dédup +
idempotence + audit). « Déjà payés » : `payment_status = PAID` + ligne `payments`
`provider = IMPORT`. Liens privés générés listés une fois pour distribution.

## 8. Tickets / QR

Un ticket par participant (unicité DB), génération idempotente et conditionnée.
QR = URL de check-in contenant le **token privé** ; seul le hash est stocké.
Accès au billet par token (pas d'énumération d'ID).

## 9. Sécurité / RLS / RBAC

- Écriture des statuts sensibles **uniquement** via RPC `SECURITY DEFINER` avec
  contrôle de rôle (`is_admin`/`is_finance`) + audit + idempotence.
- INSERT public direct sur `participants` **révoqué** (passe par RPC).
- Fonctions internes retirées de `PUBLIC` ; grants d'exécution ciblés.
- RLS sur toutes les nouvelles tables, aucune lecture publique, écritures via RPC.
- QR/token : hash en base, jamais le secret en clair. Détails : `SECURITY.md`.

## 10. Tests

**82 tests, 8 fichiers, 100 % au vert.** (Sprint 1 : 36 → Sprint 2 : +46.)

- Métier : `participant.logic` (27), `payment.logic` (11),
  `verification.logic` (10), `import-mappers` (6), `csv` (8),
  `participant.schema` (9), `rbac` (7).
- Sécurité (routes) : `ProtectedRoute` (4).
- Couvrent : NEW_STUDENT/ALUMNI/OTHER, exemptions, éligibilité ticket,
  transitions de paiement interdites (ex. `REJECTED → PAID`), idempotence
  (même statut autorisé), matching, parsing/validation d'import.

> Les tests RLS/RPC de bout en bout nécessitent une instance Supabase et sont
> hors périmètre de cette CI locale ; la logique équivalente est testée en pur
> et les garanties serveur sont assurées par les fonctions et policies.

## 11. Typecheck

`npm run typecheck` → **exit 0** (0 erreur).

## 12. Lint

`npm run lint` → **0 erreur, 0 avertissement**.

## 13. Build

`npm run build` → **exit 0**. PWA régénérée (`sw.js`). Chunks : react-vendor
164 kB, supabase 214 kB, app 218 kB (tous < 500 kB), CSS 23 kB.

## 14. Problèmes rencontrés

Voir `DEVELOPMENT_LOG.md`. Principaux : ordre des migrations pour `ALTER TYPE
ADD VALUE` ; fermeture des privilèges `EXECUTE` par défaut ; GUC de
contournement du trigger pour les imports ; BOM littéral (lint) ;
`payment_required` nullable (typecheck).

## 15. Corrections

Toutes appliquées localement et retestées (voir journal). Aucune correction
globale ; aucune anomalie masquée pour verdir un build.

## 16. Limitations restantes (volontaires — Sprint 3)

- **Wero automatisé** : pas d'API/webhook (V1 = confirmation manuelle). Non
  simulé faussement ; abstraction prête.
- **Scanner / check-in** : colonnes et token prêts, mais scan QR + validation +
  mode hors ligne non implémentés.
- **Notifications/emails** : non implémentés (pas d'infra externe imposée) ;
  frontière `NotificationService` à créer au Sprint 3 (liens privés distribués
  manuellement pour l'instant, listés à l'import).
- **Gestion des rôles via UI** : modèle et RLS prêts ; l'attribution passe par SQL.
- **Tests e2e contre Supabase réel** : à ajouter au Sprint 3.
- **Édition d'écoles / participants via UI** : lecture en place ; édition à venir.

## 17. Documentation

Mises à jour : `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `DATABASE.md`,
`SECURITY.md`, `README.md`. Créés : `SPRINT_2_REPORT.md`, `DEVELOPMENT_LOG.md`.

## 18. `npm audit`

8 vulnérabilités signalées (6 modérées, 1 haute, 1 critique), **toutes dans la
chaîne `react-router`** (advisory *SSR hydration* GHSA-337j-9hxr-rhxg). L'app est
une **SPA côté client sans SSR** : ce vecteur n'est pas exploitable ici. Le
correctif impose `react-router-dom` v7 (changement cassant). Décision : **ne pas
forcer** la mise à jour dans ce sprint (risque de régression), à traiter comme
migration contrôlée au Sprint 3. Aucun secret exposé, aucune vulnérabilité
applicable au runtime actuel.

## 19. État de préparation pour Sprint 3

**PRÊT.** Le cœur métier (vérification, paiement, tickets, imports, audit) est
en place, sécurisé côté serveur et testé. Le Sprint 3 peut ajouter scanner /
check-in / statistiques / notifications / RBAC UI **sans réécrire** ce cœur :
les frontières (`CheckinService`, token de ticket, `NotificationService` à créer,
machine à états) sont prêtes.

---

## Livrable final synthétique

```
SPRINT 2 — TERMINÉ

Modèle métier :        OK (dimensions indépendantes conservées)
Vérification :         OK (matching + validation serveur auditée)
Paiement Wero V1 :     OK (déclaration ≠ confirmation ; admin confirme)
Référence paiement :   OK (PAY-AAAA-00001, serveur, unique)
Exemptions :           OK (payment_required indépendant, audité)
Imports :              OK (aperçu, dédup, idempotent, déjà-payés)
Tickets / QR :         OK (uniques, serveur, QR par token, pas d'énumération)
Sécurité / RLS :       OK (statuts sensibles via RPC ; grants verrouillés)
RBAC :                 OK (is_admin/is_finance côté serveur + UI)
Audit :                OK (audit_logs)
Tests :                82 réussis / 0 échoué
Typecheck :            OK
Lint :                 OK (0/0)
Build :                OK
npm audit :            8 vulns react-router (SSR) — non applicables (SPA), documentées

Prêt pour Sprint 3 :   OUI
```
