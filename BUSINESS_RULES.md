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

`requiresSchool(type)` : école obligatoire **uniquement** pour `ALUMNI`.
Renforcé par la contrainte SQL `alumni_requires_school` et le schéma Zod.

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
