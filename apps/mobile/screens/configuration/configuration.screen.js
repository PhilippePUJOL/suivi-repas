// E-06 — Configuration (docs/03 §5.6). Première version : compte et mandant (F-CFG-03).
// Types de prise alimentaire, bases courantes et cibles : étapes suivantes du plan.
import { el, remplacer } from '../../dom.js';
import { confirmer, bandeauErreur } from '../../ui.js';
import { quitterSession, recharger } from '../../navigation.js';
import { changerMandant, CODES_MANDANT } from '../../../../shared/services/mandant.service.js';

const LIBELLES = { REAL: 'Usage réel', TEST: 'Essais et tests' };

export function afficher(conteneur, contexte) {
  const utilisateur = contexte.session?.user;
  const nom = utilisateur?.user_metadata?.full_name ?? utilisateur?.user_metadata?.name ?? '';
  const zoneErreur = el('div', { 'aria-live': 'polite' });

  // Changement de mandant sans nouvelle authentification (RG-MND-04) : vérification de
  // l'habilitation, puis rechargement complet pour ne rien garder du mandant précédent.
  const boutonsMandant = CODES_MANDANT.filter((code) => code !== contexte.mandant.code).map((code) => el('button', {
    class: 'bouton bouton--large', type: 'button',
    onclick: async (e) => {
      const bouton = e.currentTarget;
      if (!(await confirmer({ message: `Passer au mandant ${code} (${LIBELLES[code]}) ? L'écran sera réinitialisé.`, libelleOui: `Passer à ${code}` }))) return;
      bouton.disabled = true;
      remplacer(zoneErreur);
      try {
        await changerMandant(code);
        recharger('accueil');
      } catch (erreur) {
        remplacer(zoneErreur, bandeauErreur(erreur.message));
        bouton.disabled = false;
      }
    },
  }, `Passer au mandant ${code}`));

  remplacer(conteneur,
    el('section', { class: 'carte pile', 'aria-labelledby': 'titre-compte' },
      el('h2', { id: 'titre-compte' }, 'Compte et mandant'),
      el('p', {}, nom || 'Compte Google'),
      el('p', { class: 'texte-secondaire' }, utilisateur?.email ?? ''),
      el('p', {}, 'Mandant actif : ', el('strong', {}, `${contexte.mandant.code} — ${contexte.mandant.libelle}`)),
      zoneErreur,
      boutonsMandant,
      el('button', {
        class: 'bouton bouton--large', type: 'button',
        onclick: async () => {
          if (await confirmer({ message: 'Se déconnecter ? Il faudra choisir le mandant et repasser par Google à la prochaine ouverture.', libelleOui: 'Se déconnecter' })) {
            await quitterSession();
          }
        },
      }, 'Se déconnecter')),
    el('section', { class: 'carte pile' },
      el('h2', {}, 'À venir'),
      el('p', { class: 'texte-secondaire' }, 'Types de prise alimentaire, bases courantes et cibles nutritionnelles seront gérés ici.')));
}
