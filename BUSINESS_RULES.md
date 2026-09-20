# Règles métier

Source de vérité fonctionnelle. Les règles ci-dessous sont implémentées de
manière **centralisée et testée** dans
[`src/features/participants/participant.logic.ts`](./src/features/participants/participant.logic.ts)
et renforcées côté base (contraintes + triggers + RLS).

## Catégories de participants

Il existe **exactement trois** valeurs métier principales :

| Valeur        | Libellé            | Paiement | Vérification | École            |
| ------------- | ------------------ | -------- | ------------ | ---------------- |
| `NEW_STUDENT` | Nouveau étudiant   | Non      | Oui          | Non              |
| `ALUMNI`      | Ancien étudiant    | Oui      | Non          | **Obligatoire**  |
| `OTHER`       | Autre / Invité     | Oui      | Non          | Non              |

> « Autre / Invité » **n'est pas** une 4ᵉ catégorie ; c'est la valeur `OTHER`.

## Dimensions indépendantes

Catégorie, vérification, paiement, inscription, billet et check-in sont des
dimensions **séparées** et ne doivent jamais être fusionnées :

- `participant_type` — catégorie déclarée.
- `verification_status` — `NOT_REQUIRED | PENDING | VERIFIED | REJECTED`.
- `payment_status` — `NOT_REQUIRED | PENDING | PAID | FAILED | REJECTED`.
- `registration_status` — `PENDING | CONFIRMED | REJECTED`.
- `ticket_status` — `NOT_GENERATED | GENERATED | CANCELLED`.
- `checked_in` — booléen (+ `checked_in_at`).

## Le statut déclaré n'est jamais une preuve

Choisir `NEW_STUDENT` ne prouve pas qu'on est réellement nouveau. La logique
combine **catégorie + statut de vérification** :

- `NEW_STUDENT` + `PENDING` = nouveau **déclaré, non vérifié** →
  `isVerifiedNewStudent = false`.
- `NEW_STUDENT` + `VERIFIED` = nouveau **confirmé** →
  `isVerifiedNewStudent = true`.

C'est le fondement du Sprint 2 (vérification). Un client ne peut pas se
déclarer vérifié : le trigger `set_participant_initial_status()` **force** les
statuts à l'insertion (voir DATABASE.md).

## Paiement requis

`getPaymentRequirement(participant)` — fondé sur la **catégorie** :

- `NEW_STUDENT` → `false` (gratuit).
- `ALUMNI` → `true`.
- `OTHER` → `true`.
- défaut inconnu → `true` (sûr).

⚠️ **Les prix ne sont jamais fiables côté frontend.** `PaymentService.
getDisplayAmountCents` sert uniquement à l'affichage indicatif. Le montant
réellement facturé sera calculé et vérifié **côté serveur** (Edge Function) au
Sprint 2.

## Éligibilité au billet

`canIssueTicket(participant)` (préparé pour le Sprint 2) :

1. `registration_status = CONFIRMED` **et**
2. si `NEW_STUDENT` : `verification_status = VERIFIED` ;
   sinon (`ALUMNI`/`OTHER`) : `payment_status = PAID`.

Résumé :

```
NEW_STUDENT + VERIFIED  → payment_required = false, billet possible après confirmation
ALUMNI                  → payment_required = true,  billet après paiement
OTHER                   → payment_required = true,  billet après paiement
```

## École conditionnelle

`requiresSchool(type)` : école obligatoire pour **`NEW_STUDENT`** (l'école
dans laquelle il étudie) et pour **`ALUMNI`** (son ancienne école).
Facultative pour `OTHER`. Renforcé par la contrainte SQL
`participant_requires_school` et par le schéma Zod.

## Détection des doublons

**Stratégie retenue** : unicité sur `(événement, email normalisé, catégorie)`.

- Index unique `participants_unique_registration` sur
  `(coalesce(event_id, sentinel), lower(email), participant_type)`.
- Justification : un même email peut légitimement exister sous des catégories
  différentes (cas métier rare mais possible : quelqu'un inscrit comme invité
  puis reconnu ancien), mais **pas deux fois la même catégorie pour le même
  événement**. On évite ainsi les inscriptions accidentelles en double sans
  bloquer des cas légitimes.
- Un conflit d'unicité est remonté à l'utilisateur comme message clair
  (« Une inscription existe déjà… ») via `AppError('CONFLICT')`.

## États initiaux à l'inscription

`deriveInitialStatuses(type)` (et le trigger SQL équivalent) :

| Catégorie     | verification | payment      | registration | ticket        |
| ------------- | ------------ | ------------ | ------------ | ------------- |
| `NEW_STUDENT` | PENDING      | NOT_REQUIRED | PENDING      | NOT_GENERATED |
| `ALUMNI`      | NOT_REQUIRED | PENDING      | PENDING      | NOT_GENERATED |
| `OTHER`       | NOT_REQUIRED | PENDING      | PENDING      | NOT_GENERATED |

---

# Sprint 2 — Règles complémentaires

## Machine à états du paiement

Statut d'un paiement (`payments.status`, source de vérité `payment.logic.ts`) :

```
PENDING ─▶ AWAITING_CONFIRMATION ─▶ PAID ─▶ REFUNDED
   │              │
   └──▶ REJECTED  └──▶ REJECTED / PENDING
PENDING ─▶ FAILED
```

- `PENDING → AWAITING_CONFIRMATION` : déclenché par l'utilisateur (« J'ai payé »).
- `→ PAID` : **uniquement** par un administrateur/finance (RPC `admin_confirm_payment`).
- `REJECTED → PAID` : **interdit**. Toute transition incohérente est refusée
  (`assertPaymentTransition`).
- Idempotence : ré-appliquer le même statut est autorisé (sans effet).

## Wero V1

Déclaration utilisateur + confirmation administrative manuelle. Le bouton
« J'ai effectué le paiement » ne pose **jamais** `PAID` : il passe seulement en
`AWAITING_CONFIRMATION`. Aucune page de retour, capture ou clic n'est une preuve.
L'architecture (`PaymentService` → RPC) permet de brancher une API/webhook Wero
au Sprint 3 sans réécrire le frontend.

## Référence de paiement

Générée côté serveur : `PAY-AAAA-00001` (séquence). Unique, lisible, liée à un
seul paiement. L'`id` participant n'est jamais utilisé comme référence publique.

## Exemptions (dirigeants / officiels)

`payment_required` est une dimension **indépendante** de `participant_type`. Un
dirigeant reste `ALUMNI`/`OTHER` avec `payment_required = false` (aucune 4ᵉ
catégorie). Seule la RPC auditée `admin_waive_payment` (ADMIN/SUPER_ADMIN) peut
poser une exemption ; un utilisateur public ne peut jamais s'exempter.

## Éligibilité au billet — `canGenerateTicket`

Source de vérité unique (`participant.logic.ts`, reflétée côté serveur par
`can_generate_ticket`). Ne se contente jamais de `registration = CONFIRMED` :

1. inscription non `REJECTED` ;
2. `NEW_STUDENT` → `verification = VERIFIED` ;
3. si paiement requis (exemptions comprises) → `payment = PAID`.

## Vérification des nouveaux étudiants — matching

Priorité : (1) identifiant externe, (2) email normalisé, (3) nom + établissement,
(4) nom seul → **jamais** un match automatique (validation manuelle). Le résultat
(`MATCH`/`AMBIGUOUS`/`NO_MATCH`) est une **proposition** : seul un administrateur
attribue `VERIFIED` (RPC auditée).

## Import & déduplication

- Import prévisualisé → confirmé → dédupliqué → journalisé → idempotent.
- Déduplication participants : **email normalisé + événement**. Un doublon n'est
  jamais fusionné automatiquement : il est **ignoré et signalé**.
- Ré-exécuter le même import n'insère pas de doublons (idempotence par email).

## Personnes déjà payées (import)

Représentées par `payment_status = PAID` + une ligne `payments` avec
`provider = 'IMPORT'` (statut `PAID`, confirmée). Elles ne sont **jamais**
réinvitées à payer. Décision : pas de statut `IMPORTED_PAID` distinct — un
`PAID` d'origine `IMPORT` est plus simple et cohérent avec la machine à états.
