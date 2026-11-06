# Définition du Besoin — Suivi Nutritionnel Personnel (PWA)

## 1. Contexte et Problème
- **Problème identifié** : Difficulté à suivre sa consommation calorique et nutritionnelle quotidienne de manière simple, rapide et autonome depuis son smartphone, sans dépendre de services tiers payants ou exposer ses données personnelles de santé.
- **Impact** : Manque de visibilité sur ses apports réels (calories, macronutriments, micronutriments, index glycémique) et absence de contrôle direct sur la confidentialité et le stockage de ses données.
- **Objectif global** : Offrir une Progressive Web App (PWA) mobile permettant de consigner ses repas, d'estimer automatiquement les valeurs nutritionnelles via une table locale éditable, et de consulter des agrégations détaillées stockées directement sur son Google Drive personnel.

## 2. Utilisateurs et Cas d'Usage
- **Personas principaux** :
  - *L'utilisateur unique (Particulier)* : Souhaite enregistrer rapidement ses prises alimentaires sur son téléphone au fil de la journée et visualiser ses bilans nutritionnels quotidiens.
- **Cas d'usage principal (Core User Journey)** :
  1. L'utilisateur ouvre la PWA sur son smartphone (authentification via Google OAuth client-side).
  2. Il enregistre une nouvelle prise alimentaire : la date (par défaut *aujourd'hui*) et l'heure (par défaut *l'heure actuelle*) sont pré-remplies.
  3. Il compose la collation/repas en sélectionnant des plats et/ou des ingrédients assortis de leur grammage.
  4. L'application calcule et affiche l'estimation nutritionnelle instantanée.
  5. Il valide l'entrée, qui est enregistrée sous forme de fichier JSON structuré dans son Google Drive.
  6. Il consulte les synthèses caloriques et nutritionnelles journalières avec possibilité d'explorer (*deep dive*) les détails par repas et par ingrédient.

## 3. Périmètre du Projet (Scope)

### In-Scope (Inclus)
- **Interface & Compatibilité** :
  - Progressive Web App (PWA) responsive, optimisée pour smartphone (notamment Android).
- **Saisie & Gestion des Données** :
  - Ajout, modification et suppression des prises alimentaires (date, heure, composition : plats, ingrédients, grammage).
- **Moteur Nutritionnel & Table d'Aliments** :
  - Table d'aliments locale et prédéfinie intégrant :
    - *Macronutriments & Énergie* : Protéines, Glucides (dont sucres), Lipides (dont acides gras saturés), Fibres, Sel/Sodium, Calories.
    - *Micronutriments* : Vitamines, Minéraux (Calcium, Fer, Magnésium, Potassium, etc.).
    - *Index Glycémique (IG)*.
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