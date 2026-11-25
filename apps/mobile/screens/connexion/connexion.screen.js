// E-01 — Connexion (docs/03 §5.1, F-AUTH-01, F-AUTH-02) : choix explicite du mandant,
// aucun présélectionné, puis Google OAuth.
import { el, remplacer } from '../../dom.js';
import { bandeauErreur } from '../../ui.js';
import { choisirMandant, oublierMandant } from '../../../../shared/services/mandant.service.js';
import { connexionGoogle } from '../../../../shared/services/auth.service.js';

const MANDANTS = [
  { code: 'REAL', libelle: 'Usage réel' },
  { code: 'TEST', libelle: 'Essais et tests' },
];

export function afficher(racine, contexte) {
  oublierMandant(); // aucun mandant présélectionné (RG-MND-02)
  let choix = null;
  const zoneMessage = el('div', { 'aria-live': 'polite' });
  const bouton = el('button', { class: 'bouton bouton--principal bouton--large', type: 'button', disabled: true }, 'Se connecter avec Google');

  const majEtatBouton = () => {
    bouton.disabled = !choix || navigator.onLine === false;
  };

  const cartes = MANDANTS.map((m) => el('label', { class: 'carte-mandant' },
    el('input', {
      type: 'radio', name: 'mandant', value: m.code,
      onchange: () => { choix = m.code; majEtatBouton(); },
    }),
    el('span', { class: 'pile', style: 'gap: 2px' }, el('strong', {}, m.code), el('span', { class: 'texte-secondaire' }, m.libelle))));

  bouton.addEventListener('click', async () => {
    if (!choix) return;
    bouton.disabled = true;
    bouton.setAttribute('aria-busy', 'true');
    remplacer(zoneMessage);
    try {
      choisirMandant(choix);
      await connexionGoogle(`${location.origin}${location.pathname}`);
    } catch (erreur) {
      remplacer(zoneMessage, bandeauErreur(erreur.message));
      bouton.removeAttribute('aria-busy');
      majEtatBouton();
    }
  });

  const surReseau = () => {
    majEtatBouton();
    remplacer(zoneMessage, navigator.onLine === false
      ? bandeauErreur('Connexion réseau indisponible. La connexion reprendra dès le retour du réseau.')
      : '');
  };
  window.addEventListener('online', surReseau);
  window.addEventListener('offline', surReseau);

  if (contexte.messageConnexion) {
    remplacer(zoneMessage, bandeauErreur(contexte.messageConnexion));
    contexte.messageConnexion = null;
  } else if (navigator.onLine === false) {
    surReseau();
  }

  remplacer(racine, el('main', { class: 'connexion' },
    el('div', { class: 'marque' },
      el('span', { class: 'logo', 'aria-hidden': 'true' }, '🥗'),
      el('h1', {}, 'Suivi nutritionnel')),
    zoneMessage,
    el('fieldset', { class: 'pile', style: 'border: 0; padding: 0; margin: 0' },
      el('legend', { style: 'margin-bottom: 12px; font-weight: 600' }, 'Choisissez le mandant'),
      cartes),
    bouton));

  return () => {
    window.removeEventListener('online', surReseau);
    window.removeEventListener('offline', surReseau);
  };
}
