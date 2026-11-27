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

/** Déconnexion volontaire (ou compte non autorisé) : efface la session et le Mandant mémorisé. */
export async function quitterSession(message = null) {
  await deconnexion();
  oublierMandant({ appareil: true });
  contexte.session = null;
  contexte.mandant = null;
  contexte.messageConnexion = message;
  naviguer('connexion');
}

/** Retour au choix explicite du Mandant en gardant la session Google (RG-MND-02). */
export function choisirUnMandant(message = null) {
  oublierMandant();
  contexte.mandant = null;
  contexte.messageConnexion = message;
  naviguer('connexion');
}

/** Recharge entièrement l'application (changement de Mandant, RG-MND-04). */
export function recharger(chemin = 'accueil') {
  location.hash = `#/${chemin}`;
  location.reload();
}
