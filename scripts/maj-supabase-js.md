# Mettre à jour la bibliothèque supabase-js (D1)

Version figée actuelle : **2.119.0**, dans `shared/lib/vendor/supabase.js`.

1. Télécharger l'archive officielle dans `_outils-dev\telechargements` : `https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-<version>.tgz`
2. En extraire `package/dist/umd/supabase.js`.
3. Recréer `shared/lib/vendor/supabase.js` : deux lignes de commentaire (version, origine), le contenu UMD, puis
   ```js
   export const createClient = supabase.createClient;
   export default supabase;
   ```
4. Vérifier : `node --input-type=module -e "const m = await import('./shared/lib/vendor/supabase.js'); console.log(typeof m.createClient)"` doit afficher `function`.
