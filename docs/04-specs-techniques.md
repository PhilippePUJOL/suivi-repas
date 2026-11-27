# Spécifications Techniques — Suivi Nutritionnel Personnel (`docs/04-specs-techniques.md`)

## 1. Objet, Sources de Vérité et Cadrage

Ce document définit l'architecture technique, l'organisation du dépôt, le modèle de données PostgreSQL / Supabase, les politiques de sécurité (RLS), la configuration Supabase (données, mandants et contrôle d'accès aux comptes), le cycle d'authentification Google OAuth avec sélection de `Mandant`, la stratégie de tests et les critères techniques (`NFR-SUP-*`) du socle **MVP (Mobile-first)**. Il sert de référence d'implémentation pour **Claude Code**.

### 1.1. Sources de vérité et terminologie

- **Hiérarchie** : le rôle de chaque document et leur ordre de priorité sont fixés dans `docs/01-vision-produit.md` §5 ; le présent document ne modifie aucune règle des documents de rang supérieur.
- **Terminologie** : tous les termes de `docs/00-dictionnaire-metier.md` s'appliquent, y compris dans le code.
- **Nommage dans le code** : conformément au langage ubiquitaire strict (`01-vision-produit.md` §4), les identifiants porteurs d'un concept métier (tables, colonnes, valeurs codées, fonctions, fichiers, écrans) sont en français, sans accents, en `snake_case` (ex. `prises_alimentaires`) ou en `kebab-case` pour les fichiers et dossiers (ex. `saisie-prise-alimentaire/`). Seuls restent en anglais les colonnes techniques (`id`, `user_id`, `mandant_id`, `code`, `position`, `created_at`, `updated_at`) et les noms imposés par la plateforme ou par l'organisation du dépôt (`auth.users`, `index.html`, `app.js`, `sw.js`, `manifest.json`, `shared/`, `apps/`, `services/`, `utils/`…).
- **Périmètre** : celui du MVP défini dans `docs/01-vision-produit.md` §3. Écartés en outre sur le plan technique : Google Drive, CouchDB, Flutter.

### 1.2. Décisions d'architecture et d'hébergement actées

- **Stack navigateur** : JavaScript vanilla (ES modules natifs), HTML5 sémantique, CSS3 natif. Aucun framework, aucun bundler, aucune conversion TypeScript, aucune dépendance externe non validée.
- **Réseau & cache** : connexion réseau obligatoire en lecture et en écriture. Le Service Worker (`sw.js`) ne met en cache **que les ressources statiques publiques** de l'application ; il ne met **jamais** en cache les réponses authentifiées ni les données utilisateur.
- **Déploiement & portabilité** : l'application fonctionne en développement local et peut être servie via un hébergeur statique gratuit en HTTPS (ex. GitHub Pages), sans dépendance propriétaire côté données / auth, celles-ci étant portées par **Supabase**. Les chemins de modules ES doivent rester relatifs et portables.
- **Coût et gouvernance** : cible à **0 €** dans les limites de l'offre gratuite Supabase pour un usage personnel et familial restreint, avec une gouvernance adaptée aux données personnelles de santé. Aucun secret (`service_role`, secret OAuth) n'est exposé dans le navigateur ni versionné.
- **Hébergement et sauvegarde des données** : projet Supabase créé en région européenne. Sauvegarde par export manuel régulier, l'offre gratuite ne garantissant pas de sauvegardes exploitables. La règle de mise en pause des projets gratuits inactifs doit être vérifiée et anticipée.

---

## 2. Architecture Applicative et Arborescence du Dépôt

### 2.1. Séparation stricte des responsabilités

- **`design-system/`** : tokens CSS, styles de base et briques d'interface réutilisables (thème clair uniquement, accessibilité clavier / tactile, respect de `prefers-reduced-motion`).
- **`shared/`** :
  - `shared/lib/` : initialisation du client Supabase (`supabase-client.js`) avec URL publique et clé publique (`anon` / publishable).
  - `shared/services/` : appels asynchrones Auth et CRUD métier, filtrage systématique par `mandant_id`, vérification des erreurs Supabase (`error`), validation aux frontières ; **aucun accès au DOM**.
  - `shared/utils/` : fonctions pures et déterministes (calculs nutritionnels en flottant sans arrondi intermédiaire, arrondi uniquement à l'affichage, fenêtres horaires et passage de minuit, moteurs de suggestions `RG-SUG-01` à `03`, règles de statut `Évalué` / `Aliment non évalué` / `NULL` vs `0`) ; **aucune dépendance au DOM ni au client Supabase**.
- **`apps/mobile/`** : assemblage des écrans de la PWA mobile (MVP), routage, gestion sécurisée du DOM (`textContent` / `createElement`, sans `innerHTML` non fiable ni `eval`), affichage permanent du `Mandant` actif.
- **`apps/desktop/`** : structure réservée pour une évolution ultérieure (V2+), hors périmètre MVP.
- **`supabase/`** : configuration locale (`config.toml`), migrations SQL versionnées (`migrations/*.sql`), jeu de données (`seed.sql`) et tests SQL (`tests/`).

### 2.2. Arborescence cible

```text
mon-projet/
├── CLAUDE.md
├── .env.example
├── package.json
├── docs/
│   ├── 00-dictionnaire-metier.md
│   ├── 01-vision-produit.md
│   ├── 02-specs-fonctionnelles.md
│   ├── 03-ux-et-parcours.md
│   ├── 04-specs-techniques.md
│   └── XX-idees-et-backlog.md
├── design-system/
│   ├── tokens.css
│   ├── base.css
│   ├── components/
│   └── styleguide.html
├── shared/
│   ├── lib/
│   │   └── supabase-client.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── mandant.service.js
│   │   ├── aliment.service.js
│   │   ├── recette.service.js
│   │   ├── plat-prepare.service.js
│   │   ├── prise-alimentaire.service.js
│   │   └── configuration.service.js
│   └── utils/
│       ├── calcul-nutritionnel.js
│       ├── fenetre-temporelle.js
│       ├── suggestions.js
│       ├── statut-aliment.js
│       └── cible-nutritionnelle.js
├── apps/
│   ├── mobile/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   ├── app.js
│   │   └── screens/
│   │       ├── connexion/
│   │       ├── accueil/
│   │       ├── journal/
│   │       ├── saisie-prise-alimentaire/
│   │       ├── referentiel/
│   │       └── configuration/
│   └── desktop/
│       └── ...
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql
│   └── tests/
└── tests/
    └── unit/
```

---

## 3. Modèle de Données PostgreSQL / Supabase

Toutes les tables exposées utilisent :

- des identifiants `uuid` ;
- des horodatages `timestamptz` (UTC en base) ;
- des triggers `updated_at` automatiques lors des `UPDATE` ;
- un rattachement de chaque donnée fonctionnelle / référentielle à `user_id` (`auth.uid()`) et à un `mandant_id` unique (`REAL` ou `TEST`) ;
- une **intégrité par utilisateur et par mandant** (`RG-MND-04`, `RG-USR-03`) : chaque table référencée expose une contrainte `unique (id, user_id, mandant_id)`, et chaque clé étrangère métier est composite (`(<élément>_id, user_id, mandant_id)`), afin qu'aucune ligne ne puisse référencer un élément d'un autre utilisateur ou d'un autre mandant. Pour les références en `ON DELETE SET NULL`, seule la colonne d'identifiant est remise à `NULL` (syntaxe `ON DELETE SET NULL (aliment_id)`, PostgreSQL 15+).

### 3.1. Gouvernance des Mandants et habilitations

- **`mandants`** : table référentielle des mandants.
  - `id uuid primary key default gen_random_uuid()`
  - `code text unique not null check (code in ('REAL', 'TEST'))`
  - `libelle text not null`
  - `est_actif boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - L'administration dynamique (création / suppression / renommage) des mandants est exclue du MVP.
- **`habilitations`** : table des `Habilitations` rattachant un compte authentifié aux mandants autorisés (créées automatiquement à la première connexion, jamais depuis l'application).
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `est_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `unique (user_id, mandant_id)`
- **`utilisateurs_autorises`** (liste des `Utilisateurs autorisés`, `RG-USR-01`) :
  - `id uuid primary key default gen_random_uuid()`
  - `email text not null` (adresse du compte Google, comparée en minuscules)
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - `unique (email, mandant_id)`
  - Gérée uniquement par l'administrateur depuis le Dashboard Supabase (éditeur de tables ou SQL) : RLS activée **sans aucune politique**, donc inaccessible aux rôles `anon` et `authenticated`.
- **Initialisation à la première connexion (`RG-USR-02`)** : un déclencheur `AFTER INSERT` sur `auth.users` (fonction `SECURITY DEFINER`, `SET search_path = public`) crée les lignes `habilitations` correspondant à l'e-mail du nouveau compte dans `utilisateurs_autorises`, puis les `types_prise_alimentaire` initiaux (liste dans `docs/02-specs-fonctionnelles.md` `RG-USR-02`, dont un `Type par défaut`) et les `cibles_nutritionnelles` de départ (`RG-CIB-07`) dans chaque mandant permis. Un compte absent de la liste n'obtient aucune habilitation, donc aucun accès (RLS). Pour un compte déjà créé, l'administrateur rejoue la même fonction après avoir complété la liste. Option à vérifier : le *hook* Supabase Auth « before user created » permettrait de rejeter la création du compte lui-même ; à activer s'il est disponible dans l'offre gratuite.

### 3.2. Types de prise alimentaire et Fenêtres temporelles

- **`types_prise_alimentaire`** :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `libelle text not null`
  - `icone text not null`
  - `fenetre_debut time not null`
  - `fenetre_fin time not null`
  - `priorite integer not null check (priorite >= 1)` (`1` = priorité la plus élevée ; heure de début incluse, heure de fin exclue ; passage de minuit lorsque `fenetre_debut > fenetre_fin`, selon `RG-TMP-03` et `RG-TMP-04`)
  - `est_type_par_defaut boolean not null default false` (`RG-TMP-02`, `RG-TMP-04`)
  - Contrainte : `check (fenetre_debut <> fenetre_fin)`.
  - Index uniques partiels : `(user_id, mandant_id, priorite) where not est_archive` et `(user_id, mandant_id) where est_type_par_defaut`.
  - Le `Type par défaut` ne peut être ni archivé (contrainte `check (not (est_type_par_defaut and est_archive))`) ni supprimé (déclencheur `BEFORE DELETE`, sauf suppression en cascade du compte) (`RG-TMP-07`).
  - `est_archive boolean not null default false`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - Index composite recommandé : `(mandant_id, user_id, est_archive, priorite)`.

### 3.3. Aliments, Aliment cuisinable et Rendement de cuisson (structure en 1 table)

Un aliment porte **un seul jeu de valeurs nutritionnelles** (`RG-REF-01`, `RG-ETAT-01`) : à l'état cru (ou sec, tel qu'acheté) pour un aliment cuisinable, tel que consommé pour un aliment à état unique. Les valeurs de l'état cuit ne sont jamais stockées : elles sont calculées à partir du `rendement_cuisson` (`RG-ETAT-02`, `RG-CAL-02`).

- **`aliments`** (identité, caractère cuisinable, rendement, valeurs nutritionnelles aux 100 g, statut d'évaluation, archivage et configuration Base courante) :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `nom text not null`
  - `icone text` (optionnel)
  - `est_cuisinable boolean not null default false` — `true` : aliment cuisinable, pesé `CRU` ou `CUIT` ; `false` : aliment à état unique (`RG-ETAT-01`)
  - `rendement_cuisson numeric check (rendement_cuisson is null or rendement_cuisson > 0)` — poids cuit ÷ poids cru (poids cuit = poids cru × rendement)
  - Contrainte : `check (est_cuisinable or rendement_cuisson is null)` (pas de rendement sur un aliment à état unique).
  - Valeurs aux 100 g (à l'état cru si `est_cuisinable`), en distinguant strictement `NULL` de `0` (`RG-REF-03`) :
    - `energie_kcal numeric check (energie_kcal is null or energie_kcal >= 0)`
    - `glucides_g numeric check (glucides_g is null or glucides_g >= 0)`
    - `sucres_g numeric check (sucres_g is null or sucres_g >= 0)`
    - `lipides_g numeric check (lipides_g is null or lipides_g >= 0)`
    - `acides_gras_satures_g numeric check (acides_gras_satures_g is null or acides_gras_satures_g >= 0)`
    - `proteines_g numeric check (proteines_g is null or proteines_g >= 0)`
    - `fibres_g numeric check (fibres_g is null or fibres_g >= 0)`
    - `sel_g numeric check (sel_g is null or sel_g >= 0)`
    - `index_glycemique integer check (index_glycemique is null or (index_glycemique >= 0 and index_glycemique <= 150))` — unique par aliment, non converti pour l'état cuit
  - `statut_evaluation text not null default 'NON_EVALUE' check (statut_evaluation in ('EVALUE', 'NON_EVALUE'))` — maintenu à jour selon `RG-REF-04` : `EVALUE` si les 9 grandeurs sont renseignées (l'index glycémique n'étant pas requis lorsque `glucides_g = 0`), si `rendement_cuisson` est renseigné lorsque `est_cuisinable = true`, et si `est_non_evalue_manuel = false` ; `NON_EVALUE` sinon
  - `est_non_evalue_manuel boolean not null default false`
  - `est_base_courante boolean not null default false` (`RG-REF-06`)
  - `grammage_base_defaut numeric check (grammage_base_defaut is null or grammage_base_defaut > 0)`
  - `est_archive boolean not null default false`
  - `archive_le timestamptz`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - Index recommandé : `(mandant_id, user_id, est_archive, nom)`.
  - **Aliment utilisé (`RG-ETAT-05`)** : un déclencheur `BEFORE UPDATE OF est_cuisinable` sur `aliments` refuse toute modification de `est_cuisinable` lorsque l'aliment est référencé dans `elements_prise_alimentaire` ou `compositions_recette`. La modification de `rendement_cuisson` et des valeurs reste toujours permise (recalcul dynamique, `RG-CAL-06`).
- **Cohérence de l'état à la pesée** : dans `compositions_recette` et `elements_prise_alimentaire`, `etat_aliment` vaut `CRU` ou `CUIT` si et seulement si l'aliment référencé est cuisinable, et `NULL` pour un aliment à état unique. Règle inter-tables contrôlée par un déclencheur SQL `BEFORE INSERT OR UPDATE` sur ces deux tables et par le service (sauf pour une ligne `Élément supprimé`, dont `aliment_id` est `NULL`).
- **Calcul** (`shared/utils/calcul-nutritionnel.js`, fonction pure, `RG-CAL-02`) : `poids_equivalent = poids_pese` si l'aliment est à état unique ou pesé `CRU` ; `poids_pese / rendement_cuisson` s'il est pesé `CUIT` ; contribution `0` (et élément non évalué) si `rendement_cuisson` est `NULL` pour une pesée `CUIT`. Puis `valeur = valeur_100g × poids_equivalent / 100`, sans arrondi intermédiaire (`RG-CAL-01`).

### 3.4. Recettes, composition de Recette et Plats préparés

- **`recettes`** :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `nom text not null`
  - `poids_total_net_g numeric check (poids_total_net_g is null or poids_total_net_g > 0)` — requis pour autoriser une `Portion` en grammes (`g`) sur la `Recette` selon `RG-REC-03`
  - `est_archive boolean not null default false`
  - `archive_le timestamptz`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
- **`compositions_recette`** (composition d'une `Recette` à partir d'`Aliments` ; survit à la suppression physique d'un `Aliment` référencé selon `RG-SUP-02`) :
  - `id uuid primary key default gen_random_uuid()`
  - `recette_id uuid not null references recettes(id) on delete cascade`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `aliment_id uuid references aliments(id) on delete set null`
  - `etat_aliment text check (etat_aliment is null or etat_aliment in ('CRU', 'CUIT'))` — état à la pesée, renseigné uniquement pour un aliment cuisinable (§3.3)
  - `poids_g numeric not null check (poids_g > 0)`
  - `est_element_supprime boolean not null default false`
  - `libelle_element_supprime text` (renseigné à `'Élément supprimé'` lors de la suppression physique d'un `Aliment` référencé)
  - `position integer not null default 0`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
- **`plats_prepares`** (`Plat préparé` : valeurs renseignées directement, aux 100 g ou pour le plat entier, sans index glycémique, sans composition détaillée ni `État d'un aliment`) :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `nom text not null`
  - `poids_total_g numeric check (poids_total_g is null or poids_total_g > 0)` (`Poids total`)
  - `base_valeurs text not null check (base_valeurs in ('PAR_100G', 'PLAT_ENTIER'))` (`RG-REC-02`) ; les colonnes nutritionnelles ci-dessous sont exprimées selon cette base
  - Contrainte : `check (base_valeurs <> 'PAR_100G' or poids_total_g is not null)`.
  - `energie_kcal numeric check (energie_kcal is null or energie_kcal >= 0)`
  - `glucides_g numeric check (glucides_g is null or glucides_g >= 0)`
  - `sucres_g numeric check (sucres_g is null or sucres_g >= 0)`
  - `lipides_g numeric check (lipides_g is null or lipides_g >= 0)`
  - `acides_gras_satures_g numeric check (acides_gras_satures_g is null or acides_gras_satures_g >= 0)`
  - `proteines_g numeric check (proteines_g is null or proteines_g >= 0)`
  - `fibres_g numeric check (fibres_g is null or fibres_g >= 0)`
  - `sel_g numeric check (sel_g is null or sel_g >= 0)`
  - `est_archive boolean not null default false`
  - `archive_le timestamptz`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`

### 3.5. Prises alimentaires et Éléments de prise alimentaire

- **`prises_alimentaires`** (`Prise alimentaire`) :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `type_prise_alimentaire_id uuid not null references types_prise_alimentaire(id) on delete no action` (`RG-TMP-06` ; un type référencé ne peut qu'être archivé selon `RG-TMP-07` ; `no action` refuse la suppression comme `restrict`, mais en fin d'instruction, ce qui permet la suppression en cascade d'un compte)
  - `horodatage_prise timestamptz not null`
  - `date_locale date not null` (`RG-TMP-01` : date calendaire civile locale, de 00:00 à 23:59, dans le fuseau de saisie)
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - Index recommandé : `(mandant_id, user_id, date_locale, horodatage_prise desc)`.
- **`elements_prise_alimentaire`** (`Élément de prise alimentaire` : `ALIMENT`, `RECETTE` ou `PLAT_PREPARE`, avec `Portion` et `Note libre`) :
  - `id uuid primary key default gen_random_uuid()`
  - `prise_alimentaire_id uuid not null references prises_alimentaires(id) on delete cascade`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `type_element text not null check (type_element in ('ALIMENT', 'RECETTE', 'PLAT_PREPARE'))`
  - `aliment_id uuid references aliments(id) on delete set null`
  - `recette_id uuid references recettes(id) on delete set null`
  - `plat_prepare_id uuid references plats_prepares(id) on delete set null`
  - `etat_aliment text check (etat_aliment is null or etat_aliment in ('CRU', 'CUIT'))` — état à la pesée, renseigné uniquement pour un aliment cuisinable (§3.3)
  - `mode_portion text not null check (mode_portion in ('GRAMMES', 'POURCENTAGE', 'PART'))`
  - `portion_grammes numeric check (portion_grammes is null or portion_grammes > 0)`
  - `portion_pourcentage numeric check (portion_pourcentage is null or portion_pourcentage > 0)` (peut dépasser 100, `RG-REC-03`)
  - `portion_numerateur integer check (portion_numerateur is null or portion_numerateur > 0)`
  - `portion_denominateur integer check (portion_denominateur is null or portion_denominateur > 0)`
  - `note_libre text` (`RG-ETAT-04`)
  - `est_element_supprime boolean not null default false`
  - `libelle_element_supprime text` (`'Élément supprimé'` en cas de suppression physique d'un élément référencé)
  - `position integer not null default 0`
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - **Contrainte de cohérence du type d'élément** :
    - `type_element = 'ALIMENT'` → `(aliment_id is not null or est_element_supprime = true)` et `recette_id is null` et `plat_prepare_id is null`
    - `type_element = 'RECETTE'` → `(recette_id is not null or est_element_supprime = true)` et `aliment_id is null` et `plat_prepare_id is null` et `etat_aliment is null`
    - `type_element = 'PLAT_PREPARE'` → `(plat_prepare_id is not null or est_element_supprime = true)` et `aliment_id is null` et `recette_id is null` et `etat_aliment is null`
  - **Contrainte de cohérence de `Portion`** :
    - `mode_portion = 'GRAMMES'` → `portion_grammes is not null`
    - `mode_portion = 'POURCENTAGE'` → `portion_pourcentage is not null`
    - `mode_portion = 'PART'` → `portion_numerateur is not null and portion_denominateur is not null`
    - les parts supérieures à 1 (`portion_numerateur > portion_denominateur`) sont autorisées
    - `type_element = 'ALIMENT'` → `mode_portion = 'GRAMMES'`
    - `mode_portion = 'GRAMMES'` sur une `RECETTE` ou un `PLAT_PREPARE` exige un `Poids total` renseigné sur l'élément référencé (`poids_total_net_g` ou `poids_total_g`) : règle inter-tables contrôlée par déclencheur SQL et par le service

- **Enregistrement atomique (`F-EDIT-05`, `NFR-SUP-REL-01`)** : la prise et ses éléments sont enregistrés par la fonction RPC `public.enregistrer_prise_alimentaire(p_prise jsonb, p_elements jsonb)` (`SECURITY INVOKER`, soumise à la RLS), en une seule transaction : en modification, les lignes existantes (hors `Élément supprimé`) sont remplacées. Aucune prise n'est jamais enregistrée partiellement.

### 3.6. Suppression logique vs physique et restauration (`RG-SUP-01` à `04`)

- **Avant suppression** : le service interroge les références actives (`elements_prise_alimentaire`, `compositions_recette`) dans le `mandant_id` actif pour compter les occurrences.
- **Élément non référencé (`RG-SUP-03`)** : suppression physique directe (`DELETE`) après confirmation.
- **Élément référencé (`RG-SUP-02`)** :
  - **Archivage logique** : mise à jour de `est_archive = true` et `archive_le = now()` sur l'entité. Les historiques et agrégats restent inchangés ; l'élément est exclu des recherches et suggestions futures.
  - **Suppression physique** : un déclencheur SQL `BEFORE DELETE` sur `aliments`, `recettes` et `plats_prepares` marque les lignes référencées dans `elements_prise_alimentaire` et `compositions_recette` (`est_element_supprime = true`, `libelle_element_supprime = 'Élément supprimé'`) avant que la clé étrangère `ON DELETE SET NULL` ne mette à `NULL` l'identifiant référencé (`aliment_id`, `recette_id`, `plat_prepare_id`). À la lecture et au calcul, ces lignes :
    - affichent `Élément supprimé` ;
    - contribuent pour `0` aux grandeurs nutritionnelles ;
    - déclenchent l'indicateur d'avertissement d'incomplétude sur la prise et sur les périodes concernées (`RG-CAL-05`).
- **Restauration (`RG-SUP-04`)** : mise à jour de `est_archive = false` et `archive_le = null`.
- **Types de prise alimentaire (`RG-TMP-07`)** : un type référencé par au moins une prise ne peut qu'être archivé (`est_archive = true`) ; un type non référencé peut être supprimé physiquement ; le `Type par défaut` ne peut être ni archivé ni supprimé. À la restauration, le service attribue la priorité suivant la plus basse des types non archivés, ce qui respecte l'index unique partiel sur `priorite`.

### 3.7. Cibles nutritionnelles et poids de référence (`RG-CIB-01` à `06`)

- **`cibles_nutritionnelles`** (`Cible nutritionnelle` : au plus une par grandeur, par utilisateur et par `Mandant` ; définition non historisée, `RG-CIB-05`) :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `grandeur text not null check (grandeur in ('ENERGIE_KCAL', 'GLUCIDES_G', 'SUCRES_G', 'LIPIDES_G', 'ACIDES_GRAS_SATURES_G', 'PROTEINES_G', 'FIBRES_G', 'SEL_G'))` (jamais l'index glycémique)
  - `forme_cible text not null check (forme_cible in ('VALEUR', 'PLAGE'))`
  - `base_cible text not null default 'ABSOLUE' check (base_cible in ('ABSOLUE', 'PAR_KG', 'POURCENTAGE_ENERGIE'))` (`PAR_KG` : coefficients par kg de `Poids de référence` ; `POURCENTAGE_ENERGIE` : pourcentages de la `Référence énergétique`)
  - `valeur_cible numeric check (valeur_cible is null or valeur_cible > 0)`
  - `valeur_basse numeric check (valeur_basse is null or valeur_basse >= 0)`
  - `valeur_haute numeric check (valeur_haute is null or valeur_haute >= 0)`
  - Contraintes de cohérence :
    - `forme_cible = 'VALEUR'` → `valeur_cible is not null and valeur_basse is null and valeur_haute is null`
    - `forme_cible = 'PLAGE'` → `valeur_cible is null and (valeur_basse is not null or valeur_haute is not null)`
    - `valeur_basse is null or valeur_haute is null or valeur_basse < valeur_haute`
    - `grandeur = 'ENERGIE_KCAL'` → `forme_cible = 'VALEUR' and base_cible = 'ABSOLUE'`
    - `base_cible = 'POURCENTAGE_ENERGIE'` → `grandeur in ('GLUCIDES_G', 'SUCRES_G', 'LIPIDES_G', 'ACIDES_GRAS_SATURES_G', 'PROTEINES_G')`
  - Contrainte d'unicité : `unique (user_id, mandant_id, grandeur)`.
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
- **`poids_reference`** (`Poids de référence` historisé par date d'effet, `RG-CIB-06`) :
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `mandant_id uuid not null references mandants(id) on delete restrict`
  - `date_effet date not null` (date locale, par défaut le jour de saisie)
  - `poids_kg numeric not null check (poids_kg > 0)`
  - Contrainte d'unicité : `unique (user_id, mandant_id, date_effet)`.
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - Index recommandé : `(mandant_id, user_id, date_effet desc)`.
- **Calcul** : la fonction pure `shared/utils/cible-nutritionnelle.js` calcule, pour une journée donnée, la cible effective de chaque grandeur (poids applicable selon `date_effet`, référence énergétique = valeur cible d'énergie, facteurs `9` kcal/g pour lipides et acides gras saturés et `4` kcal/g pour glucides, sucres et protéines), puis le positionnement et l'écart (`RG-CIB-03`), à partir des agrégats non arrondis. Ces résultats ne sont jamais stockés.
- **Cibles de départ (`RG-CIB-07`)** : leurs valeurs sont définies une seule fois, dans une fonction SQL `public.cibles_de_depart()` (ou une table de référence en lecture seule) utilisée à la fois par le déclencheur de première connexion et par la fonction RPC `public.retablir_cibles_de_depart(p_mandant_id uuid)` (`SECURITY INVOKER`, soumise à la RLS), qui remplace les cibles des sept grandeurs concernées sans toucher à la cible d'énergie ni à `poids_reference`.
- **V2** : la `Référence énergétique` deviendra la `Dépense énergétique` du jour ; la fonction recevra alors cette valeur par journée, sans changement de la table `cibles_nutritionnelles`.

### 3.8. Format d'import / export de la table d'aliments (`RG-REF-07`, `F-CAT-04`)

L'import et l'export couvrent uniquement la table d'aliments du `Mandant` actif. Un fichier exporté est réimportable tel quel. Le même format sert aux outils externes de préparation du référentiel (hors application, voir `docs/01-vision-produit.md` §3.3).

**Champs d'un aliment** (identiques en JSON et en CSV) :

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `nom` | texte | oui | Clé de rapprochement des doublons (comparaison sans tenir compte de la casse ni des espaces en début et fin). |
| `cuisinable` | booléen | oui | `true` : valeurs à l'état cru, pesée `Cru` / `Cuit` ; `false` : aliment à état unique. |
| `rendement_cuisson` | décimal > 0 | non | Poids cuit ÷ poids cru. Interdit si `cuisinable = false`. |
| `energie_kcal`, `glucides_g`, `sucres_g`, `lipides_g`, `acides_gras_satures_g`, `proteines_g`, `fibres_g`, `sel_g` | décimal ≥ 0 | non | Aux 100 g (à l'état cru si cuisinable). Vide ou `null` = non renseigné, distinct de `0`. |
| `index_glycemique` | entier 0 à 150 | non | Vide ou `null` = non renseigné. |
| `icone` | texte | non | |
| `non_evalue_manuel` | booléen | non | Dérogation manuelle `RG-REF-04` ; `false` par défaut. |
| `archive` | booléen | non | Export uniquement ; ignoré à l'import. |
| `source` | texte | non | Provenance libre des valeurs (ex. `Ciqual 2025 — 9100`, `Open Food Facts — 3017620422003`). Ignoré par l'application. |

Le statut `Évalué` / `Aliment non évalué` n'est jamais lu dans le fichier : il est recalculé à l'import selon `RG-REF-04`. Les identifiants techniques, les bases courantes et les rattachements à des prises ou recettes ne sont ni exportés ni importés.

**JSON** : un objet racine avec un en-tête et la liste des aliments.

```json
{
  "format": "suivi-repas/aliments",
  "version": 1,
  "mandant": "REAL",
  "exporte_le": "2026-11-25T20:45:00Z",
  "aliments": [
    {
      "nom": "Riz basmati",
      "cuisinable": true,
      "rendement_cuisson": 2.5,
      "energie_kcal": 351, "glucides_g": 77.8, "sucres_g": 0.3, "lipides_g": 0.9,
      "acides_gras_satures_g": 0.2, "proteines_g": 8.1, "fibres_g": 1.6, "sel_g": 0.01,
      "index_glycemique": 58,
      "source": "Ciqual 2025"
    },
    {
      "nom": "Moutarde",
      "cuisinable": false,
      "energie_kcal": 151, "glucides_g": 3.5, "sucres_g": 2.4, "lipides_g": 11.3,
      "acides_gras_satures_g": 0.6, "proteines_g": 7.1, "fibres_g": null, "sel_g": 6.0,
      "index_glycemique": null
    }
  ]
}
```

**CSV** : encodage UTF-8 avec BOM, séparateur `;`, séparateur décimal `,` ou `.` accepté à l'import (`,` à l'export), booléens `oui` / `non` (`true` / `false` acceptés à l'import), une ligne d'en-tête reprenant les noms de champs ci-dessus, **une ligne par aliment**. Une cellule vide signifie « non renseigné ».

```
nom;cuisinable;rendement_cuisson;energie_kcal;glucides_g;sucres_g;lipides_g;acides_gras_satures_g;proteines_g;fibres_g;sel_g;index_glycemique;icone;non_evalue_manuel;archive;source
Riz basmati;oui;2,5;351;77,8;0,3;0,9;0,2;8,1;1,6;0,01;58;;non;non;Ciqual 2025
Moutarde;non;;151;3,5;2,4;11,3;0,6;7,1;;6;;;non;non;
```

**Nom du fichier exporté** : `aliments-<MANDANT>-<AAAA-MM-JJ>.json` ou `.csv`.

**Règles d'import** (prévisualisation avant écriture, `docs/03-ux-et-parcours.md` §5.5.5) :

- **Erreurs bloquantes par ligne** (la ligne est rejetée, les autres restent importables) : `nom` vide, `cuisinable` absent ou invalide, valeur non numérique ou négative, `index_glycemique` hors 0 à 150, `rendement_cuisson` nul, négatif ou renseigné avec `cuisinable = false`, deux lignes du fichier portant le même nom.
- **Doublons de nom avec un aliment existant** : choix explicite **Ignorer**, **Mettre à jour** ou **Créer** (avec possibilité d'appliquer le choix à tous les doublons).
- **Mise à jour** : seuls les champs renseignés dans le fichier remplacent les valeurs de l'aliment existant ; un champ vide ou absent laisse la valeur existante inchangée (un import ne peut donc pas effacer une valeur). Le changement de `cuisinable` sur un aliment déjà utilisé est rejeté (`RG-ETAT-05`).
- **Création** : les champs absents sont non renseignés.
- **Compte-rendu** : nombre d'aliments créés, mis à jour, ignorés, rejetés et `Non évalué`.

---

## 4. Politiques de Sécurité (RLS) et Configurations Requises Côté Supabase

### 4.1. Principes RLS obligatoires (`NFR-SUP-SEC-01`)

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` est activé sur toutes les tables exposées : `mandants`, `habilitations`, `utilisateurs_autorises` (sans aucune politique), `types_prise_alimentaire`, `aliments`, `recettes`, `compositions_recette`, `plats_prepares`, `prises_alimentaires`, `elements_prise_alimentaire`, `cibles_nutritionnelles`, `poids_reference`.
- L'accès est refusé par défaut au rôle `anon`.
- **Privilèges explicites** : les projets Supabase récents n'accordent aucun droit par défaut sur les nouvelles tables. Une migration accorde au seul rôle `authenticated` la lecture de `mandants` et `habilitations`, et la lecture / écriture des tables métier ; `anon` ne reçoit aucun droit, et `utilisateurs_autorises` reste inaccessible à tous les rôles de l'API.
- Fonction helper SQL `public.est_habilite_mandant(p_mandant_id uuid) returns boolean` (`SECURITY DEFINER`, `SET search_path = public`, droits d'exécution limités aux rôles requis) vérifiant :

```sql
exists (
  select 1
  from public.habilitations um
  join public.mandants m on m.id = um.mandant_id
  where um.user_id = auth.uid()
    and um.mandant_id = p_mandant_id
    and um.est_active = true
    and m.est_actif = true
)
```

- **Sur `habilitations`** : politique `SELECT` limitée à `user_id = auth.uid()` ; aucune politique `INSERT` / `UPDATE` / `DELETE` ouverte aux utilisateurs standard (les habilitations sont gérées par migration / seed ou par des privilèges d'administration contrôlés).
- **Sur `mandants`** : politique `SELECT` limitée aux mandants actifs pour lesquels l'utilisateur dispose d'une habilitation active (`exists (... habilitations ...)`).
- **Sur chaque table métier** (`types_prise_alimentaire`, `aliments`, `recettes`, `compositions_recette`, `plats_prepares`, `prises_alimentaires`, `elements_prise_alimentaire`, `cibles_nutritionnelles`, `poids_reference`) : les politiques `SELECT`, `INSERT`, `UPDATE`, `DELETE` exigent systématiquement `user_id = auth.uid()` **ET** `public.est_habilite_mandant(mandant_id)`.
- **`Mandant` actif** : la RLS garantit l'habilitation au mandant mais ne connaît pas le `Mandant` actif, mémorisé côté navigateur (`sessionStorage` pour l'onglet, `localStorage` pour le dernier `Mandant` de l'appareil, §5). Le filtrage par `Mandant` actif est appliqué systématiquement par les services (`mandant_id`), et les clés étrangères composites empêchent toute référence croisée entre mandants ou entre utilisateurs.

### 4.2. Configurations requises côté Supabase (hors code versionné)

Pour sécuriser l'ensemble du dispositif — l'accès aux données par utilisateur et par `Mandant`, ainsi que la maîtrise des personnes autorisées à utiliser le compte / projet Supabase — les configurations suivantes doivent être appliquées et vérifiées dans le projet Supabase :

1. **Maîtrise des personnes autorisées à utiliser l'application et le compte Supabase** :
   - **Accès au Dashboard Supabase / organisation** : limiter strictement l'accès au tableau de bord Supabase (ainsi qu'à la clé `service_role` et aux clés d'API d'administration) au seul compte administrateur propriétaire. Ne jamais partager la clé `service_role` ni l'intégrer au code frontend.
   - **Restriction d'accès aux comptes applicatifs (`RG-USR-01`, `RG-USR-02`)** : configurer Google OAuth dans Supabase Auth (Client ID et Client Secret Google configurés dans le Dashboard Supabase, jamais le Client Secret dans le dépôt Git). La liste des `Utilisateurs autorisés` est tenue exclusivement par l'administrateur dans la table `utilisateurs_autorises`, depuis le Dashboard. Tout compte Google absent de cette liste n'obtient aucune habilitation et se voit refuser tout accès par la RLS. Si le *hook* « before user created » est disponible dans l'offre gratuite, l'activer pour rejeter la création même de ces comptes.
   - **URLs de redirection et origines autorisées** : déclarer explicitement dans Supabase Auth (Site URL et Redirect URLs) et dans Google Cloud Console uniquement les origines autorisées (ex. URL locale de développement et URL de production HTTPS), sans wildcard permissif (`*`).
2. **Sécurisation de l'accès aux données par utilisateur et par `Mandant`** :
   - **Activation systématique de RLS** sur toutes les tables du schéma `public`, et vérification qu'aucune table sensible n'est laissée sans politique.
   - **Double verrou `auth.uid()` + `habilitations` (`REAL` / `TEST`)** : chaque table métier impose `user_id = auth.uid()` et l'appartenance active au `mandant_id` ciblé, empêchant toute lecture ou écriture croisée entre utilisateurs ou entre `REAL` et `TEST`.
   - **Surveillance des limites d'usage et de l'exposition publique** : la clé publique (`anon` / publishable) et l'URL Supabase étant visibles côté navigateur, conserver une RLS stricte, surveiller la consommation d'API / base / auth dans Supabase et maintenir le périmètre dans les limites de l'offre gratuite pour un usage personnel et familial restreint.

---

## 5. Authentification Google OAuth et Cycle de Vie du Mandant

1. **Sélection explicite à la première connexion (`RG-MND-02`, `F-AUTH-01`)** : sur l'écran `connexion` (première connexion sur l'appareil, après une déconnexion ou si le `Mandant` mémorisé n'est plus valide), l'utilisateur choisit explicitement `REAL` ou `TEST`. Aucun `Mandant` n'est présélectionné sur cet écran ni résolu par repli silencieux vers `REAL`.
2. **Stockage du `Mandant` et de la session (`RG-MND-02`, `F-AUTH-03`)** :
   - le `Mandant` actif d'un onglet est stocké dans `sessionStorage` (isolé par onglet, conservé durant la redirection Google OAuth) ;
   - le **dernier `Mandant` utilisé** est aussi stocké dans `localStorage` (partagé par les onglets, et par l'application installée sur Android). À l'ouverture d'un onglet sans `Mandant` en `sessionStorage`, si une session existe, ce `Mandant` est repris puis vérifié (point 3). Un changement de `Mandant` dans un onglet ne modifie pas les autres onglets déjà ouverts ;
   - la session Supabase (jeton d'accès et jeton de renouvellement) est conservée dans `localStorage` par la bibliothèque et renouvelée automatiquement ; l'application ne déconnecte jamais d'elle-même à la réouverture. Seuls la déconnexion volontaire, l'échec du renouvellement ou un compte sans habilitation ramènent à l'écran `connexion`.
3. **Retour OAuth et vérification d'habilitation (`RG-MND-03`, `F-AUTH-02`)** :
   - `auth.service.js` initialise et suit la session Supabase (`getSession`, `onAuthStateChange`, renouvellement de jeton, gestion des erreurs `401` / `403`).
   - `mandant.service.js` lit le `Mandant` dans `sessionStorage` (à défaut, le dernier `Mandant` dans `localStorage`) et vérifie via Supabase (`habilitations` + `mandants`) que l'utilisateur connecté est habilité sur ce `Mandant` et que celui-ci est actif.
   - Si la vérification échoue ou si aucun `Mandant` n'est mémorisé, l'accès aux données métier est bloqué et l'utilisateur est renvoyé vers la sélection explicite du `Mandant` ; le `Mandant` mémorisé invalide est effacé, la session Google est conservée si elle est valide.
   - Un compte authentifié sans aucune habilitation (absent de `utilisateurs_autorises`) reçoit un message explicite d'accès non autorisé et est déconnecté.
4. **Visibilité permanente et changement de `Mandant` (`RG-MND-04`, `F-AUTH-03`)** : le `Mandant` actif est affiché en permanence sur tous les écrans authentifiés. Un changement de `Mandant` (écran `configuration`) vérifie l'habilitation au `Mandant` cible, met à jour `sessionStorage` et `localStorage`, puis recharge entièrement l'application (rechargement de page) afin qu'aucun état du `Mandant` précédent ne subsiste ; la session Google est conservée. La **déconnexion** efface la session, `sessionStorage` et le `Mandant` mémorisé dans `localStorage`.
5. **Résilience réseau et erreurs (`F-AUTH-04`, `F-EDIT-05`, `NFR-SUP-REL-01`)** : toute lecture / écriture requiert une connexion réseau active. En cas d'erreur réseau, d'erreur Supabase ou de perte de contexte `Mandant` :
   - aucune réussite n'est affichée ;
   - un message clair est présenté ;
   - les données saisies à l'écran sont conservées.
6. **Session expirée pendant une saisie (`F-EDIT-05`)** : si le renouvellement du jeton échoue alors qu'une saisie de prise alimentaire est en cours, l'écran sérialise la saisie dans `sessionStorage` avec l'identifiant de l'utilisateur et le `Mandant` actif, puis lance la reconnexion Google. Au retour, la saisie n'est restaurée que si l'utilisateur et le `Mandant` sont identiques ; dans tous les cas, l'entrée est supprimée de `sessionStorage` immédiatement après lecture. Aucune autre donnée de saisie n'est stockée dans le navigateur.

---

## 6. Stratégie de Tests et Critères Techniques (`NFR-SUP-*`)

### 6.1. Organisation des tests par couche

- **Règles métier pures (`shared/utils/`) — `node --test`** : tests unitaires exécutés via le runner natif Node.js (`node --test`), couvrant :
  - les calculs nutritionnels en flottant (`RG-CAL-01` à `06`, pas d'arrondi intermédiaire, arrondi uniquement à l'affichage) ;
  - la conversion par le rendement de cuisson d'un aliment pesé cuit, la contribution `0` d'une pesée cuite sans rendement et la distinction `NULL` vs `0` (`RG-REF-03`, `RG-ETAT-01`, `RG-ETAT-02`, `RG-CAL-02`) ;
  - la lecture, la validation et la génération des fichiers d'import / export JSON et CSV (§3.8, `RG-REF-07`) ;
  - les fenêtres temporelles avec chevauchement et passage de minuit (`RG-TMP-03`, `RG-TMP-04`) ;
  - les 3 moteurs de suggestions (`RG-SUG-01` à `03`) ;
  - le positionnement par rapport aux cibles nutritionnelles, bornes incluses, plages ouvertes, cibles par kg selon la date d'effet du poids et cibles en pourcentage de la référence énergétique (`RG-CIB-02`, `RG-CIB-03`, `RG-CIB-06`).
- **Base de données, contraintes et RLS — Supabase CLI + pgTAP** : tests SQL exécutés via Supabase CLI sur une instance Supabase locale (poste de développement ou CI), jamais sur le projet de production, dont le `Mandant` `TEST` sert uniquement aux essais manuels, en ciblant exclusivement le `Mandant` `TEST` (échec explicite si `TEST` est absent ou indisponible, sans repli sur `REAL`). Ils vérifient :
  - l'activation de RLS ;
  - le refus à `anon` ;
  - l'isolation entre utilisateurs ;
  - l'isolation stricte `TEST` vs `REAL` ;
  - le refus de tout accès à un compte absent de `utilisateurs_autorises` et l'inaccessibilité de cette table ;
  - le refus des références croisées entre utilisateurs ou entre mandants (clés étrangères composites) ;
  - le type de prise obligatoire, l'unicité des priorités et du type par défaut ;
  - le refus de changer le caractère cuisinable d'un aliment utilisé, et l'acceptation d'un changement de rendement ;
  - la cohérence entre `etat_aliment` et le caractère cuisinable de l'aliment, et l'absence de rendement sur un aliment à état unique ;
  - la suppression physique avec conservation de l'historique (`Élément supprimé`, valeur `0`, avertissement) ;
  - les contraintes des cibles nutritionnelles (forme, base, bornes, énergie en valeur absolue) et l'unicité de `poids_reference` par date d'effet ;
  - la création des types de prise alimentaire et des cibles de départ à la première connexion, et la fonction de rétablissement des cibles de départ.
- **Services & UI mobile (`shared/services/`, `apps/mobile/`)** : tests ciblés des services sur les réponses en erreur, les refus d'accès et les coupures réseau (`NFR-SUP-REL-01`), complétés par des vérifications manuelles structurées sur mobile :
  - états chargement / vide / erreur / succès ;
  - conservation de la saisie en cas d'erreur ;
  - cibles tactiles ≥ 44×44 px ;
  - focus / libellés ;
  - `prefers-reduced-motion` ;
  - exigences de fluidité / rapidité.

### 6.2. Matrice des critères techniques (`NFR-SUP-*`)

| Identifiant | Exigence technique | Méthode de vérification |
|---|---|---|
| `NFR-SUP-SEC-01` | RLS activée sur toutes les tables exposées ; politiques alignées sur les opérations, `auth.uid()` et l'habilitation au `Mandant` ; aucun contournement par fonctions / vues. | Revue des migrations SQL + tests pgTAP (`anon`, autre utilisateur, `TEST` vs `REAL`). |
| `NFR-SUP-AUTH-01` | Cycle complet d'authentification (initialisation, Google OAuth, sélection préalable du `Mandant`, déconnexion, renouvellement / expiration, erreurs) sans fuite de jeton ni fausse session active. | Tests ciblés de `auth.service.js` et `mandant.service.js` sur sessions absentes, valides, expirées et en erreur. |
| `NFR-SUP-REL-01` | Vérification systématique des erreurs Supabase et des erreurs réseau ; jamais de fausse réussite ; préservation des saisies utilisateur. | Tests ciblés des services en erreur / refus / réseau + scénarios de coupure réseau en saisie. |
| `NFR-SUP-MAINT-01` | Toute évolution de schéma, de contrainte ou de RLS passe par une nouvelle migration versionnée dans `supabase/migrations/`, sans réécrire l'historique appliqué. | Inspection des migrations + réinitialisation / application locale via Supabase CLI. |
