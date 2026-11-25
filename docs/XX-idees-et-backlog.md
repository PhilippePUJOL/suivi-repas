Ce fichier contient des idées notées en vrac par l'utilisateur. 
N considère pas ce fichier sauf mention explicite.


# Idées pour les fonctionalités de l'application
1. Le type de repas ne doit pas être restreint à l'horaire, il doit s'agir d'une proposition par défaut. Cela permet par exemple de choisir un type de repas indépendement de l'horaire et d'avoir potentiellement plusieurs types de repas qui se chevauche en terme d'horaire. Attention, bien que un type de repas a une plage horaire, ce ne doit pas être une restriction à la sélection. Cela doit uniquement permettre de faciliter l'ergonomie. Le type de repas est cependant la notion qui permette de faire des propositions de selection rapide pour la copie de repas ou d'ajout d'ingrédients. Pour une proposition par défaut doit avoir une priorité d'affichage dans le cas où l'heure choisi match avec plusieurs types de repas. Exemple avec un type de repas égal à "Apéro". Il peut se chevaucher avec le gouter.
2. Il faudra reoir la notion de type de repas et la liste.
3. spécifier les écrans et leur séquence. 
4. Simplificer l'écran d'acceuil pour y avoir uniquement des métriques de valeurs nutritionelles. Prévoir un écran dédié pour les repas.
5. Pouvoir ajouter des ingrédients qui n'existe pas dans la base de donnée lors de la saise de repas et pouvoir renseigner les valeurs nutrionnelles à la volée ou ultérieurement. Des warning signs pourront être affichés en cas d'utilisation d'ingrédients non évalués pour avertir l'utilisateur que les valeurs nutrionnelles ne peuvent pas être représentative à chaque fois que l'information manquante est nécessaire. Cependant un manquant ne doit pas bloquer les fonctionalités.
6. aide à la saisie de valeurs nutrionelles grâce à la caméra du téléphone et via reconnaissance image/video. La solution ne doit pas engendrer des coûts. Peut-être avec de l'OCR (avec Tesseract.js) et des REGEX.    
7. évaluer le dossier initial pour repérer les manquements.
8. Revoir la méthodologie actuelle
9. Ecrire le fichier .claude - comment suivre l'implémentation et toujours se référer à ces fichiers de références.
10. **Ajustement fin de la portion** : boutons `+5 g` / `+10 g` / `−5 g` / `−10 g` dans le sélecteur de `Portion`, en mode `g` uniquement. Non implémenté ; à réévaluer à l'usage du MVP.
11. **Catégorie d'aliment** : une catégorie par `Aliment` (viandes, féculents, légumes…) pour filtrer le référentiel alimentaire. Non implémenté ; à réévaluer à l'usage du MVP et selon la source retenue pour initialiser le référentiel.
12. **Intégration Garmin (V2) — éléments repris de l'ancienne version** :
    * *Source* : API officielle Garmin (Health / Personal API), sans agrégateur tiers (gratuit, gouvernance maîtrisée).
    * *Données* : résumés journaliers — calories actives et BMR cumulés depuis minuit — pour le jour J et les 7 jours précédents.
    * *Estimation de fin de journée* : calories actives de J + BMR journalier moyen des 7 derniers jours.
    * *Synchronisation* : données mises en cache dans Supabase ; synchro à l'ouverture si la dernière date de plus de 30 min, ou via un bouton manuel ; consolidation de J−1 chaque nuit à 1 h (`pg_cron` + Edge Function).
    * *Sécurité* : clés Garmin uniquement dans les secrets Supabase ; jeton de rafraîchissement dans une table privée à RLS stricte ; aucun secret côté navigateur.
    * *Données stockées* : une ligne par jour et par utilisateur (date, calories actives, BMR, total, heure de synchro), rattachée au `Mandant`.
    * *UX* : toujours afficher l'heure réelle de la dernière synchro (« Synchro Garmin : il y a 12 min ») ; ne jamais présenter une donnée périmée comme du direct ; en cas d'échec, afficher les dernières données valides avec un message non bloquant.

# Idées pour la gestion de la création de l'application
1. constituer un language commun pour le  (signification de valeur nutritionnel, ingrédient ....)
2. définir de règles de méthodologie : toujours demander les logiques à implémenter en cas choix possibles. Mettre à jour la documentation en fonction (avoir des documents de design en plus des spécifications).
3. Gestion documentaire
mon-projet/
├── CLAUDE.md                        # Règles d'architecture, contraintes MVP et workflow
├── .env.example                     # Variables publiques attendues (SUPABASE_URL, ANON_KEY)
│
├── docs/                            # 1. TON ESPACE DE SPÉCIFICATION (Source de vérité)
│   ├── XX-idees-et-backlog.md       # Idées larges [V2+] (jamais codées sans feu vert)
│   ├── 00-dictionnaire-metier.md    # définition des termes métiers à utiliser dans le projet
│   ├── 01-vision-produit.md         # Cible, valeur, périmètre strict [MVP]
│   ├── 02-specs-fonctionnelles.md   # Parcours, règles de gestion, critères d'acceptation
│   ├── 03-ux-et-parcours.md         # Navigation, spécificités Mobile vs Desktop, états UI
│   ├── 04-specs-techniques.md       # Modèle de données Supabase, RLS, flux OAuth Google
│   └── mockups/                     # Tes maquettes/wireframes (.png)
│
├── design-system/                   # 2. LE DESIGN SYSTEM PARTAGÉ (Tokens + Composants UI)
│   ├── tokens.css                   # Couleurs, typographie, espacements, rayons, ombres
│   ├── base.css                     # Reset CSS et styles communs
│   ├── components/                  # Composants UI réutilisables (boutons, modales, cartes, toasts...)
│   │   ├── button.css
│   │   └── modal.js                 # Web Components natifs (<app-modal>) ou modules JS purs
│   └── styleguide.html              # Page vitrine locale pour visualiser et valider tes composants
│
├── shared/                          # 3. LE CŒUR MÉTIER & SUPABASE (Mutualisé Mobile + Desktop)
│   ├── lib/
│   │   └── supabase-client.js       # Initialisation du client Supabase (ESM)
│   ├── services/                    # Appels API / requêtes BDD + Auth (aucun DOM ici !)
│   │   ├── auth.service.js          # Login Google OAuth, session, logout
│   │   └── [entite].service.js      # CRUD métier (ex: projets, taches...)
│   └── utils/                       # Formatage dates, validations métier, helpers purs
│
├── apps/                            # 4. LES 2 PWA (Uniquement l'assemblage d'écrans et le DOM)
│   ├── mobile/                      # PWA Smartphone (tactile, navigation basse, compact)
│   │   ├── index.html
│   │   ├── manifest.json            # Config PWA Mobile
│   │   ├── sw.js                    # Service Worker Mobile
│   │   ├── app.js                   # Routeur et point d'entrée Mobile
│   │   └── screens/                 # 1 dossier par écran Mobile
│   │       ├── login/
│   │       │   ├── login.screen.js
│   │       │   └── login.css
│   │       └── dashboard/
│   │           ├── dashboard.screen.js
│   │           └── dashboard.css
│   │
│   └── desktop/                     # PWA PC (grand écran, multi-colonnes, raccourcis)
│       ├── index.html
│       ├── manifest.json            # Config PWA Desktop
│       ├── sw.js                    # Service Worker Desktop
│       ├── app.js                   # Routeur et point d'entrée Desktop
│       └── screens/                 # 1 dossier par écran Desktop
│           ├── login/
│           └── dashboard/
│
└── supabase/                        # 5. INFRASTRUCTURE LOCALE & BDD (Supabase CLI)
    ├── config.toml                  # Généré par `supabase init` (config Google OAuth local)
    ├── migrations/                  # Fichiers SQL versionnés (tables, index, règles RLS)
    └── seed.sql                     # Jeu de données de test pour tes recettes 