// Feuilles de création et de complément d'un aliment à la volée (docs/03 §5.4.4, RG-REF-02,
// RG-ETAT-01, RG-ETAT-02). Utilisées depuis la saisie d'une prise alimentaire.
import { el, remplacer } from '../../dom.js';
import { ouvrirFeuille, bandeauErreur } from '../../ui.js';
import { creerAliment, modifierAliment } from '../../../../shared/services/aliment.service.js';
import { GRANDEURS_ALIMENT, LIBELLES_GRANDEURS, UNITES_GRANDEURS } from '../../../../shared/utils/grandeurs.js';
import { lireNombre, formaterNombre } from '../../../../shared/utils/calcul-nutritionnel.js';

function champNombre(libelle, valeur, aide) {
  const saisie = el('input', { class: 'saisie', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: formaterNombre(valeur) });
  return { saisie, noeud: el('label', { class: 'champ' }, el('span', {}, libelle), saisie, aide && el('small', { class: 'texte-secondaire' }, aide)) };
}

/** Lit les champs de valeurs ; renvoie { valeurs, erreur }. Un champ vide = non renseigné (null). */
function lireValeurs(champs) {
  const valeurs = {};
  for (const [g, { saisie }] of Object.entries(champs)) {
    const v = lireNombre(saisie.value);
    if (Number.isNaN(v) || (v !== null && v < 0)) return { erreur: `${LIBELLES_GRANDEURS[g]} : saisissez un nombre positif ou laissez vide.` };
    if (g === 'index_glycemique' && v !== null && (!Number.isInteger(v) || v > 150)) {
      return { erreur: 'Index glycémique : entier de 0 à 150, ou laissez vide.' };
    }
    valeurs[g] = v;
  }
  return { valeurs };
}

function grilleValeurs(aliment) {
  const champs = {};
  for (const g of GRANDEURS_ALIMENT) {
    const unite = UNITES_GRANDEURS[g];
    champs[g] = champNombre(`${LIBELLES_GRANDEURS[g]}${unite ? ` (${unite})` : ''}`, aliment?.[g]);
  }
  return { champs, noeud: el('div', { class: 'grille-valeurs' }, Object.values(champs).map((c) => c.noeud)) };
}

/**
 * Créer un aliment à la volée. surCree(aliment) est appelé après l'enregistrement.
 */
export function ouvrirCreationAliment({ mandantId, nomInitial, surCree }) {
  const { feuille, fermer } = ouvrirFeuille({ titre: 'Créer un aliment', pleine: true });
  const zoneErreur = el('div', { 'aria-live': 'polite' });
  const nom = el('input', { class: 'saisie', type: 'text', value: nomInitial ?? '', autocomplete: 'off', required: true });
  let cuisinable = null; // choix obligatoire, aucun présélectionné
  const rendement = champNombre('Rendement de cuisson (facultatif)', null, 'Poids cuit ÷ poids cru, ex. 2,5 pour du riz');
  rendement.noeud.hidden = true;
  const { champs, noeud: grille } = grilleValeurs(null);
  const resumeValeurs = el('summary', {}, 'Renseigner les valeurs nutritionnelles maintenant (facultatif)');

  const choix = (valeur, libelle) => el('label', { class: 'carte-mandant' },
    el('input', {
      type: 'radio', name: 'nature-aliment',
      onchange: () => {
        cuisinable = valeur;
        rendement.noeud.hidden = !valeur;
        resumeValeurs.textContent = valeur
          ? 'Renseigner les valeurs nutritionnelles aux 100 g cru maintenant (facultatif)'
          : 'Renseigner les valeurs nutritionnelles aux 100 g maintenant (facultatif)';
      },
    }),
    el('span', {}, libelle));

  const bouton = el('button', { class: 'bouton bouton--principal bouton--large', type: 'button' }, 'Créer et ajouter');
  bouton.addEventListener('click', async () => {
    remplacer(zoneErreur);
    if (!nom.value.trim()) return remplacer(zoneErreur, bandeauErreur('Saisissez le nom de l\'aliment.'));
    if (cuisinable === null) return remplacer(zoneErreur, bandeauErreur('Indiquez si l\'aliment se cuisine ou s\'il est à état unique.'));
    const r = lireNombre(rendement.saisie.value);
    if (cuisinable && (Number.isNaN(r) || (r !== null && r <= 0))) {
      return remplacer(zoneErreur, bandeauErreur('Le rendement de cuisson doit être un nombre strictement positif.'));
    }
    const { valeurs, erreur } = lireValeurs(champs);
    if (erreur) return remplacer(zoneErreur, bandeauErreur(erreur));
    bouton.disabled = true;
    bouton.setAttribute('aria-busy', 'true');
    try {
      const aliment = await creerAliment(mandantId, {
        nom: nom.value, est_cuisinable: cuisinable, rendement_cuisson: cuisinable ? r : null, ...valeurs,
      });
      fermer();
      surCree(aliment);
    } catch (e) {
      remplacer(zoneErreur, bandeauErreur(e.message));
      bouton.disabled = false;
      bouton.removeAttribute('aria-busy');
    }
  });

  remplacer(feuille,
    el('div', { class: 'ligne ligne--espacee' },
      el('h2', {}, 'Créer un aliment'),
      el('button', { class: 'bouton bouton--icone', type: 'button', 'aria-label': 'Fermer', onclick: fermer }, '✕')),
    zoneErreur,
    el('label', { class: 'champ' }, el('span', {}, 'Nom'), nom),
    el('fieldset', { class: 'pile', style: 'border: 0; padding: 0; margin: 0' },
      el('legend', { class: 'texte-secondaire', style: 'margin-bottom: 8px' }, 'Nature de l\'aliment'),
      choix(true, 'Se cuisine (pesé cru ou cuit)'),
      choix(false, 'État unique')),
    rendement.noeud,
    el('details', { class: 'valeurs-facultatives' }, resumeValeurs, grille),
    bouton);
  nom.focus();
}

/** Compléter un aliment existant : rendement et valeurs nutritionnelles (RG-REF-05). */
export function ouvrirComplementAliment({ mandantId, aliment, surModifie }) {
  const { feuille, fermer } = ouvrirFeuille({ titre: `Compléter ${aliment.nom}`, pleine: true });
  const zoneErreur = el('div', { 'aria-live': 'polite' });
  const rendement = aliment.est_cuisinable
    ? champNombre('Rendement de cuisson', aliment.rendement_cuisson, 'Poids cuit ÷ poids cru, ex. 2,5 pour du riz')
    : null;
  const { champs, noeud: grille } = grilleValeurs(aliment);
  const manuel = el('input', { type: 'checkbox', checked: aliment.est_non_evalue_manuel });
  const bouton = el('button', { class: 'bouton bouton--principal bouton--large', type: 'button' }, 'Enregistrer');
  bouton.addEventListener('click', async () => {
    remplacer(zoneErreur);
    const { valeurs, erreur } = lireValeurs(champs);
    if (erreur) return remplacer(zoneErreur, bandeauErreur(erreur));
    const champsModifies = { ...valeurs, est_non_evalue_manuel: manuel.checked };
    if (rendement) {
      const r = lireNombre(rendement.saisie.value);
      if (Number.isNaN(r) || (r !== null && r <= 0)) return remplacer(zoneErreur, bandeauErreur('Le rendement de cuisson doit être un nombre strictement positif.'));
      champsModifies.rendement_cuisson = r;
    }
    bouton.disabled = true;
    try {
      const modifie = await modifierAliment(mandantId, aliment.id, champsModifies);
      fermer();
      surModifie(modifie);
    } catch (e) {
      remplacer(zoneErreur, bandeauErreur(e.message));
      bouton.disabled = false;
    }
  });
  remplacer(feuille,
    el('div', { class: 'ligne ligne--espacee' },
      el('h2', {}, `Compléter ${aliment.nom}`),
      el('button', { class: 'bouton bouton--icone', type: 'button', 'aria-label': 'Fermer', onclick: fermer }, '✕')),
    zoneErreur,
    el('p', { class: 'texte-secondaire' }, aliment.est_cuisinable ? 'Valeurs aux 100 g cru. Laissez vide une valeur inconnue (différent de 0).' : 'Valeurs aux 100 g. Laissez vide une valeur inconnue (différent de 0).'),
    rendement?.noeud,
    grille,
    el('label', { class: 'ligne' }, manuel, el('span', {}, 'Marquer comme non évalué (estimation à vérifier)')),
    bouton);
}

/** Renseigner le seul rendement de cuisson, avec aide au calcul (docs/03 §5.4.4). */
export function ouvrirRendement({ mandantId, aliment, surModifie }) {
  const { feuille, fermer } = ouvrirFeuille({ titre: 'Rendement de cuisson' });
  const zoneErreur = el('div', { 'aria-live': 'polite' });
  const rendement = champNombre('Rendement de cuisson', aliment.rendement_cuisson, 'Poids cuit ÷ poids cru, ex. 2,5 pour du riz');
  const cru = champNombre('Poids cru pesé (g)', null);
  const cuit = champNombre('Poids cuit pesé (g)', null);
  const calculer = () => {
    const a = lireNombre(cru.saisie.value);
    const b = lireNombre(cuit.saisie.value);
    if (a > 0 && b > 0) rendement.saisie.value = formaterNombre(Math.round((b / a) * 1000) / 1000);
  };
  cru.saisie.addEventListener('input', calculer);
  cuit.saisie.addEventListener('input', calculer);
  const bouton = el('button', { class: 'bouton bouton--principal bouton--large', type: 'button' }, 'Enregistrer');
  bouton.addEventListener('click', async () => {
    const r = lireNombre(rendement.saisie.value);
    if (r === null || Number.isNaN(r) || r <= 0) return remplacer(zoneErreur, bandeauErreur('Le rendement de cuisson doit être un nombre strictement positif.'));
    bouton.disabled = true;
    try {
      const modifie = await modifierAliment(mandantId, aliment.id, { rendement_cuisson: r });
      fermer();
      surModifie(modifie);
    } catch (e) {
      remplacer(zoneErreur, bandeauErreur(e.message));
      bouton.disabled = false;
    }
  });
  remplacer(feuille,
    el('h2', {}, `Rendement de cuisson — ${aliment.nom}`),
    zoneErreur,
    rendement.noeud,
    el('details', {}, el('summary', { style: 'cursor: pointer; min-height: 44px; display: flex; align-items: center' }, 'Calculer à partir d\'une pesée'),
      el('div', { class: 'grille-valeurs' }, cru.noeud, cuit.noeud)),
    bouton,
    el('button', { class: 'bouton bouton--large', type: 'button', onclick: fermer }, 'Annuler'));
  rendement.saisie.focus();
}
