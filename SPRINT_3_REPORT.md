# SPRINT 3 — Rapport de développement

Exploitation complète, scanner QR, check-in et préparation production.

**Statut : TERMINÉ** — et, fait nouveau, **vérifié contre le projet Supabase réel**.

---

## 1. État initial

Branche de départ `feat/sprint-2-core-business`, arbre propre, commit `5f49be2`.
Baseline héritée du Sprint 2 : typecheck OK, lint 0/0, 82 tests verts, build OK,
5 migrations. Aucun problème préexistant bloquant.

## 2. Audit du Sprint 2

Architecture vérifiée dans le code réel (et non d'après le rapport) : frontières
`registration / verification / payments / imports / tickets / participants /
admin / audit` respectées, logique métier pure isolée et testée, écritures
sensibles passant exclusivement par des RPC `SECURITY DEFINER`. Le Sprint 3 a
**étendu** cette architecture sans rien réécrire.

## 3. Dashboard

Page d'accueil refondue : 11 indicateurs réels (inscrits, par catégorie,
vérifications en attente, paiements en attente/confirmés, tickets générés/non
générés, entrées effectuées/attendues) + accès rapides. Aucune donnée fictive.

## 4. Statistiques

Page dédiée : répartition par catégorie, par statut de paiement, par école,
contrôle d'entrée, et inscriptions sur 30 jours. **Agrégation côté serveur**
(`get_event_stats`, `get_time_series`) : aucune récupération massive de lignes
dans le navigateur. Graphiques en barres accessibles (valeur affichée en texte,
pas seulement par la couleur), sans dépendance de charting.

## 5. Participants

Recherche (nom, prénom, email, téléphone, référence de paiement), filtres
(catégorie, vérification, paiement, entrée), résultats plafonnés. Fiche
détaillée : profil, statuts, paiements, historique d'entrée, et actions
administratives — toutes déléguées aux services sécurisés du Sprint 2
(`VerificationService`, `PaymentService`, `TicketService`). Aucun `UPDATE`
direct depuis le frontend.

## 6. RBAC

Permissions ajoutées : `audit:read`, `exports:read`. Application à quatre
niveaux : UI (masquage) → route (`RequirePermission`) → service → RPC/RLS.
Gestion des rôles réservée au `SUPER_ADMIN` avec garde serveur, et refus de
retirer le **dernier** SUPER_ADMIN (verrouillage du système impossible).
Matrice complète dans `SECURITY.md`.

## 7. Scanner

`html5-qrcode`, mobile-first, **chargé à la demande** (`React.lazy`). Overlay de
résultat plein écran (vert / ambre / rouge), retour haptique et sonore
optionnels (jamais bloquants s'ils sont indisponibles), verrou anti double-lecture
de 3 s côté client. Réservé à `CHECKIN` / `ADMIN` / `SUPER_ADMIN`. En cas de
perte réseau : message explicite indiquant que le contrôle exige une connexion.

## 8. Check-in

Le serveur retrouve le ticket **à partir du token**, jamais d'après le contenu du
QR. Résultats distincts : `VALID`, `ALREADY_USED`, `CANCELLED`,
`PAYMENT_UNPAID`, `NOT_ELIGIBLE`, `NO_TICKET`, `INVALID`. Le paiement est
re-vérifié même si un ticket existe. Les exemptés (`payment_required = false`)
entrent sans paiement. Chaque entrée est auditée (`CHECK_IN`).

## 9. Gestion de la concurrence

Opération atomique en base :

```sql
UPDATE participants SET checked_in = true, checked_in_at = now()
WHERE id = ? AND checked_in = false RETURNING id;
```

Le verrou de ligne garantit qu'un seul `UPDATE` voit `checked_in = false` :
deux scans simultanés ⇒ **un seul `VALID`**, l'autre `ALREADY_USED`. Garde-fou
supplémentaire : `checkins.ticket_id UNIQUE`.

## 10. Exports

CSV UTF-8 (avec BOM pour Excel) : participants, paiements, check-ins. Colonnes
choisies explicitement — **aucun token, hash ou colonne technique exporté**.
Export des paiements soumis à `payments:read`.

## 11. PWA

Manifest, icônes, service worker régénéré à chaque build (`sw.js` +
`workbox-*.js`, 15 entrées préchargées). Le précache ne couvre que les
**assets de build** : aucune réponse Supabase n'est mise en cache, donc aucune
donnée personnelle ne transite par le service worker.

## 12. Sécurité

Vérifications menées **contre la base réelle** (et non simulées) :

| Contrôle | Résultat |
|---|---|
| RPC administratives en anonyme | Bloquées (404 / 401) |
| Fonctions internes en anonyme | Bloquées (401 `permission denied`) |
| `INSERT` direct anonyme sur `participants` | Bloqué (401) |
| Lecture anonyme de `participants` (1 ligne existante) | **0 ligne visible** |
| Lecture anonyme de `payments` (1 ligne existante) | **0 ligne visible** |
| `audit_logs` / `user_roles` en anonyme | 0 ligne |
| Token tronqué / altéré / majuscules | `null` |
| ALUMNI sans école | Refusé par contrainte SQL (23514) |
| « J'ai payé » | `AWAITING_CONFIRMATION`, **jamais `PAID`** |
| Billet si non payé | Refusé |

## 13. Tests

**175 tests, 12 fichiers, 0 échec.** (Sprint 2 : 82 → Sprint 3 : +93.)

Ajouts : matrice de permissions exhaustive (rôles × actions critiques, dont
`ANONYMOUS`), tentatives d'escalade de privilèges sur les routes protégées
(CHECKIN→paiements, FINANCE→admins, VIEWER→audit, ADMIN→admins), contrat de
concurrence du check-in, logique du scanner (extraction de token, présentation
des résultats), génération CSV.

## 14. Tests end-to-end

Réalisés **réellement** contre le projet Supabase de production, via l'API REST
avec la clé anon (parcours public complet) : inscription `OTHER` → token remis →
référence serveur `PAY-2026-00001` → montant 15,00 € → statut `PENDING` →
déclaration de paiement → `AWAITING_CONFIRMATION` → billet refusé car non payé.

**Limitation assumée** : les parcours nécessitant un compte authentifié
(vérification d'un étudiant, confirmation de paiement, génération de ticket,
scan/check-in) n'ont pas été automatisés ici — ils exigent une session
`SUPER_ADMIN`/`CHECKIN` que l'agent ne peut pas créer. Ils sont couverts par les
tests unitaires et les gardes serveur, et figurent dans la checklist de tests de
fumée à dérouler manuellement (`PRODUCTION_CHECKLIST.md` § 5).

## 15. npm audit

**8 vulnérabilités : 1 critique, 1 haute, 6 modérées.** Analyse individuelle :

| Paquet | Sévérité | Impact réel | Exploitable ici ? | Action |
|---|---|---|---|---|
| `vitest` | critique | Lecture/exécution de fichier quand le **serveur Vitest UI** écoute | **Non** — dépendance de dev, jamais déployée, UI non utilisée (`vitest run`) | Reporté |
| `vite` | haute | Path traversal sur `.map` du **serveur de dev** ; divulgation NTLMv2 via `launch-editor` (Windows) | **Non** — Vite ne tourne pas en production, l'artefact déployé est statique | Reporté |
| `@vitest/mocker`, `vite-node` | modérée | Transitives de vitest/vite | **Non** — dev uniquement | Reporté |
| `vite-plugin-pwa` | modérée | Transitive de vite, build-time | **Non** | Reporté |
| `react-router`, `react-router-dom` | modérée | (a) injection via `deserializeErrors` en **hydratation SSR** ; (b) **open redirect** via antislash dans `<Link>`/`useNavigate` | (a) **Non** — SPA sans SSR. (b) **Non atteignable** : la seule navigation dynamique est `navigate(from)` dans `LoginPage`, où `from` provient de l'état interne du routeur (posé par `ProtectedRoute`), pas d'une URL contrôlable | Reporté |

**Décision : aucune mise à jour forcée.** Les trois correctifs disponibles sont
des **versions majeures** (`vite@8`, `vitest@4`, `react-router-dom@7`) qui
déstabiliseraient le projet à quelques jours de l'événement. Aucune des
vulnérabilités n'atteint l'artefact déployé. Migration à traiter sur une branche
isolée après l'événement (build + 175 tests + audit à rejouer).

## 16. Problèmes rencontrés

Détail complet dans `DEVELOPMENT_LOG.md` (entrées 8 à 11). Les trois plus
importants ont été **découverts en exécutant réellement les migrations**, pas en
local :

1. `audit_logs` créée après `log_audit()` → migration en échec (`42P01`).
2. **pgcrypto hors du `search_path`** — chez Supabase l'extension vit dans le
   schéma `extensions` : `digest()` et `gen_random_bytes()` étaient introuvables.
   **Inscription, billet et check-in auraient tous échoué en production.**
3. **`REVOKE ... FROM PUBLIC` insuffisant** — les `DEFAULT PRIVILEGES` Supabase
   accordent `EXECUTE` à `anon` : `next_ticket_number()` était appelable
   anonymement (il retournait `EVT-2026-00001`).

## 17. Corrections

1. Réordonnancement de `0004_sprint2_business.sql` + vérification automatique de
   l'ordre des dépendances sur le bundle complet.
2. Migration `0008` : `search_path = public, extensions` sur toutes les fonctions
   `SECURITY DEFINER`.
3. Migration `0008` : révocations explicites pour `anon` / `authenticated`.
4. `ScannerPage` en import dynamique : bundle principal **595 → 255 kB**.

Toutes revérifiées contre la base réelle après application.

## 18. Limitations restantes

- **Mode hors ligne du scanner : NON implémenté.** Décision assumée : un cache
  local de tickets valides permettrait de contourner une annulation ou un
  non-paiement, et rendrait les doubles entrées possibles entre appareils non
  synchronisés. Le contrôle exige donc le réseau ; une procédure de secours
  manuelle figure dans `PRODUCTION_CHECKLIST.md` § 6.
- **Wero automatisé** : toujours en V1 manuelle (déclaration + confirmation
  administrative). Aucune API/webhook officielle disponible ; l'abstraction
  `PaymentService` → RPC permet de brancher l'automatisation sans réécriture.
- **Notifications / emails** : non implémentés (aucune infrastructure fournie).
  Les liens privés sont remis à l'inscription et listés lors des imports. Aucune
  fausse notification n'a été fabriquée.
- **Édition de l'événement / des écoles via l'UI** : la page Paramètres est en
  lecture ; la modification se fait en base.
- **Tests e2e authentifiés** : voir § 14.

## 19. Variables d'environnement

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (obligatoires),
`VITE_WERO_BENEFICIARY`, `VITE_WERO_HANDLE`, `VITE_WERO_INSTRUCTIONS`,
`VITE_EVENT_*`, `VITE_*_PRICE_CENTS`, `VITE_CURRENCY` (repli d'affichage).
Toutes documentées dans `.env.example` et `PRODUCTION_CHECKLIST.md` § 3.

**Type Vercel : « Config », pas « Secret ».** Le préfixe `VITE_` est public par
construction (valeur intégrée au bundle). La clé anon est conçue pour être
publique ; la sécurité repose sur la RLS — désormais vérifiée sur données
réelles. `SUPABASE_SERVICE_ROLE_KEY` n'apparaît nulle part.

## 20. Préparation Supabase

8 migrations ordonnées, idempotentes (`IF NOT EXISTS` / `CREATE OR REPLACE` /
`DROP POLICY IF EXISTS`), regroupées en 5 scripts prêts à coller
(`deploy/step1` → `step5`). Migration irréversible signalée : `0003`
(`ALTER TYPE ... ADD VALUE`). Procédure de backup/rollback : checklist § 7.

## 21. Préparation Vercel

Framework Vite, `npm run build`, sortie `dist`, réécriture SPA via `vercel.json`.
Branche `main` créée et poussée. HTTPS obligatoire (la caméra du scanner ne
fonctionne pas en HTTP).

## 22. Checklist production

`PRODUCTION_CHECKLIST.md` : Supabase, frontend, variables, sécurité, tests de
fumée, préparation du jour J, backup/rollback, post-déploiement.

## 23. Commit Git

Branche `feat/sprint-3-production-readiness`, également poussée sur `main`.
Aucun secret versionné (`.env.local` ignoré, seul `.env.example` suivi).

## 24. État final

```
Tests :      175 réussis / 0 échoué (12 fichiers)
Typecheck :  OK (0 erreur)
Lint :       OK (0 erreur, 0 avertissement)
Build :      OK — index 255 kB · react-vendor 165 kB · supabase 214 kB · CSS 30 kB
PWA :        sw.js + workbox générés (15 entrées préchargées)
npm audit :  8 vulnérabilités (1 critique, 1 haute, 6 modérées) — toutes dans
             l'outillage dev/build, aucune n'atteint l'artefact déployé
Base réelle : migrations appliquées, RLS prouvée sur données réelles,
             parcours public validé de bout en bout
```

**Prêt pour l'exploitation.** Reste à dérouler manuellement les tests de fumée
authentifiés (§ 5 de la checklist) avant l'ouverture des inscriptions.
