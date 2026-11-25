# Plan de réalisation du MVP — suivi-repas

Proposition du 25/11/2026, **à valider par Philippe avant tout développement**.
Ce plan ne modifie aucune règle : les specs `docs/00` à `04` font référence. Les points qui complètent les specs (§3) seront reportés dans les docs concernés une fois validés.

---

## 1. Constat sur le poste (vérifié le 25/11/2026)

| Élément | État | Conséquence |
|---|---|---|
| Node.js 22 | présent | suffit pour les tests `node --test` (aucune installation) |
| npm | version 6.13.7, très ancienne et incompatible avec Node 22 ; cache réglé sur `C:\Users\ophel\AppData\Roaming\npm-cache` | proposition : ne pas toucher à l'installation sur C, et installer un **npm récent autonome dans le dossier D** (cache et temporaires sur D), pour les seuls outils de développement (Supabase CLI, D2) ; l'application reste sans dépendance installée (D1) |
| Python 3.13 | présent | sert de petit serveur web local (`python -m http.server`), rien à installer |
| Git | présent | dépôt local dans `suivi-repas` |
| Docker | absent de Windows ; Docker existe dans WSL Ubuntu (ancien dev container), dont le disque est a priori sur C | pas de Supabase local sur ce poste sans déplacer WSL (voir D3) |

---

## 2. Étapes proposées

Chaque étape se termine par quelque chose que Philippe peut voir ou vérifier. Je n'enchaîne l'étape suivante qu'après son accord.

### Étape 0 — Mise en place du dépôt (≈ ½ journée, rien à faire pour Philippe)
- `git init`, arborescence du 04 §2.2 (`design-system/`, `shared/`, `apps/mobile/`, `supabase/`, `tests/`), `CLAUDE.md` (règles : specs de référence, vocabulaire du 00, rien sur C), `.env.example`, `.gitignore`.
- npm récent installé dans le dossier D (cache et temporaires sur D), `package.json` avec la Supabase CLI en outil de développement.
- Bibliothèque Supabase (`supabase-js`) copiée une fois dans le dépôt sous forme de fichier prêt pour le navigateur, version figée (D1) : sans bundler, le paquet npm ne peut pas être chargé tel quel par le navigateur.
- Tous les caches et temporaires redirigés vers le dossier D fourni par Philippe.

### Étape 1 — Schéma Supabase : migrations SQL tirées du 04 §3 et §4
Migrations versionnées dans `supabase/migrations/`, découpées pour rester lisibles :
1. `mandants`, `habilitations`, `utilisateurs_autorises`, fonction `est_habilite_mandant`, trigger `updated_at`.
2. `types_prise_alimentaire` (index uniques partiels, protection du `Type par défaut`).
3. `aliments` (contraintes, calcul automatique du `statut_evaluation` selon `RG-REF-04`, blocage du changement `est_cuisinable` d'un aliment utilisé `RG-ETAT-05`).
4. `recettes`, `compositions_recette`, `plats_prepares`.
5. `prises_alimentaires`, `elements_prise_alimentaire` (clés étrangères composites `(id, user_id, mandant_id)`, cohérence type d'élément / portion / `etat_aliment`).
6. `cibles_nutritionnelles`, `poids_reference`, `cibles_de_depart()`, `retablir_cibles_de_depart()`.
7. Suppression physique → `Élément supprimé` (triggers `BEFORE DELETE`).
8. Trigger de première connexion (`RG-USR-02`) : habilitations, types initiaux (§3 Q2), cibles de départ.
9. RLS sur toutes les tables (04 §4.1).
- `seed.sql` : les deux mandants `REAL` et `TEST`.
- Tests pgTAP du 04 §6.1 écrits en même temps (exécution : D3).
- **Livrable** : Philippe applique les migrations sur son projet Supabase (je fournis la marche à suivre pas à pas), puis vérifie dans le Dashboard que les tables existent.

### Étape 2 — Règles métier pures + tests (`shared/utils/`, `node --test`)
- `calcul-nutritionnel.js` (cru / cuit / rendement, `NULL` vs `0`, pas d'arrondi intermédiaire, `CA-04`, `CA-18`).
- `statut-aliment.js` (`RG-REF-04`, `CA-05`).
- `fenetre-temporelle.js` (passage de minuit, priorité, type par défaut, `CA-02`, `CA-03`, `CA-12`).
- Lecture / validation du format d'import §3.8 (JSON et CSV) — réutilisée pour charger le référentiel du Préparateur (Étape 5).
- **Livrable** : rapport de tests lisible.

### Étape 3 — Socle de l'application : connexion et coquille
- `supabase-client.js`, `auth.service.js`, `mandant.service.js`.
- E-01 Connexion : choix explicite `REAL` / `TEST`, Google OAuth, vérification d'habilitation, messages d'accès refusé (`CA-01`, `CA-13`).
- Coquille : en-tête avec badge du `Mandant` (bandeau orange en `TEST`), navigation basse, routage `#/…`, design-system minimal (tokens, boutons, feuilles, bandeau d'erreur).
- **Prérequis Philippe** : configuration Google OAuth (je fournis le pas-à-pas), ajout de son adresse dans `utilisateurs_autorises`.
- **Livrable** : Philippe se connecte sur `TEST` depuis son navigateur (`http://localhost:8000`) et voit la coquille vide.

### Étape 4 — Premier écran de saisie d'une prise alimentaire (E-04, première version)
Périmètre de cette première version :
- contexte temporel : type présélectionné selon l'heure (`RG-TMP-04`), heure, date ;
- recherche unifiée limitée aux **aliments** + « Créer l'aliment … » à la volée (`RG-REF-02`) ;
- ligne : portion en grammes, bascule **Cru** / **Cuit** obligatoire pour un aliment cuisinable, note libre, suppression de ligne, avertissement de doublon (`RG-REC-04`) ;
- total de la prise en temps réel + indicateur d'incomplétude ;
- enregistrement avec gestion d'erreur réseau sans perte de saisie (`CA-10`).
- Pour voir le résultat : une **liste minimale du journal du jour** (E-03 simplifié, lecture seule).
- **Livrable** : Philippe saisit une vraie prise sur `TEST` depuis son téléphone ou son PC.

### Étape 5 — Chargement du référentiel du Préparateur
Les aliments appartiennent à un utilisateur et à un mandant (`RG-USR-03`) : ils ne peuvent pas être mis dans `seed.sql` (qui ne connaît aucun utilisateur). Proposition (D4) : un petit script local transforme le fichier JSON §3.8 du Préparateur en SQL ciblant l'adresse de Philippe et le mandant choisi, que Philippe colle dans l'éditeur SQL de Supabase. Plus tard, l'écran d'import (F-CAT-04) fera la même chose depuis l'application.

### Suite du MVP (ordre proposé, à replanifier après l'étape 5)
6. E-04 complet : suggestions `RG-SUG-01` à `03`, bases courantes, recettes et plats préparés dans la recherche, portions `%` et `Part`, modification et duplication.
7. E-03 Journal complet (détail, modifier, dupliquer, supprimer).
8. E-05 Référentiel : aliments, recettes, plats préparés, archivage / suppression, import / export.
9. E-06 Configuration : types de prise, bases courantes, cibles, poids de référence, compte.
10. E-02 Accueil : vues Jour, Semaine, 7 jours avec barres de grandeur et cibles.
11. PWA (manifest, service worker), session expirée pendant la saisie, mise en ligne HTTPS.

---

## 3. Décisions à valider

| # | Question | Recommandation | Alternative |
|---|---|---|---|
| **D1** | Comment intégrer la bibliothèque Supabase sans bundler ? | **Copier une fois le fichier ESM de `supabase-js` (version figée) dans `shared/lib/vendor/`** : pas de npm, pas de dépendance à un CDN au lancement, compatible GitHub Pages. | Charger depuis un CDN (`esm.sh` / `jsdelivr`) : plus simple, mais dépend d'un service tiers à chaque ouverture. |
| **D2** | Comment appliquer les migrations sur Supabase ? | **Supabase CLI**, version figée dans `package.json` et installée par le npm récent dans le projet (sur D) : Philippe fait une fois `supabase login` puis `supabase link` ; ensuite `supabase db push` applique les nouvelles migrations et garde la trace de ce qui est appliqué (`NFR-SUP-MAINT-01`). | Copier-coller chaque fichier dans l'éditeur SQL du Dashboard : aucun outil, mais suivi manuel des migrations appliquées. |
| **D3** | Où exécuter les tests SQL pgTAP (jamais sur le projet réel, 04 §6.1) ? | **GitHub Actions** (gratuit) : à chaque envoi du code, une instance Supabase jetable est lancée dans le cloud GitHub et les tests tournent ; rien sur le disque C. Nécessite un compte GitHub (utile aussi pour l'hébergement). | Supabase local via Docker dans WSL, après déplacement de WSL sur le disque D (opération lourde) ; ou reporter ces tests. |
| **D4** | Chargement du référentiel du Préparateur avant l'écran d'import. | **Script local JSON → SQL**, collé par Philippe dans l'éditeur SQL (Étape 5). | Attendre l'écran d'import (étape 8) : le référentiel n'est alors disponible que tard. |
| **Q1** | Types de prise alimentaire initiaux : les specs disent « types initiaux, dont un type par défaut » sans en donner la liste. | Voir tableau ci-dessous, reporté ensuite dans `02` `RG-USR-02` et `04` §3.1. | À modifier librement. |
| **Q2** | Ordre : faut-il viser d'abord la saisie (étape 4), ou d'abord l'accueil avec les métriques ? | **Saisie d'abord** : sans prise enregistrée, l'accueil n'a rien à afficher. | — |

**Proposition de types de prise alimentaire initiaux (Q1)** :

| Priorité | Libellé | Fenêtre | Remarque |
|---|---|---|---|
| 1 | Déjeuner | 11:30 – 14:30 | |
| 2 | Dîner | 19:00 – 22:30 | |
| 3 | Petit déjeuner | 05:00 – 10:00 | |
| 4 | Apéritif | 18:00 – 20:00 | |
| 5 | Goûter | 15:30 – 18:00 | **Type par défaut** |
| 6 | Collation matinale | 10:00 – 11:30 | |
| 7 | Collation nocturne | 22:30 – 05:00 | traverse minuit |

À 19:30, *Dîner* (priorité 2) l'emporte sur *Apéritif* (priorité 4). Entre 14:30 et 15:30, aucune fenêtre : le type par défaut *Goûter* est présélectionné.

---

## 4. Ce dont j'ai besoin de Philippe

| Quand | Quoi | Pourquoi |
|---|---|---|
| **Maintenant** | Validation de ce plan et des décisions D1 à D4, Q1, Q2. | Méthode du projet. |
| **Maintenant** | Un **dossier sur le disque D** pour les outils et caches (proposition : `D:\Utilisateurs\Ophélie\Documents\VS Code\_outils-dev`). | Y poser l'exécutable Supabase CLI et rediriger les temporaires, rien sur C. |
| Avant l'étape 1 (livrable) | **Compte Supabase** et un projet créé en **région Europe** (ex. Paris ou Francfort), puis me transmettre l'**URL du projet** et la **clé publique** (`anon` / *publishable*). Jamais la clé `service_role`. | Appliquer les migrations et brancher l'application. |
| Avant l'étape 3 | **Compte Google Cloud** : création d'un identifiant OAuth (je fournis le pas-à-pas, 10 minutes), à coller dans Supabase. | Connexion Google. |
| Avant l'étape 3 | Les **adresses Google** autorisées et leurs mandants (au minimum la sienne, `REAL` + `TEST`). | Liste `utilisateurs_autorises`. |
| Si D3 validée | Un **compte GitHub** (gratuit). | Tests SQL automatiques, puis hébergement. |
| Étape 5 | Le **fichier d'aliments** produit par le Préparateur (format §3.8) et son emplacement. | Remplir le référentiel. |
