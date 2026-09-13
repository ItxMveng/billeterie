# Checklist de mise en production

> ⚠️ **Aucun déploiement n'a été effectué au Sprint 3.** Ce document est la
> procédure à dérouler au **Sprint 4** (déploiement contrôlé). Le code est prêt,
> testé et documenté ; rien n'a été poussé vers un environnement réel.

---

## 1. Supabase (base de données)

- [ ] Projet Supabase de **production** créé (distinct de tout projet de test)
- [ ] Région choisie (proximité des participants — latence du scanner le jour J)
- [ ] **Backup / snapshot avant migration** (voir § Rollback)
- [ ] Migrations appliquées **dans l'ordre strict** :
  - [ ] `0001_schema.sql`
  - [ ] `0002_rls.sql`
  - [ ] `0003_sprint2_enums.sql` *(à valider/committer avant 0004)*
  - [ ] `0004_sprint2_business.sql`
  - [ ] `0005_sprint2_rls.sql`
  - [ ] `0006_sprint3_business.sql`
  - [ ] `0007_sprint3_rls.sql`
- [ ] `seed.sql` exécuté si besoin (écoles, événement) — **vérifier les prix réels**
- [ ] Événement réel créé avec `status = 'PUBLISHED'`, date, lieu, prix corrects
- [ ] Écoles réelles créées (`is_active = true`)
- [ ] Premier **SUPER_ADMIN** créé (procédure dans `supabase/seed.sql`)
- [ ] RLS vérifiée : `select * from pg_tables where schema='public'` → toutes
      les tables métier ont `rowsecurity = true`
- [ ] Fonctions déployées et privilèges vérifiés (aucune fonction interne
      exécutable par `anon`) :
      `select proname, proacl from pg_proc where pronamespace='public'::regnamespace;`
- [ ] Import des inscrits historiques réalisé (aperçu → confirmation)
- [ ] Liens privés des participants importés distribués/conservés

### Vérifications de sécurité en base

- [ ] `anon` ne peut PAS lire `participants` (test direct via l'API REST)
- [ ] `anon` ne peut PAS exécuter `admin_*`, `import_*`, `validate_checkin`
- [ ] `anon` ne peut PAS `INSERT` directement dans `participants`
- [ ] Un compte `CHECKIN` ne peut PAS lire `payments`
- [ ] Un compte `ADMIN` ne peut PAS exécuter `grant_role_by_email`

## 2. Frontend (Vercel)

- [ ] Projet Vercel lié au dépôt, branche de production définie
- [ ] Framework **Vite**, build `npm run build`, sortie `dist`
- [ ] Variables d'environnement configurées (voir § 3)
- [ ] `npm run build` réussi en CI/local avant déploiement
- [ ] Domaine personnalisé configuré
- [ ] **HTTPS actif** (obligatoire : la caméra du scanner ne fonctionne pas en HTTP)
- [ ] `vercel.json` présent (réécriture SPA vers `index.html`)
- [ ] PWA : `manifest.webmanifest` servi, `sw.js` généré, icônes présentes
- [ ] Installation PWA testée sur Android **et** iOS

## 3. Variables d'environnement

| Variable | Obligatoire | Remarque |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | URL du projet de production |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Clé **anon** uniquement |
| `VITE_EVENT_NAME` | ⬜ | Repli si aucun événement publié |
| `VITE_EVENT_DATE` | ⬜ | Repli |
| `VITE_EVENT_LOCATION` | ⬜ | Repli |
| `VITE_ALUMNI_PRICE_CENTS` | ⬜ | Affichage indicatif |
| `VITE_OTHER_PRICE_CENTS` | ⬜ | Affichage indicatif |
| `VITE_CURRENCY` | ⬜ | Par défaut `EUR` |
| `VITE_WERO_BENEFICIARY` | ✅ | Sinon instructions marquées « à confirmer » |
| `VITE_WERO_HANDLE` | ✅ | Numéro/identifiant Wero |
| `VITE_WERO_INSTRUCTIONS` | ⬜ | Texte affiché au participant |

- [ ] **`SUPABASE_SERVICE_ROLE_KEY` n'est configurée NULLE PART dans le frontend**
- [ ] Aucune valeur réelle committée dans Git (seul `.env.example` est versionné)

## 4. Sécurité

- [ ] Aucun secret dans Git (`git log -p | grep -i "service_role\|api_key"`)
- [ ] Clé `service_role` jamais exposée côté client
- [ ] RLS active sur toutes les tables métier
- [ ] RBAC vérifié pour les 5 rôles
- [ ] IDOR testé : impossible d'accéder au billet/paiement d'autrui
- [ ] QR sécurisé : token aléatoire, seul le **hash** est stocké
- [ ] Tokens falsifiés/tronqués rejetés
- [ ] Service worker : **aucun cache** des réponses Supabase (données perso)

## 5. Fonctionnel (tests de fumée en production)

- [ ] Landing page accessible
- [ ] Inscription `NEW_STUDENT` → lien privé remis
- [ ] Inscription `ALUMNI` → référence de paiement générée
- [ ] Vérification d'un nouveau étudiant → ticket émis
- [ ] Déclaration de paiement → `AWAITING_CONFIRMATION` (jamais `PAID`)
- [ ] Confirmation admin du paiement → ticket émis
- [ ] Exemption (dirigeant) → ticket sans paiement
- [ ] Espace participant : statut + billet + QR affichés
- [ ] Scanner : caméra OK sur le téléphone de l'agent (HTTPS)
- [ ] Scan valide → `ENTRÉE AUTORISÉE` + check-in enregistré
- [ ] **Second scan du même QR → `TICKET DÉJÀ UTILISÉ`**
- [ ] Ticket annulé → refusé
- [ ] Paiement non confirmé → refusé
- [ ] Dashboard : statistiques cohérentes avec la base
- [ ] Exports CSV téléchargeables et lisibles (Excel/LibreOffice)
- [ ] Journal d'audit alimenté par les actions réalisées

## 6. Le jour J — préparation opérationnelle

- [ ] Comptes `CHECKIN` créés pour chaque agent d'entrée
- [ ] PWA installée sur les téléphones des agents, connexion testée
- [ ] Connexion réseau/4G vérifiée sur le lieu (**le scanner exige le réseau**)
- [ ] Procédure de secours définie en cas de panne réseau (recherche manuelle
      du participant dans le dashboard par un admin connecté, entrée notée puis
      régularisée) — **le mode hors ligne n'est pas implémenté**
- [ ] Un administrateur joignable pour confirmer les paiements de dernière minute

## 7. Backup & rollback

**Avant toute migration en production :**

1. [ ] Snapshot / backup de la base (Supabase Dashboard → Database → Backups)
2. [ ] Noter la version/date du backup
3. [ ] Appliquer les migrations **une par une**, vérifier après chaque fichier
4. [ ] Vérifier : tables créées, RLS active, fonctions présentes, privilèges
5. [ ] En cas d'échec → restaurer le snapshot

**Migrations irréversibles à signaler :**

- `0003_sprint2_enums.sql` : `ALTER TYPE ... ADD VALUE` est **irréversible**
  (PostgreSQL ne permet pas de retirer une valeur d'enum). Un rollback impose
  la restauration du backup.
- Les `DROP POLICY` / `REVOKE` des migrations RLS sont rejouables mais modifient
  les droits : vérifier après application.
- Les `CREATE TABLE IF NOT EXISTS` et `CREATE OR REPLACE FUNCTION` sont
  idempotents et rejouables sans perte.

## 8. Après déploiement

- [ ] Tests de fumée du § 5 rejoués sur le domaine réel
- [ ] Surveillance des `audit_logs` pendant les premières heures
- [ ] Vérifier qu'aucune erreur technique n'est exposée à l'utilisateur
- [ ] Sauvegarde programmée activée
