# Dictionnaire métier — Suivi nutritionnel

### Prise alimentaire
- **Définition** : Fait de consommer un ou plusieurs éléments de prise alimentaire (aliments, recettes ou plats préparés) à une date et une heure données, enregistré dans le suivi de consommation. Elle est obligatoirement qualifiée par un et un seul type de prise alimentaire.
- **Périmètre / Exclusions** : Couvre aussi bien une prise structurée (ex. *Déjeuner*) qu'une prise légère (ex. *Goûter*) ou toute autre prise enregistrée à un instant donné. Ne désigne pas la catégorie (*type de prise alimentaire*), la plage horaire de référence (*fenêtre temporelle*) ni l'*agrégat nutritionnel*.
- **Synonymes proscrits** : *Repas*, *Collation*, *Entrée*.

### Type de prise alimentaire
- **Définition** : Catégorie qualificative ouverte et évolutive rattachée à une prise alimentaire (ex. *Petit déjeuner*, *Collation matinale*, *Déjeuner*, *Goûter*, *Apéritif*, *Dîner*, *Veillée*, *Collation nocturne*). Elle sert à qualifier la prise et à orienter les propositions et sélections rapides.
- **Périmètre / Exclusions** : N'est pas une liste figée ni une contrainte horaire rigide. Chaque type porte un rang de *priorité* et un seul type est désigné comme *type par défaut*. N'est pas synonyme de *fenêtre temporelle*. Ne désigne pas l'enregistrement de consommation lui-même (*prise alimentaire*).
- **Synonymes proscrits** : *Fenêtre temporelle*, *Type de repas*.

### Fenêtre temporelle
- **Définition** : Plage horaire définie par une heure de début et une heure de fin, associée à un type de prise alimentaire pour faciliter l'ergonomie et les suggestions selon l'heure choisie.
- **Périmètre / Exclusions** : L'heure de début est incluse et l'heure de fin exclue ; une fenêtre peut traverser minuit, et ses heures de début et de fin ne peuvent pas être identiques. Ne restreint pas la sélection d'un type de prise alimentaire et n'impose pas d'exclusivité ni d'absence de chevauchement entre fenêtres de différents types. Ne correspond pas à l'heure effective de consommation d'une prise alimentaire ni à la catégorie elle-même (*type de prise alimentaire*).
- **Synonymes proscrits** : *Type de prise alimentaire*, *Type de repas*.

### Aliment
- **Définition** : Élément alimentaire de référence figurant dans la table d'aliments, porteur de valeurs nutritionnelles (notamment aux 100 g) et pouvant être rattaché à une prise alimentaire ou entrer dans la composition d'une recette.
- **Périmètre / Exclusions** : Désigne l'unité de base de la table d'aliments (y compris les matières grasses ou bases courantes lorsqu'elles sont saisies comme aliments). Ne désigne pas une *recette* ni un *plat préparé* pris dans son ensemble.
- **Synonymes proscrits** : *Ingrédient*.

### Aliment non évalué
- **Définition** : Aliment dont au moins une valeur nutritionnelle requise n'est pas renseignée (ou, pour un *aliment cuisinable*, dont le *rendement de cuisson* n'est pas renseigné), ou que l'utilisateur a marqué manuellement comme tel (ex. estimation provisoire à vérifier). Il est typiquement créé à la volée lors de la saisie d'une prise alimentaire.
- **Périmètre / Exclusions** : Permet de ne jamais bloquer la saisie d'une prise alimentaire lorsqu'un aliment ou certaines de ses valeurs manquent. Les valeurs requises sont les 9 grandeurs des *valeurs nutritionnelles* ; l'index glycémique n'est pas requis lorsque les glucides sont renseignés à `0`. Une valeur non renseignée est distincte d'une valeur égale à `0`. Ne désigne pas un aliment *évalué*.
- **Synonymes proscrits** : *Aliment incomplet*, *Brouillon d'aliment*.

### Note libre
- **Définition** : Mention textuelle non interprétée par le système permettant d'ajouter des précisions contextuelles ou sur la nature de préparation/cuisson (ex. *poêlé*, *fait maison*, *croustillant*).
- **Périmètre / Exclusions** : Information descriptive libre, sans interprétation métier ni calcul nutritionnel associé. Ne se substitue pas à l'*état d'un aliment* lors de la pesée pour relier les valeurs nutritionnelles.
- **Synonymes proscrits** : *Statut de cuisson*, *État d'un aliment*.

### Élément de prise alimentaire
- **Définition** : Terme générique désignant tout ce qui peut être rattaché à une prise alimentaire et supporte des valeurs nutritionnelles : un **aliment**, une **recette** ou un **plat préparé**.
- **Périmètre / Exclusions** : Couvre uniquement ce qui est rattachable à une prise alimentaire avec des valeurs nutritionnelles. Ne désigne pas la prise alimentaire elle-même ni l'*agrégat nutritionnel*.
- **Synonymes proscrits** : *Composant*, *Ingrédient*.

### Recette
- **Définition** : Composition issue d'un travail en cuisine regroupant des aliments identifiés (chacun avec son poids et, pour un *aliment cuisinable*, son *état d'un aliment* à la pesée : Cru ou Cuit), associée facultativement à un *poids total net* et à des valeurs nutritionnelles portant sur l'ensemble de la recette, calculées à partir de ses aliments.
- **Périmètre / Exclusions** : Repose sur une composition connue d'aliments, contrairement au *plat préparé*. Peut contenir des aliments non évalués (elle est alors un *élément partiellement évalué*). Ne porte pas d'*état d'un aliment* propre et n'inclut pas de notion de *recette hybride*.
- **Synonymes proscrits** : *Recette hybride*, *Plat préparé*.

### Plat préparé
- **Définition** : Élément tout prêt dont les valeurs nutritionnelles sont fournies directement, soit aux 100 g (son *poids total* devant alors être renseigné), soit pour le plat entier, sans que la composition détaillée en aliments soit connue ou utilisée pour le calcul.
- **Périmètre / Exclusions** : Ne repose pas sur une liste d'aliments calculée et ne porte ni *état d'un aliment* ni index glycémique. Ne désigne pas une *recette* construite à partir d'aliments.
- **Synonymes proscrits** : *Recette*, *Recette hybride*.

### Portion
- **Définition** : Quantité consommée d'un élément de prise alimentaire, exprimée en grammage pour un aliment ; en pourcentage ou en part divisible (ex. `1/4`, `1/15`) pour une recette ou un plat préparé, sans qu'aucun poids soit nécessaire ; ou en grammage pour une recette ou un plat préparé uniquement lorsque son poids total est connu. Une portion peut dépasser 100 % ou une part entière (ex. `150 %`, `3/2`).
- **Périmètre / Exclusions** : Représente la quantité rattachée à une prise alimentaire donnée. Ne désigne pas l'élément de référence lui-même ni la valeur nutritionnelle globale d'une recette complète.
- **Synonymes proscrits** : *Prorata*.

### Valeurs nutritionnelles
- **Définition** : Ensemble des grandeurs nutritives associées à un élément ou une prise alimentaire : énergie/calories, glucides (dont sucres), lipides (dont acides gras saturés), protéines, fibres et sel. L'index glycémique est inclus pour les aliments uniquement.
- **Périmètre / Exclusions** : Couvre les grandeurs unitaires ou calculées d'un aliment, d'une recette, d'un plat préparé ou d'une prise alimentaire. Ne désigne ni la somme consolidée multi-niveaux (*agrégat nutritionnel*) ni la *dépense énergétique*.
- **Synonymes proscrits** : *Nutriments*, *Macros*.

### Agrégat nutritionnel
- **Définition** : Consolidation (somme) des valeurs nutritionnelles des éléments de prise alimentaire calculée à différents niveaux d'analyse (prise alimentaire, journée, semaine calendaire du lundi au dimanche, période glissante comme les 7 derniers jours, etc.). L'index glycémique n'est jamais agrégé.
- **Périmètre / Exclusions** : Couvre les métriques nutritionnelles consolidées sur un périmètre donné. Il est signalé comme incomplet lorsqu'il intègre au moins un aliment non évalué, un *élément partiellement évalué* ou un *élément supprimé*. Ne désigne ni un élément de prise alimentaire isolé ni une *dépense énergétique*.
- **Synonymes proscrits** : *Bilan*.

### Cible nutritionnelle
- **Définition** : Repère journalier défini par l'utilisateur pour une grandeur des valeurs nutritionnelles (hors index glycémique), exprimé soit par une **valeur cible** unique, soit par une **plage cible** bornée par une valeur basse, une valeur haute ou les deux. Sa définition peut être absolue (dans l'unité de la grandeur) ou relative à une variable : le *poids de référence* (ex. protéines de `1,6` à `2` g par kg) ou la *référence énergétique* (ex. lipides de `25` à `35` % des kcal). Elle permet de situer visuellement l'agrégat nutritionnel d'une journée par rapport à ce repère.
- **Périmètre / Exclusions** : Facultative et définie grandeur par grandeur, par utilisateur et par mandant. Sa définition vaut pour toutes les journées ; la valeur effective d'une cible relative dépend de la valeur de la variable applicable à chaque journée. Elle est indicative et ne constitue pas une recommandation médicale. Ne désigne ni l'*agrégat nutritionnel* ni la *dépense énergétique*.
- **Synonymes proscrits** : *Objectif*, *Quota*, *Cible calorique dynamique*.

### Poids de référence
- **Définition** : Poids corporel de l'utilisateur, en kilogrammes, servant à calculer les *cibles nutritionnelles* rapportées au poids. Chaque valeur est enregistrée avec une **date d'effet**.
- **Périmètre / Exclusions** : Historisé par utilisateur et par mandant, contrairement à la définition des *cibles nutritionnelles*. Ne désigne ni le *poids total* d'une recette ou d'un plat préparé, ni le poids consommé d'une *portion*.
- **Synonymes proscrits** : *Poids total*, *Poids unitaire*.

### Référence énergétique
- **Définition** : Énergie journalière (en kcal) servant de base aux *cibles nutritionnelles* exprimées en pourcentage de l'énergie (ex. lipides de `25` à `35` % de la référence énergétique).
- **Périmètre / Exclusions** : Dans le MVP, c'est la valeur cible d'énergie définie par l'utilisateur. À partir de la V2, ce sera la *dépense énergétique* de la journée. Ne désigne ni l'énergie consommée (*agrégat nutritionnel*) ni une *cible calorique dynamique*.
- **Synonymes proscrits** : *Cible calorique dynamique*, *Besoin calorique*.

### Dépense énergétique
- **Définition** : Quantité d'énergie dépensée exprimée en kilocalories (kcal), mise en regard des valeurs nutritionnelles des prises alimentaires sur une période (journée, semaine, mois, etc.). Sur une journée (de minuit à minuit), elle correspond à la somme du métabolisme de base (BMR) et des calories actives.
- **Périmètre / Exclusions** : Représente la dépense calorique observée ou consolidée sur la période considérée. Ne désigne ni les apports des prises alimentaires (*valeurs nutritionnelles* / *agrégat nutritionnel*) ni une *cible calorique dynamique* (notion écartée).
- **Synonymes proscrits** : *Cible calorique dynamique*, *Calories brûlées*.

### Métabolisme de base (BMR)
- **Définition** : Part de la dépense énergétique journalière (en kcal, de minuit à minuit) correspondant aux besoins énergétiques de base au repos, additionnée aux calories actives pour former la dépense énergétique journalière.
- **Périmètre / Exclusions** : Constitue l'une des deux composantes de la dépense énergétique journalière. N'inclut pas les *calories actives* issues d'activités physiques.
- **Synonymes proscrits** : *Calories actives*.

### Calories actives
- **Définition** : Part de la dépense énergétique journalière (en kcal, de minuit à minuit) issue des activités physiques, additionnée au métabolisme de base (BMR) pour former la dépense énergétique journalière.
- **Périmètre / Exclusions** : Couvre uniquement l'énergie liée aux activités physiques sur la journée. Ne désigne pas le *métabolisme de base (BMR)* ni la *dépense énergétique* totale.
- **Synonymes proscrits** : *Métabolisme de base*, *BMR*.

### Mandant
- **Définition** : Contexte d'isolation de données identifié de façon unique, classé selon sa finalité (par exemple `REAL` pour l'usage réel et `TEST` pour les essais et tests automatisés). Toutes les données fonctionnelles et référentielles appartiennent à un et un seul utilisateur et à un et un seul mandant.
- **Périmètre / Exclusions** : Choisi explicitement lors de la première connexion sur un appareil (ou après une déconnexion) ; le dernier mandant utilisé est ensuite mémorisé sur l'appareil et rouvert automatiquement, et l'utilisateur peut en changer une fois connecté. Un seul mandant est actif à la fois, sans mélange de données entre contextes. Ne remplace ni l'authentification ni les *habilitations* de l'utilisateur. Plusieurs *utilisateurs autorisés* peuvent accéder à un même mandant, chacun avec ses propres données (table d'aliments incluse), sans aucun partage entre utilisateurs.
- **Synonymes proscrits** : *MANDT*, *Client*, *Environnement*.

### Aliment cuisinable
- **Définition** : Aliment dont les valeurs nutritionnelles sont renseignées une seule fois, à l'état **cru** (ou sec, tel qu'acheté), et qui peut être pesé **cru** ou **cuit** ; les valeurs de l'état cuit sont déduites des valeurs crues par son *rendement de cuisson* (ex. *riz*, *lentilles*, *filet de poulet*).
- **Périmètre / Exclusions** : S'oppose à l'*aliment à état unique*. Une préparation qui modifie réellement la composition (friture, confit, panure) n'est pas modélisée par un rendement : elle constitue un aliment à part entière (ex. *frites*, *cuisse de canard confite*).
- **Synonymes proscrits** : *Aliment cru/cuit*, *Aliment à deux états*.

### Aliment à état unique
- **Définition** : Aliment pesé et consommé dans un seul état, sans mention de cru ou de cuit (ex. *moutarde*, *huile*, *miel*, *yaourt*) ; ses valeurs nutritionnelles s'appliquent telles quelles au poids pesé.
- **Périmètre / Exclusions** : Ne porte ni *état d'un aliment* ni *rendement de cuisson*. Un aliment connu seulement à l'état cuit et toujours pesé ainsi (ex. *saucisse cuite* achetée cuite) peut être déclaré à état unique.
- **Synonymes proscrits** : *Aliment NA*, *Non applicable*.

### Rendement de cuisson
- **Définition** : Rapport, propre à un *aliment cuisinable*, entre le poids de l'aliment cuit et son poids cru : **poids cuit = poids cru × rendement**. Il est supérieur à 1 pour un aliment qui absorbe de l'eau (ex. riz ≈ `2,3`, lentilles ≈ `2,6`) et inférieur à 1 pour un aliment qui en perd (ex. viande ≈ `0,8`). Il permet de déduire les valeurs nutritionnelles de l'aliment cuit à partir de ses valeurs crues : **valeur aux 100 g cuit = valeur aux 100 g cru ÷ rendement**.
- **Périmètre / Exclusions** : Nombre décimal strictement positif, défini par l'utilisateur (éventuellement issu d'une table de référence comme Ciqual, ou mesuré en pesant une fois l'aliment avant et après cuisson). Une seule valeur par aliment, quel que soit le mode de cuisson. Ne corrige ni l'ajout de matière grasse ou de sel pendant la cuisson ni la perte de graisse ; l'index glycémique n'est pas converti.
- **Synonymes proscrits** : *Coefficient de cuisson*, *Ratio cru/cuit*, *Facteur de conversion*.

### État d'un aliment
- **Définition** : Attribut indiquant, lors de la pesée d'un *aliment cuisinable*, si le poids saisi est un poids **Cru** ou un poids **Cuit**, afin d'appliquer ou non le *rendement de cuisson* dans le calcul des valeurs nutritionnelles.
- **Périmètre / Exclusions** : Ne s'applique qu'aux aliments cuisinables, et uniquement au moment de la pesée (ligne de prise alimentaire ou de recette) ; un *aliment à état unique* n'en porte pas. Ne désigne pas un jeu de valeurs nutritionnelles distinct (l'aliment n'a qu'un jeu de valeurs, à l'état cru), ni la *note libre* descriptive, et ne s'applique pas globalement aux *recettes* ni aux *plats préparés*.
- **Synonymes proscrits** : *État Cru / Cuit*, *Statut de cuisson*, *Mode de cuisson*, *NA*.

### Évalué
- **Définition** : Statut d'un aliment dont les valeurs nutritionnelles requises sont renseignées (ainsi que le *rendement de cuisson* pour un *aliment cuisinable*), et qui n'est pas marqué manuellement comme *aliment non évalué*.
- **Périmètre / Exclusions** : Statut opposé à *aliment non évalué*, déterminé automatiquement. Ne s'applique qu'aux aliments.
- **Synonymes proscrits** : Aucun à ce stade.

### Élément partiellement évalué
- **Définition** : Recette contenant au moins un aliment non évalué ou un élément supprimé, ou plat préparé dont au moins une valeur nutritionnelle n'est pas renseignée.
- **Périmètre / Exclusions** : Indicateur d'incomplétude propagé aux prises alimentaires et aux agrégats nutritionnels concernés. Ne bloque aucune fonctionnalité. Ne s'applique pas aux aliments, qui relèvent du statut *aliment non évalué*.
- **Synonymes proscrits** : *Recette partiellement évaluée*.

### Élément supprimé
- **Définition** : Mention affichée à la place d'un aliment, d'une recette ou d'un plat préparé supprimé définitivement, dans les prises alimentaires et les recettes qui le contenaient. Sa contribution aux valeurs nutritionnelles vaut `0`.
- **Périmètre / Exclusions** : Résulte uniquement d'une suppression physique. Déclenche l'indicateur d'incomplétude. Ne désigne pas un élément archivé.
- **Synonymes proscrits** : Aucun à ce stade.

### Archivage
- **Définition** : Suppression logique d'un aliment, d'une recette, d'un plat préparé ou d'un type de prise alimentaire : l'élément est masqué des recherches, suggestions et nouvelles saisies, mais reste intact dans l'historique.
- **Périmètre / Exclusions** : N'altère pas les agrégats nutritionnels passés. Réversible par restauration de l'élément. Ne désigne pas la suppression physique.
- **Synonymes proscrits** : Aucun à ce stade.

### Base courante
- **Définition** : Aliment désigné par l'utilisateur pour un ajout rapide lors de la saisie d'une prise alimentaire (ex. matière grasse, huile, base de cuisson), associé à un grammage suggéré par défaut.
- **Périmètre / Exclusions** : Reste un aliment à part entière. Ne désigne ni une recette ni un plat préparé.
- **Synonymes proscrits** : Aucun à ce stade.

### Poids total
- **Définition** : Poids en grammes d'une recette une fois préparée (*poids total net*) ou d'un plat préparé entier.
- **Périmètre / Exclusions** : Facultatif, sauf pour un plat préparé dont les valeurs sont saisies aux 100 g. Conditionne la saisie d'une portion en grammes pour une recette ou un plat préparé. Ne désigne pas le poids consommé.
- **Synonymes proscrits** : *Poids unitaire*.

### Priorité
- **Définition** : Rang attribué à chaque type de prise alimentaire, `1` étant la priorité la plus élevée, servant à présélectionner un type lorsque plusieurs fenêtres temporelles couvrent l'heure choisie.
- **Périmètre / Exclusions** : Unique par utilisateur et par mandant. Ne restreint pas la sélection.
- **Synonymes proscrits** : Aucun à ce stade.

### Type par défaut
- **Définition** : Type de prise alimentaire présélectionné lorsqu'aucune fenêtre temporelle ne couvre l'heure choisie.
- **Périmètre / Exclusions** : Un et un seul par utilisateur et par mandant. Reste librement modifiable lors de la saisie.
- **Synonymes proscrits** : Aucun à ce stade.

### Référentiel alimentaire
- **Définition** : Ensemble des aliments (table d'aliments), recettes et plats préparés d'un utilisateur dans un mandant, ainsi que l'écran qui permet de les gérer.
- **Périmètre / Exclusions** : Ne comprend ni les prises alimentaires ni la configuration (types de prise alimentaire, bases courantes, cibles nutritionnelles).
- **Synonymes proscrits** : *Catalogue*, *Base d'aliments*.

### Journal
- **Définition** : Écran listant chronologiquement les prises alimentaires d'une date et permettant d'en consulter le détail, de les créer, modifier, dupliquer ou supprimer.
- **Périmètre / Exclusions** : Distinct de l'écran d'accueil, consacré aux agrégats nutritionnels.
- **Synonymes proscrits** : Aucun à ce stade.

### Moyenne journalière
- **Définition** : Agrégat nutritionnel d'une période divisé par le nombre de jours de cette période comportant au moins une prise alimentaire.
- **Périmètre / Exclusions** : Les jours sans aucune prise alimentaire sont exclus du calcul.
- **Synonymes proscrits** : Aucun à ce stade.

### Utilisateur autorisé
- **Définition** : Personne dont le compte Google figure dans la liste des utilisateurs autorisés, tenue exclusivement par l'administrateur dans le projet Supabase.
- **Périmètre / Exclusions** : Seul un utilisateur autorisé accède aux données. Chaque utilisateur autorisé dispose de ses propres données, sans partage.
- **Synonymes proscrits** : Aucun à ce stade.

### Habilitation
- **Définition** : Droit d'un utilisateur autorisé à accéder à un mandant donné (`REAL`, `TEST`).
- **Périmètre / Exclusions** : Créée automatiquement à la première connexion à partir de la liste des utilisateurs autorisés. Ne se gère pas depuis l'application.
- **Synonymes proscrits** : Aucun à ce stade.
