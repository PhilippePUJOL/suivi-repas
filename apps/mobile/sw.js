// Service Worker (docs/04 §1.2) : met en cache UNIQUEMENT les ressources statiques publiques
// de l'application, servies depuis la même origine. Jamais les réponses authentifiées ni les
// données utilisateur (les appels à Supabase, sur une autre origine, ne sont pas interceptés).
// Stratégie « réseau d'abord » : la version en ligne est toujours préférée ; le cache ne sert
// qu'à afficher l'interface si le réseau manque (la saisie exige de toute façon le réseau).
const VERSION = 'suivi-repas-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c)));
    await self.clients.claim();
  })());
});

const EXTENSIONS_STATIQUES = /\.(?:html|js|css|json|png|svg|webmanifest)$/;

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  const url = new URL(requete.url);
  const estStatique = requete.method === 'GET'
    && url.origin === self.location.origin
    && !url.search // pas de paramètres (ex. retour OAuth ?code=…)
    && (url.pathname.endsWith('/') || EXTENSIONS_STATIQUES.test(url.pathname));
  if (!estStatique) return;

  evenement.respondWith((async () => {
    try {
      const reponse = await fetch(requete);
      if (reponse.ok && reponse.type === 'basic') {
        const cache = await caches.open(VERSION);
        await cache.put(requete, reponse.clone());
      }
      return reponse;
    } catch (erreur) {
      const enCache = await caches.match(requete);
      if (enCache) return enCache;
      throw erreur;
    }
  })());
});
