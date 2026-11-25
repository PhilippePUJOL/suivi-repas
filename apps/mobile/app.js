// Point d'entrée de la PWA mobile : routage par fragment (docs/03 §3.6) et coquille
// (en-tête avec le Mandant actif, bandeau TEST, navigation basse).
import { CONFIG } from './config.js';
import { initialiserClient } from '../../shared/lib/supabase-client.js';
import { sessionCourante, surChangementSession } from '../../shared/services/auth.service.js';
import { verifierMandant } from '../../shared/services/mandant.service.js';
import { el, remplacer } from './dom.js';
import { bandeauErreur } from './ui.js';
import { contexte, naviguer, quitterSession, definirRafraichissement } from './navigation.js';
import * as ecranConnexion from './screens/connexion/connexion.screen.js';
import * as ecranAccueil from './screens/accueil/accueil.screen.js';
import * as ecranJournal from './screens/journal/journal.screen.js';
import * as ecranSaisie from './screens/saisie-prise-alimentaire/saisie-prise-alimentaire.screen.js';
import { existeSaisieConservee } from './screens/saisie-prise-alimentaire/saisie-prise-alimentaire.screen.js';
import * as ecranReferentiel from './screens/referentiel/referentiel.screen.js';
import * as ecranConfiguration from './screens/configuration/configuration.screen.js';

const racine = document.getElementById('application');

const ROUTES = {
  connexion: { ecran: ecranConnexion, public: true },
  accueil: { ecran: ecranAccueil, titre: 'Accueil', onglet: 'accueil' },
  journal: { ecran: ecranJournal, titre: 'Journal', onglet: 'journal' },
  'saisie-prise-alimentaire': { ecran: ecranSaisie, pleinEcran: true },
  referentiel: { ecran: ecranReferentiel, titre: 'Référentiel', onglet: 'referentiel' },
  configuration: { ecran: ecranConfiguration, titre: 'Configuration', onglet: 'configuration' },
};

let nettoyage = null;

function lireRoute() {
  const [nom, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { nom: ROUTES[nom] ? nom : null, params: params.map(decodeURIComponent) };
}

/** Établit le contexte authentifié : session + mandant vérifié. Renvoie true si l'accès est accordé. */
async function etablirContexte() {
  contexte.session = await sessionCourante();
  if (!contexte.session) {
    contexte.mandant = null;
    return false;
  }
  if (contexte.mandant) return true;
  try {
    contexte.mandant = await verifierMandant();
    return true;
  } catch (erreur) {
    if (erreur.type === 'ACCES') {
      await quitterSession(erreur.motif === 'MANDANT_ABSENT' ? null : erreur.message);
      return false;
    }
    throw erreur;
  }
}

function navigationBasse(ongletActif) {
  const lien = (onglet, icone, libelle) => el('a', {
    href: `#/${onglet}`, 'aria-current': onglet === ongletActif ? 'page' : false,
  }, el('span', { class: 'icone', 'aria-hidden': 'true' }, icone), el('span', {}, libelle));
  return el('nav', { class: 'nav-basse', 'aria-label': 'Navigation principale' },
    lien('accueil', '🏠', 'Accueil'),
    lien('journal', '📖', 'Journal'),
    el('a', { href: '#/saisie-prise-alimentaire', class: 'nav-ajout', 'aria-label': 'Ajouter une prise alimentaire' },
      el('span', { class: 'icone', 'aria-hidden': 'true' }, '+'), el('span', {}, 'Prise')),
    lien('referentiel', '🥕', 'Référentiel'),
    lien('configuration', '⚙️', 'Configuration'));
}

function coquille(route, contenu) {
  const code = contexte.mandant?.code;
  const estTest = code === 'TEST';
  const elements = [];
  if (!route.pleinEcran) {
    elements.push(el('header', { class: 'entete' },
      el('h1', {}, route.titre),
      el('button', {
        class: `badge-mandant${estTest ? ' badge-mandant--test' : ''}`, type: 'button',
        'aria-label': `Mandant actif : ${code}. Ouvrir le compte`,
        onclick: () => naviguer('configuration'),
      }, code)));
  }
  if (estTest) elements.push(el('div', { class: 'bandeau-test', role: 'note' }, 'Mandant TEST — données d\'essai'));
  elements.push(contenu);
  if (!route.pleinEcran) elements.push(navigationBasse(route.onglet));
  return elements;
}

async function afficherRoute() {
  nettoyage?.();
  nettoyage = null;
  const { nom, params } = lireRoute();
  if (!nom) {
    naviguer(contexte.mandant ? 'accueil' : 'connexion');
    return;
  }
  const route = ROUTES[nom];
  if (route.onglet) contexte.ecranPrecedent = route.onglet;

  if (route.public) {
    nettoyage = route.ecran.afficher(racine, contexte) ?? null;
    return;
  }

  let accorde;
  try {
    accorde = await etablirContexte();
  } catch (erreur) {
    remplacer(racine, el('main', { class: 'contenu' }, bandeauErreur(erreur.message, afficherRoute)));
    return;
  }
  if (!accorde) {
    if (lireRoute().nom !== 'connexion') naviguer('connexion');
    return;
  }
  if (lireRoute().nom !== nom) return; // la route a changé pendant la vérification

  const contenu = el('main', { class: `contenu${route.pleinEcran ? ' contenu--plein' : ''}`, id: 'contenu' });
  remplacer(racine, coquille(route, contenu));
  nettoyage = route.ecran.afficher(contenu, contexte, params) ?? null;
}

async function demarrer() {
  try {
    initialiserClient(CONFIG);
  } catch (erreur) {
    remplacer(racine, el('main', { class: 'contenu' }, bandeauErreur(erreur.message)));
    return;
  }
  // Retour de Google (PKCE) : la bibliothèque échange le code ; on nettoie ensuite l'adresse.
  if (new URLSearchParams(location.search).has('code')) {
    remplacer(racine, el('main', { class: 'contenu' }, el('p', { role: 'status' }, 'Vérification de l\'accès…')));
    try {
      await sessionCourante();
    } catch {
      // traité par afficherRoute
    }
    // Saisie conservée pendant une reconnexion (F-EDIT-05) : retour direct à la saisie.
    const suite = existeSaisieConservee() ? 'saisie-prise-alimentaire' : 'accueil';
    history.replaceState(null, '', `${location.pathname}#/${suite}`);
  }
  surChangementSession((evenement) => {
    if (evenement === 'SIGNED_OUT') contexte.session = null;
  });
  definirRafraichissement(afficherRoute);
  window.addEventListener('hashchange', afficherRoute);
  await afficherRoute();
}

demarrer();
