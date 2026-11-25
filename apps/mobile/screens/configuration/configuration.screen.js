// E-06 — Configuration (docs/03 §5.6). Première version : compte et mandant (F-CFG-03).
// Types de prise alimentaire, bases courantes et cibles : étapes suivantes du plan.
import { el, remplacer } from '../../dom.js';
import { confirmer } from '../../ui.js';
import { quitterSession } from '../../navigation.js';

export function afficher(conteneur, contexte) {
  const utilisateur = contexte.session?.user;
  const nom = utilisateur?.user_metadata?.full_name ?? utilisateur?.user_metadata?.name ?? '';
  remplacer(conteneur,
    el('section', { class: 'carte pile', 'aria-labelledby': 'titre-compte' },
      el('h2', { id: 'titre-compte' }, 'Compte et mandant'),
      el('p', {}, nom || 'Compte Google'),
      el('p', { class: 'texte-secondaire' }, utilisateur?.email ?? ''),
      el('p', {}, 'Mandant actif : ', el('strong', {}, `${contexte.mandant.code} — ${contexte.mandant.libelle}`)),
      el('button', {
        class: 'bouton bouton--large', type: 'button',
        onclick: async () => {
          if (await confirmer({ message: 'Changer de mandant ? Vous serez déconnecté puis invité à choisir un mandant.', libelleOui: 'Changer de mandant' })) {
            await quitterSession();
          }
        },
      }, 'Changer de mandant'),
      el('button', { class: 'bouton bouton--large', type: 'button', onclick: () => quitterSession() }, 'Se déconnecter')),
    el('section', { class: 'carte pile' },
      el('h2', {}, 'À venir'),
      el('p', { class: 'texte-secondaire' }, 'Types de prise alimentaire, bases courantes et cibles nutritionnelles seront gérés ici.')));
}
