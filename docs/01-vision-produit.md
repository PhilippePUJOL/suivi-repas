# Vision Produit — Suivi Nutritionnel Personnel

## 1. Contexte, Problème et Proposition de Valeur

* **Problème identifié** : Suivre quotidiennement sa consommation énergétique et nutritionnelle de façon simple, rapide et fiable depuis un smartphone est souvent freiné par des outils lourds, intrusifs ou rigides (saisie bloquée lorsqu'un aliment manque dans le référentiel, catégories horaires trop strictes, dispersion des données personnelles de santé).
* **Proposition de valeur** : Offrir une application web installable (PWA) personnelle permettant de consigner en quelques secondes ses prises alimentaires, d'obtenir immédiatement des agrégats nutritionnels fiables (en permettant de peser un aliment cru ou cuit grâce à son rendement de cuisson, et en distinguant les recettes maison des plats préparés), sans jamais bloquer la saisie grâce aux aliments non évalués, tout en conservant la maîtrise et la confidentialité de ses données.

---

## 2. Cible Utilisateur et Cas d'Usage Principaux

* **Utilisateur cible** : Usage personnel, ouvert à quelques proches désignés comme utilisateurs autorisés, chacun disposant de ses propres données cloisonnées, souhaitant piloter son alimentation au quotidien avec un minimum de friction lors de la saisie sur smartphone et une capacité d'analyse détaillée de ses apports.
* **Grands cas d'usage du socle (MVP)** :
  1. **S'authentifier de manière sécurisée** via son compte Google, à condition de figurer dans la liste des utilisateurs autorisés, pour accéder à son espace personnel.
  2. **Enregistrer et modifier rapidement une prise alimentaire** à une date et une heure données, obligatoirement qualifiée par un type de prise alimentaire suggéré selon la fenêtre temporelle (ou, à défaut, le type par défaut) mais librement modifiable.
  3. **Composer une prise alimentaire sans friction** à partir d'éléments de prise alimentaire (aliments, recettes, plats préparés), avec saisie des portions (grammage, pourcentage ou part divisible), indication, pour un aliment cuisinable, de l'état d'un aliment à la pesée (cru ou cuit), ajout d'une note libre et création à la volée d'un aliment non évalué si nécessaire.
  4. **Consulter les métriques nutritionnelles et analyser le détail** via un écran d'accueil recentré sur les agrégats nutritionnels (journée, semaine calendaire, 7 derniers jours glissants), situés par rapport à ses cibles nutritionnelles, et un accès dédié au journal des prises alimentaires et à leur composition détaillée.
  5. **Gérer et enrichir son référentiel alimentaire** : créer, éditer, importer ou exporter sa table d'aliments, compléter a posteriori les valeurs nutritionnelles des aliments non évalués, et définir ses recettes et plats préparés.
  6. **Paramétrer son usage** : types de prise alimentaire et fenêtres temporelles, bases courantes, cibles nutritionnelles et poids de référence.

---

## 3. Périmètre du Produit : Socle (MVP) vs Évolutions (V2+)

### 3.1. Inclus dans le Socle (MVP)

* **Expérience Mobile-first (PWA)** : Application pensée en priorité pour la saisie tactile rapide sur smartphone (navigation basse, suggestions contextuelles liées au type de prise alimentaire et à l'historique), avec une séparation claire entre l'écran d'accueil (recentré sur les métriques nutritionnelles) et le journal dédié à la gestion des prises alimentaires.
* **Qualification temporelle souple** : Types de prise alimentaire ouverts et évolutifs associés à des fenêtres temporelles indicatives (pouvant se chevaucher et disposant d'une priorité de proposition par défaut selon l'horaire) sans contraindre le choix de l'utilisateur.
* **Modèle nutritionnel conforme au dictionnaire métier** :
  * Gestion des **aliments** (porteurs d'un seul jeu de valeurs nutritionnelles aux 100 g ; un *aliment cuisinable* porte ses valeurs à l'état cru et un *rendement de cuisson* (poids cuit = poids cru × rendement), ce qui permet de le peser **cru** ou **cuit** ; un *aliment à état unique*, comme la moutarde, est pesé sans mention de cru ou de cuit), des **recettes** (composition d'aliments pesés avec calcul en proportion de la portion consommée) et des **plats préparés** (valeurs nutritionnelles saisies directement, aux 100 g ou pour le plat entier, sans composition détaillée).
  * Gestion des **aliments non évalués** : création à la volée lors d'une prise alimentaire sans bloquer la saisie, signalement explicite lorsque des valeurs nutritionnelles sont incomplètes dans un calcul, et gestion dédiée pour compléter leurs valeurs nutritionnelles a posteriori.
  * Ajout de **notes libres** non interprétées pour préciser le contexte ou la nature de préparation/cuisson.
* **Grandeurs nutritionnelles suivies (strictement alignées sur le dictionnaire)** :
  * Énergie (kcal), glucides (dont sucres), lipides (dont acides gras saturés), protéines, fibres et sel.
  * Index glycémique (renseigné au niveau des aliments).
  * Affichage des valeurs brutes et des **agrégats nutritionnels** (par prise alimentaire, journée, semaine calendaire, période glissante de 7 jours), chaque grandeur pouvant être située visuellement par rapport à une **cible nutritionnelle** définie par l'utilisateur : fixe, rapportée à son poids de référence ou à la référence énergétique, avec des cibles de départ modifiables.
* **Accélérateurs de saisie** : Suggestions rapides d'éléments de prise alimentaire et de portions basées sur le type de prise alimentaire et l'historique, duplication de prises alimentaires récentes et accès rapide aux bases courantes.
* **Isolation stricte des données par `Mandant`** : Toutes les données sont rattachées à un utilisateur autorisé et à un `Mandant` unique (`REAL` pour l'usage réel, `TEST` pour les essais), choisi explicitement à la première connexion, mémorisé ensuite sur l'appareil, modifiable une fois connecté et visible en permanence, sans aucun mélange entre mandants ni partage entre utilisateurs.


### 3.2. Orientations Futures & Backlog (V2+ — Hors MVP)

* **Dépense énergétique et intégration Garmin** : Prise en compte de la **dépense énergétique** journalière (de minuit à minuit, somme du **métabolisme de base (BMR)** et des **calories actives**) mise en regard des apports et devenant la *référence énergétique* des cibles nutritionnelles, avec récupération automatisée depuis Garmin Connect (aucune saisie manuelle de dépense énergétique n'est intégrée dans le MVP).
* **Répartition des apports en pourcentages** : Affichage de la part de chaque grandeur dans l'énergie consommée (les cibles nutritionnelles, y compris celles définies en pourcentage de la référence énergétique, relèvent du MVP et ne s'affichent qu'en écart en unités).
* **Expérience Desktop (PWA ordinateur)** : Déclinaison dédiée aux grands écrans (navigation multi-colonnes maître-détail, productivité clavier/souris, vues analytiques étendues) partageant le même cœur métier et la même persistance.
* **Sauvegarde et export complets** : Export de l'ensemble des données d'un utilisateur (recettes, plats préparés, prises alimentaires, configuration), au-delà de la seule table d'aliments couverte par le MVP.
* **Aide à la saisie par caméra / OCR** : Extraction assistée des valeurs nutritionnelles depuis une étiquette produit via la caméra du smartphone et reconnaissance optique locale sans coût d'API (ex. Tesseract.js et expressions régulières).

### 3.3. Exclusions Explicites

* **Cible calorique dynamique** : Notion définitivement écartée du modèle métier ; en V2, la dépense énergétique du jour sert directement de référence énergétique, sans notion distincte.
* **Recette hybride** : Notion écartée ; tout élément composé ou préparé est soit une *recette* (composée d'aliments identifiés, évalués ou non), soit un *plat préparé* (valeurs saisies directement, aux 100 g ou pour le plat entier).
* **Stockage sur Google Drive** : Piste abandonnée.
* **Services externes alimentaires et scan de codes-barres** : Aucune interrogation d'API tierce (Open Food Facts, USDA, etc.) ni lecture de codes-barres depuis l'application. La préparation d'un fichier d'import de la table d'aliments à partir de sources externes (Ciqual, Open Food Facts) relève d'un outil séparé, hors de l'application, qui produit un fichier au format d'import standard (`RG-REF-07`).
* **Fonctions sociales, partage ou coaching** : Pas de partage de données entre utilisateurs, pas d'inscription libre (seuls les utilisateurs autorisés par l'administrateur accèdent à l'application), pas de recommandations médicales ou de coaching automatisé.
* **Mode hors ligne** : Aucune saisie ni synchronisation hors ligne ; une connexion réseau active est requise pour lire et enregistrer les données.

---

## 4. Principes Directeurs et Contraintes Structurantes

* **Langage ubiquitaire strict** : L'ensemble du produit, de la documentation et du code respecte exclusivement la terminologie du dictionnaire métier (`docs/00-dictionnaire-metier.md`).
* **Socle technique retenu** : Application web légère en **JavaScript vanilla (HTML, CSS, modules ES)** s'appuyant sur **Supabase** (base de données PostgreSQL avec politiques de sécurité au niveau des lignes / RLS) et **Google OAuth** pour l'authentification.
* **Séparation cœur métier / interfaces** : La logique nutritionnelle et l'accès aux données sont mutualisés et indépendants de l'interface afin de préparer l'arrivée ultérieure de l'expérience Desktop sans duplication.
* **Gouvernance, sécurité et coût** :
  * Hébergement et fonctionnement à **coût nul (0 €)** dans les limites des offres gratuites retenues pour un usage personnel et familial restreint.
  * Protection des données personnelles de santé : hébergement des données en région européenne, cloisonnement strict des données par utilisateur autorisé et absence de secrets exposés dans le navigateur.
* **Résilience et transparence de l'information** : Aucune perte silencieuse de saisie en cas d'erreur réseau, et signalement explicite lorsqu'un agrégat nutritionnel intègre au moins un aliment non évalué, un élément partiellement évalué ou un élément supprimé.


---

## 5. Documentation de Référence

Chaque document porte un rôle unique ; une information n'est écrite qu'à un seul endroit et les autres documents y renvoient.

| Document | Rôle |
| :--- | :--- |
| `docs/00-dictionnaire-metier.md` | Langage ubiquitaire : définitions, périmètres et synonymes proscrits. |
| `docs/01-vision-produit.md` | Problème, cible, périmètre MVP, évolutions V2+, exclusions et principes directeurs. |
| `docs/02-specs-fonctionnelles.md` | Règles de gestion (`RG-*`), fonctionnalités par écran (`F-*`) et critères d'acceptation (`CA-*`). |
| `docs/03-ux-et-parcours.md` | Navigation, écrans, briques d'interface, parcours, états d'interface et arbitrages d'ergonomie. |
| `docs/04-specs-techniques.md` | Architecture, dépôt, modèle de données, RLS, authentification, tests et critères `NFR-SUP-*`. |
| `docs/XX-idees-et-backlog.md` | Idées en vrac ; jamais une source de vérité, considéré uniquement sur mention explicite. |

**Hiérarchie en cas de divergence** : `00` > `01` > `02` > `03` > `04`. Un document de rang inférieur ne modifie jamais une règle d'un document de rang supérieur ; toute divergence constatée est corrigée dans le document fautif.
