# Mise en route — actions de Philippe

Ce guide liste ce qui demande vos comptes (Supabase, Google, GitHub). Tout le reste est déjà prêt dans le projet.
Ordre conseillé : 1 → 2 → 3 → 4, puis 5 et 6 quand vous le souhaitez.

Dans les commandes ci-dessous, la fenêtre PowerShell doit être ouverte dans le dossier du projet :

```powershell
cd "D:\Utilisateurs\Ophélie\Documents\VS Code\suivi-repas"
```

---

## 1. Relier le projet à Supabase (une seule fois, environ 5 minutes)

1. Récupérez le **mot de passe de la base de données** de votre projet Supabase : Dashboard → *Project Settings* → *Database*. Si vous ne le connaissez plus, utilisez *Reset database password* (le projet est vide, c'est sans risque).
2. Lancez cette commande : elle ouvre une page Supabase dans votre navigateur pour autoriser l'outil.
   ```powershell
   .\node_modules\.bin\supabase.cmd login
   ```
3. Puis reliez le projet (le mot de passe de l'étape 1 vous sera demandé) :
   ```powershell
   .\node_modules\.bin\supabase.cmd link --project-ref ejxslgvnxzmtskxfxwfl
   ```

Dites-moi quand c'est fait : j'appliquerai alors les migrations (création des tables et des règles de sécurité) avec `supabase db push`.

## 2. Déclarer les utilisateurs autorisés (après l'application des migrations)

Dashboard Supabase → *SQL Editor* → *New query*, collez puis exécutez (remplacez l'adresse par celle de votre compte Google) :

```sql
insert into public.utilisateurs_autorises (email, mandant_id)
select lower('votre.adresse@gmail.com'), id from public.mandants where code in ('REAL', 'TEST');
```

Pour un proche, même requête avec son adresse (et seulement `'TEST'` ou `'REAL'` si vous voulez limiter ses mandants).

## 3. Connexion Google (environ 10 minutes)

**Dans Google Cloud Console** (*APIs et services* → *Identifiants* → votre identifiant client OAuth « Application Web ») :
- *Origines JavaScript autorisées* : `http://localhost:8000`
- *URI de redirection autorisés* : `https://ejxslgvnxzmtskxfxwfl.supabase.co/auth/v1/callback`
- Notez le **code secret du client** (Client Secret).

**Dans le Dashboard Supabase** :
- *Authentication* → *Sign In / Providers* → *Google* : activez, collez l'**ID client** et le **code secret du client**, enregistrez.
- *Authentication* → *URL Configuration* :
  - *Site URL* : `http://localhost:8000/apps/mobile/`
  - *Redirect URLs* : ajoutez `http://localhost:8000/apps/mobile/`

Le code secret ne doit être collé que dans Supabase, jamais dans le projet ni dans une conversation.

## 4. Essayer l'application sur votre PC

```powershell
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000/apps/mobile/` dans votre navigateur, choisissez **TEST** et connectez-vous avec Google.
À la première connexion, vos 7 types de prise alimentaire et vos cibles de départ sont créés automatiquement.
Pour arrêter le serveur : `Ctrl + C` dans la fenêtre PowerShell.

> Sans compte, une version de démonstration avec des données fictives est disponible :
> `http://localhost:8000/tests/navigateur/simulation.html`

## 5. Tests automatiques sur GitHub

Le fichier d'automatisation est prêt dans `scripts/ci/tests.yml`, mais l'accès GitHub enregistré sur ce PC n'a pas le droit de publier ce type de fichier (droit « workflow »). Deux possibilités :
- sur github.com, dans le dépôt : *Add file* → *Create new file*, nom `.github/workflows/tests.yml`, collez le contenu de `scripts/ci/tests.yml`, puis *Commit changes* ;
- ou me fournir un accès GitHub qui a le droit « Workflows » (en lecture et écriture).

## 6. Charger le référentiel d'aliments du Préparateur

Une fois le fichier d'aliments produit (format §3.8 du doc 04) et après votre première connexion :

```powershell
node scripts/referentiel-vers-sql.js "<chemin du fichier>" votre.adresse@gmail.com TEST referentiel-TEST.sql
```

Ouvrez ensuite `referentiel-TEST.sql`, copiez son contenu dans le *SQL Editor* de Supabase et exécutez-le. Recommencez avec `REAL` quand vous êtes prêt. Les aliments déjà présents sont ignorés.

## 7. Application en ligne (GitHub Pages)

L'application est publiée automatiquement à chaque envoi de code sur `main` : **https://philippepujol.github.io/suivi-repas/**

Réglages déjà faits (27/11/2026) : *Settings* → *Pages* → *Source* : GitHub Actions ; origine `https://philippepujol.github.io` dans Google Cloud ; *Site URL* et *Redirect URLs* `https://philippepujol.github.io/suivi-repas/apps/mobile/` dans Supabase (en gardant `http://localhost:8000/apps/mobile/` dans *Redirect URLs*).

Sur le téléphone : Android (Chrome) menu ⋮ → *Ajouter à l'écran d'accueil* ; iPhone (Safari) *Partager* → *Sur l'écran d'accueil*.
