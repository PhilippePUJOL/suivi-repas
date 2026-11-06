# Document de Handoff & Cadre de Décision Architectural

**Projet :** Application de Suivi Nutritionnel Personnel  
**Objectif du document :** Synthetiser la démarche d'analyse, formaliser le cheminement de pensée et fournir un cadre de décision réutilisable pour d'autres contextes ou évolutions de besoins.

---

## 1. Contexte & Cahier des Charges Initial

### 1.1 Objectif Fonctionnel
Concevoir et développer une application personnelle de suivi nutritionnel permettant :
- La saisie d'aliments et le calcul des valeurs nutritionnelles, avec des quantités exprimées uniquement en grammes. L'utilisateur estimera lui-même les quantités consommées.
- La gestion des recettes, dont les modalités seront définies dans la partie fonctionnelle.
- L'utilisation facultative de l'API **Open Food Facts** comme option d'ergonomie pour faciliter la recherche et la saisie des aliments. L'application devra fonctionner sans ce service, en s'appuyant sur sa propre base de données.
- L'utilisation de l'**IA (LLM)** ou de **NLP léger** pour parser la saisie utilisateur en langage naturel ("*J'ai mangé un bol de riz et deux œufs*") et structurer la recherche.
- Des fonctionnalités d'ergonomie, qui seront décrites dans la partie fonctionnelle.

### 1.2 Contraintes Techniques & Opérationnelles
- **Multi-support :** Accessible au minimum sur téléphone Android et ordinateur personnel.
- **Modèle Économique :** 0 € (utilisation stricte de quotas et d'outils gratuits).
- **Souveraineté & Protection des Données :** Stockage local ou cloud privé/souverain sans fuite de données de santé personnelles vers des tiers commercialisant les données.
- **Simplicité initiale :** Les données seront stockées en clair pour le moment ; le chiffrement n'est pas retenu à ce stade.
- **Résilience des Données (Anti-Clear Cache) :** Impossibilité d'altérer ou supprimer les données historiques par une action involontaire (ex: nettoyage du cache navigateur).
- **Moyen de Développement :** Assisté par **GitHub Copilot** (nécessite des technologies bien documentées et adaptées à la génération de code).

---

## 2. Arbre de Décision et Cheminement de Pensée

### Étape 1 : Choix du Stockage & Gestion de la Persistance

```
                            [Besoin de Stockage]
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         ▼                                                         ▼
[Stockage Navigateur Pur]                               [Stockage Persistant / Cloud]
(LocalStorage, IndexedDB)                                (SQLite, CouchDB, Supabase)
         │                                                         │
         ❌ REJETÉ                                                 ✅ RETENU
 (Risque de suppression                                 (Garantie anti "Clear Cache"
  lors du nettoyage de cache)                            & synchronisation possible)
```

* **Problématique du Drive via SSO (Idée initiale) :** Excellente pour le zéro-serveur et la souveraineté, mais complexe pour les écritures fréquentes/granulaires (risque de conflits de synchronisation fichier et latence au quotidien).
* **Décision :** Dissocier la couche d'interface de la couche de persistance. La persistance doit s'appuyer soit sur le système de fichiers natif (mobile/desktop), soit sur une base de données avec réplication automatique.

---

### Étape 2 : Choix du Type d'Application & Technologies

| Option | Incompatibilités / Risques avec le besoin | Verdict |
| :--- | :--- | :--- |
| **Android Natif (Kotlin)** | Restreint à Android (échec du besoin d'accès sur PC personnel sans réécriture). | ❌ Non retenu |
| **PWA Pure (Client-side)** | Risque d'effacement des données localstorage/IndexedDB par le système d'exploitation. | ⚠️ Retenu sous condition d'une base distante (Sync) |
| **Multiplateforme (Flutter)** | Compilation native Android + Web/Desktop. Excellente résilience des données. | ✅ Retenu (Alternative Mobile-First) |
| **PWA / Web App + Sync Distante** | Code JS/TS universel, idéal pour Copilot, données sécurisées via Sync Cloud/CouchDB. | ✅ Retenu (Recommandation globale) |

---

### Étape 3 : Intégration de l'Intelligence Artificielle / NLP

* **Hypothèse initiale :** Réutilisation des comptes gratuits existants (Gemini, Copilot).
* **Validation technique :** 
  * **Google AI Studio (Gemini Flash API) :** Clé API gratuite séparée du chatbot public. Permet d'extraire des données structurées (JSON) depuis du texte libre. Données de saisie alimentaires non critiques du point de vue de la confidentialité IA.
  * **Option NLP Local (`wink-nlp`, `compromise`) :** Exécution 100% navigateur, zéro latence, 100% confidentiel, idéal pour du découpage syntaxique simple hors-ligne.

---

## 3. Matrice des Solutions Consolidées

La simplicité de maintenance et de déploiement est un critère de comparaison. Pour chaque solution, le déploiement initial peut rester manuel ; l'intérêt d'ajouter une CI/CD devra être évalué au regard de la fréquence des mises à jour et de la charge de maintenance. Aucun choix n'est arrêté à ce stade.

### Solution A : Web App (PWA) + PouchDB / CouchDB *(Recommandation Globale)*
- **Stack :** React/Vue/Svelte + PouchDB (Client) ↔ CouchDB (Serveur distant gratuit ou NAS).
- **Points forts :** Développement ultra-rapide avec Copilot (JS/TS), multiplateforme natif via navigateur, résilience absolue au "clear cache" grâce à la réplication CouchDB, fonctionnel hors-ligne.
- **Points faibles :** Nécessite une configuration initiale de l'instance CouchDB.
- **Déploiement / CI/CD :** Une mise à jour peut être publiée en déployant la version web ; une CI/CD pourrait automatiser cette publication, mais ajouterait une configuration et de la maintenance.

### Solution B : Multiplateforme Flutter + SQLite / Google Drive AppData
- **Stack :** Dart / Flutter + SQLite (Local) + Sync Google Drive (dossier caché `appDataFolder`).
- **Points forts :** Application 100% native Android et Desktop, zéro serveur (utilisation du quota Drive utilisateur), étanchéité totale aux nettoyages du navigateur.
- **Points faibles :** Code Dart plus verbeux pour Copilot, logique de fusion de fichiers/conflits Drive à gérer dans l'application.
- **Déploiement / CI/CD :** Les versions peuvent être compilées et installées manuellement ; une CI/CD pourrait automatiser la compilation et la distribution, au prix d'une configuration supplémentaire.

### Solution C : Web App + Backend Supabase (Tier Gratuit)
- **Stack :** React/Vue + Supabase (Postgres + Auth Google SSO).
- **Points forts :** Mise en œuvre la plus rapide avec Copilot, gestion des utilisateurs et sécurisation Row Level Security intégrées, pas d'effacement de données possible.
- **Points faibles :** Requiert une connexion Internet active pour enregistrer des repas (sauf surcouche de cache complexe).
- **Déploiement / CI/CD :** L'application web peut être mise à jour par déploiement ; une CI/CD pourrait automatiser cette étape, mais son apport doit être comparé à la simplicité d'une publication manuelle.

---

## 4. Cadre Générique de Réévaluation (pour futurs contextes)

Pour adapter ce cheminement à un **autre projet** possédant des besoins différents, appliquer la grille d'évaluation suivante :

```
                  ┌────────────────────────────────────────┐
                  │ 1. ÉVALUATION DE LA CONFIDENTIALITÉ   │
                  └───────────────────┬────────────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             ▼                                                 ▼
      [Données critiques]                             [Données standard]
 ➔ NLP Local ou LLM Auto-hébergé                 ➔ API LLM Gratuit (Gemini Flash)
    (Ollama / LocalAI)

                  ┌────────────────────────────────────────┐
                  │ 2. ÉVALUATION DE L'USAGE ET SUPPORTS   │
                  └───────────────────┬────────────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             ▼                                                 ▼
      [Usage Mobile Exclusif]                         [Usage Multi-Ecran / Web]
 ➔ Kotlin Natif ou Flutter                       ➔ PWA (JS/TS) ou Flutter Web

                  ┌────────────────────────────────────────┐
                  │ 3. ÉVALUATION DU MODE DE PERSISTANCE   │
                  └───────────────────┬────────────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             ▼                                                 ▼
     [Hors-ligne Obligatoire]                        [En Ligne / Synchronisé]
 ➔ BDD Locale + Sync Réplication                ➔ BaaS Cloud Managed
    (PouchDB / CouchDB, Room + Drive)               (Supabase, Firebase)
```

---

## 5. Prochaines Étapes Opérationnelles

1. **Sélection définitive de la solution** selon la priorité accordée au mode hors-ligne (Solution A vs Solution C).
2. **Évaluation des options d'enrichissement :** Vérifier l'apport ergonomique d'Open Food Facts et, si l'IA est conservée, valider la qualité de conversion de la saisie utilisateur en JSON via Google AI Studio. Ces services resteront facultatifs.
3. **Mise en place de la structure du projet :** Génération du squelette de code assistée par GitHub Copilot.
