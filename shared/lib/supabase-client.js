// Client Supabase unique de l'application (docs/04 §2.1).
// Seules l'URL publique et la clé publique (anon / publishable) sont utilisées côté navigateur.
import { createClient } from './vendor/supabase.js';

let client = null;

/** Initialise le client avec { url, clePublique }. À appeler une fois au démarrage. */
export function initialiserClient({ url, clePublique }) {
  // Client simulé en mémoire, uniquement pour les essais d'interface (tests/navigateur/).
  if (globalThis.__CLIENT_SIMULE__) {
    client = globalThis.__CLIENT_SIMULE__;
    return client;
  }
  if (!url || !clePublique || clePublique.startsWith('REMPLACEZ')) {
    throw new Error('Configuration Supabase absente : copiez apps/mobile/config.example.js en config.js et renseignez-le.');
  }
  client = createClient(url, clePublique, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function supabase() {
  if (!client) throw new Error('Client Supabase non initialisé.');
  return client;
}
