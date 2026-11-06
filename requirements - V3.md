# Définition du Besoin — Suivi Nutritionnel Personnel (PWA) — V3

## 1. Contexte et Problème
- **Problème identifié** : Difficulté à suivre sa consommation calorique et nutritionnelle quotidienne de manière simple, rapide et autonome depuis son smartphone, sans dépendre de services tiers payants ou exposer ses données personnelles de santé.
- **Impact** : Manque de visibilité sur ses apports réels (calories, macronutriments, micronutriments, index glycémique) et absence de contrôle direct sur la confidentialité et le stockage de ses données.
- **Objectif global** : Offrir une Progressive Web App (PWA) mobile permettant de consigner ses repas, d'estimer automatiquement les valeurs nutritionnelles via une table locale éditable et la gestion de recettes/plats préparés, tout en conservant le stockage des données sur son Google Drive personnel.

## 2. Utilisateurs et Cas d'Usage
- **Personas principaux** :
  - *L'utilisateur unique (Particulier)* : Souhaite enregistrer très rapidement (en quelques secondes) ses prises alimentaires au fil de la journée et visualiser ses bilans nutritionnels quotidiens.
- **Cas d'usage principal (Core User Journey)** :
  1. L'utilisateur ouvre la PWA sur son smartphone (authentification via Google OAuth client-side).
  2. Il enregistre une nouvelle prise alimentaire : la date et l'heure (pré-remplies) déterminent automatiquement la plage horaire concernée.
  3. L'application lui suggère intelligemment les aliments/recettes et grammages les plus pertinents pour cette tranche horaire.
  4. Il compose son repas/collation en sélectionnant des ingrédients, des recettes (avec prorata de consommation) ou des plats préparés. Pour chaque ingrédient, il indique le grammage ainsi que l'état (**cru** ou **cuit**).
  5. L'application calcule et affiche l'estimation nutritionnelle instantanée.
  6. Il valide l'entrée, enregistrée sous forme de fichier JSON structuré sur son Google Drive.
  7. Il consulte les synthèses caloriques et nutritionnelles journalières avec possibilité d'explorer (*deep dive*) les détails par repas et par ingrédient.


## 3. Périmètre du Projet (Scope)

### In-Scope (Inclus)
- **Interface & Compatibilité** :
  - Progressive Web App (PWA) responsive, optimisée pour smartphone (notamment Android).
- **Saisie & Suggestions Intelligentes (Accélération du Workflow)** :
  - Découpage automatique en 6 fenêtres temporelles :
    - *Petit déjeuner* (5h-10h)
    - *Collation matinale* (10h-11h30)
    - *Déjeuner* (11h30-14h30)
    - *Collation après-midi* (14h30-19h)
    - *Dîner* (19h-23h)
    - *Collation nocturne* (23h-5h)
  - Moteur de propositions rapides découplé mais cohérent :
    - Suggestions d'aliments/recettes basées sur l'historique de la fenêtre temporelle courante.
    - Suggestions de grammages associées (3 derniers grammages + 2 plus fréquents ; bascule sur les 5 plus fréquents en cas de doublons/recouvrement, max 5 propositions uniques).
- **Gestion des Recettes & Prorata** :
  - Déclaration de recettes comportant une liste d'ingrédients (avec spécification du grammage et de la valeur prise **cru** ou **cuit**) et optionnellement un poids total net.
  - Calcul automatique des valeurs nutritionnelles par ingrédient.
  - Consommation d'une recette lors d'un repas :
    - Déclaration par **pourcentage** de la recette.
    - Déclaration par **poids** (uniquement si le poids total de la recette est renseigné).
    - Calcul des apports consommés au prorata (pourcentage ou poids/poids total).
- **Gestion des Plats Préparés & Recettes Hybrides** :
  - Création/saisie de recettes ou plats sous 2 modes :
    - *Mode Calculé* : Ingrédients renseignés avec quantité et valeur prise **cru** ou **cuit** $\rightarrow$ valeurs nutritionnelles déduites.
    - *Mode Plat Préparé / Renseignement direct* : Valeurs nutritionnelles renseignées directement au niveau de la recette/du plat, avec liste d'ingrédients facultative (sans quantités associées et sans impact sur le calcul nutritionnel).
- **Moteur Nutritionnel & Table d'Aliments** :
  - Table d'aliments locale et prédéfinie intégrant :
    - *Macronutriments & Énergie* : Protéines, Glucides (dont sucres), Lipides (dont acides gras saturés), Fibres, Sel/Sodium, Calories.
    - *Micronutriments* : Vitamines, Minéraux (Calcium, Fer, Magnésium, Potassium, etc.).
    - *Index Glycémique (IG)*.
  - **Prise en compte du statut Cru / Cuit** :
    - Notification obligatoire si les valeurs sont prises **cru** ou **cuit** lors de :
      1. La déclaration des ingrédients supportant les valeurs nutritionnelles dans la table d'aliments.
      2. La déclaration de repas / collation.
      3. La déclaration de recette.
  - Fonctionnalités d'édition, d'importation et d'exportation de la table d'aliments.
  - Calcul et affichage des agrégations nutritionnelles au niveau du plat, du repas/collation et de la journée.
- **Visualisation & Historique** :
  - Vue synthétique des calories par jour.
  - Fonctionnalité de *deep dive* par jour et par repas/collation pour analyser le détail des apports.
- **Stockage & Configuration** :
  - Connexion sécurisée via *Google OAuth client-side* (pas de serveur backend, aucune clé API ni mot de passe sensible à gérer).
  - Écran de configuration (*Settings*) pour paramétrer le dossier racine (*database*) dans Google Drive et les chemins relatifs des fichiers JSON.


### Out-of-Scope (Exclu)
- Authentification propriétaire (nom d'utilisateur / mot de passe) ou base de données distante hébergée chez un tiers.
- Intégration d'API externes d'aliments (Open Food Facts, USDA, etc.) pour la v1.
- Scan de codes-barres.
- Définition d'objectifs nutritionnels, alertes, coaching ou suivi du poids / activités physiques.
- Fonctions communautaires, multi-utilisateurs ou de partage.

## 4. Critères de Succès & Contraintes
- **KPIs / Métriques** :
  - Temps de saisie d'un repas rapide : moins de 30 secondes.
  - Coût d'hébergement et de maintenance : 0 € (solution 100% *Client-Side*).
  - Contrôle total et souveraineté des données par l'utilisateur via son stockage Google Drive personnel.
- **Contraintes techniques / Métier** :
  - Architecture *Client-Only* (PWA HTML/JS/CSS).
  - Dépendance à l'API Google Drive client-side (nécessite un accès réseau pour la synchronisation).
- **Hypothèses clés** :
  - L'utilisateur possède un compte Google actif et un espace Google Drive.
  - La table d'aliments de départ est modifiable et exportable pour s'adapter facilement aux habitudes alimentaires de l'utilisateur.