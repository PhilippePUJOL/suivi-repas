// Authentification Google OAuth (docs/04 §5, F-AUTH-02, F-AUTH-03). Aucun accès au DOM.
import { supabase } from '../lib/supabase-client.js';
import { traduireErreur } from './erreurs.js';

/** Session courante (ou null). */
export async function sessionCourante() {
  try {
    const { data, error } = await supabase().auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  } catch (erreur) {
    throw traduireErreur(erreur, 'Impossible de vérifier la session.');
  }
}

/** Redirige vers Google ; retour sur l'adresse de l'application. */
export async function connexionGoogle(adresseRetour) {
  try {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: adresseRetour, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw error;
  } catch (erreur) {
    throw traduireErreur(erreur, 'La connexion Google n\'a pas pu démarrer.');
  }
}

/** Déconnexion locale (ne lève pas d'erreur : le contexte est réinitialisé dans tous les cas). */
export async function deconnexion() {
  try {
    await supabase().auth.signOut({ scope: 'local' });
  } catch {
    // Session déjà invalide ou réseau absent : la session locale est effacée quand même.
  }
}

/** Abonnement aux changements de session : fn(evenement, session). Renvoie une fonction de désabonnement. */
export function surChangementSession(fn) {
  const { data } = supabase().auth.onAuthStateChange((evenement, session) => fn(evenement, session));
  return () => data.subscription.unsubscribe();
}

/** Renouvelle la session ; renvoie la nouvelle session ou null si le renouvellement échoue. */
export async function renouvelerSession() {
  try {
    const { data, error } = await supabase().auth.refreshSession();
    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}
