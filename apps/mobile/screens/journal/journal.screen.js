// E-03 — Journal (docs/03 §5.3, F-JRN-01 à 03). Première version : liste du jour, détail
// dépliable, modification et suppression. Duplication : étape suivante du plan.
import { el, remplacer } from '../../dom.js';
import { bandeauErreur, chargement, indicateurIncompletude, blocValeurs, navigationDate, confirmer, notifier } from '../../ui.js';
import { naviguer } from '../../navigation.js';
import { listerPrisesDuJour, supprimerPrise } from '../../../../shared/services/prise-alimentaire.service.js';
import {
  agregerElements, agregerAgregats, contributionElement, formaterValeur, libellePortion,
} from '../../../../shared/utils/calcul-nutritionnel.js';
import { heureLocale } from '../../../../shared/utils/fenetre-temporelle.js';

/** Nom affiché d'un élément de prise alimentaire. */
export function nomElement(e) {
  if (e.est_element_supprime) return e.libelle_element_supprime ?? 'Élément supprimé';
  return e.aliment?.nom ?? e.recette?.nom ?? e.plat_prepare?.nom ?? 'Élément supprimé';
}

function libelleEtat(e) {
  if (e.etat_aliment === 'CRU') return 'Cru';
  if (e.etat_aliment === 'CUIT') return 'Cuit';
  return null;
}

export function afficher(conteneur, contexte) {
  let actif = true;
  const zoneListe = el('div', { class: 'pile' });
  const zoneTotal = el('div');

  const carteDePrise = (prise) => {
    const agregat = agregerElements(prise.elements);
    const noms = prise.elements.map(nomElement);
    const resume = noms.slice(0, 3).join(', ') + (noms.length > 3 ? ` +${noms.length - 3}` : '');
    const detail = el('div', { hidden: true },
      prise.elements.map((e) => {
        const c = contributionElement(e);
        return el('div', { class: 'ligne-detail' },
          el('div', { class: 'grandit' },
            el('span', { class: e.est_element_supprime ? 'element-supprime' : '' }, nomElement(e)),
            ' ', libelleEtat(e) && el('span', { class: 'badge' }, libelleEtat(e)),
            ' ', el('span', { class: 'texte-secondaire' }, libellePortion(e)),
            e.note_libre && el('div', { class: 'texte-secondaire' }, e.note_libre)),
          el('span', {}, `${formaterValeur('energie_kcal', c.valeurs.energie_kcal)} kcal `, indicateurIncompletude(c.causes)));
      }),
      el('div', { style: 'padding-top: 8px' }, blocValeurs(agregat.valeurs)));
    const ouvrir = el('div', {
      class: 'entete-prise', role: 'button', tabindex: '0', 'aria-expanded': 'false',
      onclick: () => basculer(), onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); basculer(); } },
    },
    el('strong', {}, heureLocale(new Date(prise.horodatage_prise))),
    el('span', { class: 'grandit' }, `${prise.type_prise_alimentaire?.icone ?? ''} ${prise.type_prise_alimentaire?.libelle ?? ''}`),
    el('span', {}, `${formaterValeur('energie_kcal', agregat.valeurs.energie_kcal)} kcal`),
    indicateurIncompletude(agregat.causes));
    function basculer() {
      detail.hidden = !detail.hidden;
      ouvrir.setAttribute('aria-expanded', String(!detail.hidden));
    }
    const carte = el('article', { class: 'carte carte-prise' },
      ouvrir,
      el('p', { class: 'resume' }, resume),
      detail,
      el('div', { class: 'ligne' },
        el('button', { class: 'bouton', type: 'button', onclick: () => naviguer(`saisie-prise-alimentaire/${prise.id}`) }, 'Modifier'),
        el('button', {
          class: 'bouton bouton--danger', type: 'button',
          onclick: async () => {
            const heure = heureLocale(new Date(prise.horodatage_prise));
            if (!(await confirmer({ message: `Supprimer la prise alimentaire de ${heure} (${prise.type_prise_alimentaire?.libelle}) ?`, libelleOui: 'Supprimer', danger: true }))) return;
            try {
              await supprimerPrise(contexte.mandant.id, prise.id);
              notifier('Prise alimentaire supprimée');
              charger();
            } catch (erreur) {
              notifier(erreur.message);
            }
          },
        }, 'Supprimer')));
    if (contexte.priseMiseEnEvidence === prise.id) {
      carte.style.outline = '3px solid var(--couleur-principale)';
      setTimeout(() => { carte.style.outline = ''; }, 2500);
      contexte.priseMiseEnEvidence = null;
    }
    return carte;
  };

  async function charger() {
    remplacer(zoneListe, chargement());
    remplacer(zoneTotal);
    try {
      const prises = await listerPrisesDuJour(contexte.mandant.id, contexte.dateSelectionnee);
      if (!actif) return;
      const total = agregerAgregats(prises.map((p) => agregerElements(p.elements)));
      remplacer(zoneTotal, el('div', { class: 'ligne' },
        el('span', { class: 'total-jour' }, `${formaterValeur('energie_kcal', total.valeurs.energie_kcal)} kcal`),
        prises.length > 0 && indicateurIncompletude(total.causes)));
      remplacer(zoneListe, prises.length === 0
        ? el('div', { class: 'carte pile' },
          el('p', {}, 'Aucune prise alimentaire ce jour'),
          el('button', { class: 'bouton bouton--principal', type: 'button', onclick: () => naviguer('saisie-prise-alimentaire') }, 'Ajouter une prise alimentaire'))
        : prises.map(carteDePrise));
    } catch (erreur) {
      if (actif) remplacer(zoneListe, bandeauErreur(erreur.message, charger));
    }
  }

  remplacer(conteneur, navigationDate(contexte, () => afficher(conteneur, contexte)), zoneTotal, zoneListe);
  charger();
  return () => { actif = false; };
}
