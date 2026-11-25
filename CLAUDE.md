# suivi-repas — consignes pour Claude Code

Application PWA mobile de suivi nutritionnel personnel (MVP), JavaScript vanilla + Supabase + Google OAuth.

## Sources de vérité
- Les specs de `docs/` font référence, dans l'ordre `00` > `01` > `02` > `03` > `04`. `docs/XX-idees-et-backlog.md` n'est jamais une source de vérité.
- Vocabulaire du dictionnaire `docs/00-dictionnaire-metier.md`, y compris dans le code (identifiants français sans accents, `snake_case` ; fichiers en `kebab-case`). Synonymes proscrits interdits (pas de *repas*, *ingrédient*, *macros*…).
- Toute modification de règle est reportée dans tous les docs concernés. Sauvegarder un document avant de le modifier en profondeur.
- Les choix structurants sont proposés à Philippe avec une recommandation, et attendent sa validation.
- Plan de réalisation : `plan-realisation-mvp.md`.

## Architecture (docs/04 §2)
- `shared/utils/` : fonctions pures, sans DOM ni Supabase, testées avec `node --test`.
- `shared/services/` : accès Supabase, filtrage systématique par `mandant_id`, vérification de `error`, aucun accès au DOM.
- `shared/lib/` : client Supabase. `shared/lib/vendor/supabase.js` est la bibliothèque officielle figée (ne pas modifier).
- `apps/mobile/` : écrans, routage par fragment (`#/…`), DOM construit avec `createElement` / `textContent` (jamais `innerHTML` avec des données, jamais `eval`).
- `design-system/` : tokens et briques CSS, thème clair.
- `supabase/migrations/` : toute évolution de schéma = nouvelle migration (ne jamais réécrire une migration appliquée). Tests pgTAP dans `supabase/tests/`, exécutés par GitHub Actions, jamais sur le projet réel.
- Aucune dépendance d'exécution installée par npm. npm ne sert qu'aux outils de développement (Supabase CLI).

## Poste de développement
- **Rien sur le disque C** (caches, temporaires, téléchargements). npm récent : `D:\Utilisateurs\Ophélie\Documents\VS Code\_outils-dev\npm.cmd` (cache et temporaires sur D). Ne pas utiliser le npm de `C:\Program Files\nodejs` (obsolète).
- Tests unitaires : `node --test tests/unit/`
- Serveur local : `python -m http.server 8000` depuis la racine, puis `http://localhost:8000/apps/mobile/`.
- Ne jamais versionner de secret (`service_role`, secret OAuth). La configuration locale (`apps/mobile/config.js`) n'est pas versionnée.
