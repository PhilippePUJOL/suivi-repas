// Erreurs des services (NFR-SUP-REL-01) : jamais de fausse réussite, message clair en français.

export class ErreurService extends Error {
  /**
   * @param {'RESEAU'|'SESSION'|'ACCES'|'METIER'|'INCONNUE'} type
   * @param {string} message message affichable à l'utilisateur
   * @param {object} [cause] erreur d'origine
   */
  constructor(type, message, cause) {
    super(message);
    this.name = 'ErreurService';
    this.type = type;
    this.cause = cause;
  }
}

function estErreurReseau(erreur) {
  const m = String(erreur?.message ?? '');
  return erreur instanceof TypeError || /Failed to fetch|NetworkError|Load failed|fetch failed|network/i.test(m);
}

/** Convertit une erreur Supabase / réseau en ErreurService. */
export function traduireErreur(erreur, messageParDefaut = 'Une erreur est survenue. Réessayez.') {
  if (erreur instanceof ErreurService) return erreur;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ErreurService('RESEAU', 'Connexion réseau indisponible. Vérifiez votre connexion puis réessayez.', erreur);
  }
  if (estErreurReseau(erreur)) {
    return new ErreurService('RESEAU', 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.', erreur);
  }
  const code = erreur?.code ?? '';
  const statut = erreur?.status ?? 0;
  if (statut === 401 || code === 'PGRST301' || /JWT/i.test(erreur?.message ?? '')) {
    return new ErreurService('SESSION', 'Votre session a expiré. Reconnectez-vous.', erreur);
  }
  if (code === '42501' || statut === 403) {
    return new ErreurService('ACCES', 'Accès refusé à ces données.', erreur);
  }
  // Règles métier levées par la base (déclencheurs, errcode P0001) : message déjà rédigé en français.
  if (code === 'P0001' && erreur?.message) {
    return new ErreurService('METIER', erreur.message, erreur);
  }
  return new ErreurService('INCONNUE', messageParDefaut, erreur);
}

/** Vérifie une réponse Supabase { data, error } et renvoie data, ou lève une ErreurService. */
export function verifier({ data, error }, messageParDefaut) {
  if (error) throw traduireErreur(error, messageParDefaut);
  return data;
}

/** Exécute un appel Supabase en convertissant aussi les exceptions réseau. */
export async function appeler(fn, messageParDefaut) {
  try {
    return verifier(await fn(), messageParDefaut);
  } catch (erreur) {
    throw traduireErreur(erreur, messageParDefaut);
  }
}
