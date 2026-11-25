// Contexte de session partagé et navigation, utilisés par app.js et par les écrans.
import { deconnexion } from '../../shared/services/auth.service.js';
import { oublierMandant } from '../../shared/services/mandant.service.js';
import { dateLocale } from '../../shared/utils/fenetre-temporelle.js';

export const contexte = {
  session: null,
  mandant: null, // { id, code, libelle }
  dateSelectionnee: dateLocale(new Date()), // date partagée Accueil / Journal (docs/03 §3.5)
  messageConnexion: null, // message à afficher sur l'écran de connexion
  ecranPrecedent: 'accueil', // retour après « Annuler » dans la saisie
  priseMiseEnEvidence: null, // id de la prise enregistrée, mise en évidence dans le journal
};

let rafraichir = () => {};
export function definirRafraichissement(fn) {
  rafraichir = fn;
}

export function naviguer(chemin) {
  const cible = `#/${chemin}`;
  if (location.hash === cible) rafraichir();
  else location.hash = cible;
}

/** Termine la session et revient au choix du mandant (RG-MND-04). */
export async function quitterSession(message = null) {
  await deconnexion();
  oublierMandant();
  contexte.session = null;
  contexte.mandant = null;
  contexte.messageConnexion = message;
  naviguer('connexion');
}
