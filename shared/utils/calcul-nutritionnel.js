// Calculs nutritionnels (RG-CAL-01 à 06, RG-ETAT-02). Fonctions pures, sans arrondi
// intermédiaire : l'arrondi n'intervient qu'à l'affichage (formaterValeur).
//
// Les objets manipulés reprennent les colonnes de la base (docs/04 §3) :
// - aliment : { est_cuisinable, rendement_cuisson, energie_kcal, …, est_non_evalue_manuel }
// - plat préparé : { base_valeurs, poids_total_g, energie_kcal, … }
// - recette : { poids_total_net_g, compositions: [{ aliment, etat_aliment, poids_g, est_element_supprime }] }
// - élément de prise alimentaire : { type_element, aliment | recette | plat_prepare, etat_aliment,
//   mode_portion, portion_grammes, portion_pourcentage, portion_numerateur, portion_denominateur,
//   est_element_supprime }
import { GRANDEURS_AGREGEABLES, valeursAZero, estRenseigne } from './grandeurs.js';
import { estEvalue } from './statut-aliment.js';

/** Causes d'incomplétude (RG-CAL-05, docs/03 §4.1). */
export const CAUSES = Object.freeze({
  ALIMENT_NON_EVALUE: 'ALIMENT_NON_EVALUE',
  ELEMENT_PARTIELLEMENT_EVALUE: 'ELEMENT_PARTIELLEMENT_EVALUE',
  ELEMENT_SUPPRIME: 'ELEMENT_SUPPRIME',
});

export const LIBELLES_CAUSES = Object.freeze({
  ALIMENT_NON_EVALUE: 'Contient un aliment non évalué',
  ELEMENT_PARTIELLEMENT_EVALUE: 'Contient un élément partiellement évalué',
  ELEMENT_SUPPRIME: 'Contient un élément supprimé',
});

function num(v) {
  return estRenseigne(v) ? Number(v) : 0; // RG-CAL-04 : non renseigné compté pour 0
}

function multiplier(valeurs, facteur) {
  const r = {};
  for (const g of GRANDEURS_AGREGEABLES) r[g] = valeurs[g] * facteur;
  return r;
}

function ajouter(cible, valeurs) {
  for (const g of GRANDEURS_AGREGEABLES) cible[g] += valeurs[g];
  return cible;
}

/**
 * Poids équivalent cru (RG-CAL-02) : poids pesé pour un aliment à état unique ou pesé CRU ;
 * poids pesé ÷ rendement pour un aliment pesé CUIT ; null si le rendement manque.
 */
export function poidsEquivalent(aliment, poidsPese, etat) {
  if (!aliment.est_cuisinable || etat !== 'CUIT') return Number(poidsPese);
  if (!estRenseigne(aliment.rendement_cuisson) || Number(aliment.rendement_cuisson) <= 0) return null;
  return Number(poidsPese) / Number(aliment.rendement_cuisson);
}

/**
 * Contribution d'un aliment pesé. Renvoie { valeurs, causes } où causes est un tableau
 * de causes d'incomplétude (vide si l'aliment est évalué).
 */
export function contributionAliment(aliment, poidsPese, etat) {
  if (!aliment) return { valeurs: valeursAZero(), causes: [CAUSES.ELEMENT_SUPPRIME] };
  const causes = estEvalue(aliment) ? [] : [CAUSES.ALIMENT_NON_EVALUE];
  const poids = poidsEquivalent(aliment, poidsPese, etat);
  if (poids === null) return { valeurs: valeursAZero(), causes: [CAUSES.ALIMENT_NON_EVALUE] };
  const valeurs = {};
  for (const g of GRANDEURS_AGREGEABLES) valeurs[g] = (num(aliment[g]) * poids) / 100;
  return { valeurs, causes };
}

/** Valeurs d'un plat préparé entier (RG-REC-02) et caractère partiellement évalué. */
export function valeursPlatEntier(plat) {
  const valeurs = valeursAZero();
  let partiel = false;
  const facteur = plat.base_valeurs === 'PAR_100G' ? num(plat.poids_total_g) / 100 : 1;
  for (const g of GRANDEURS_AGREGEABLES) {
    if (!estRenseigne(plat[g])) partiel = true;
    valeurs[g] = num(plat[g]) * facteur;
  }
  return { valeurs, partiellementEvalue: partiel };
}

/** Valeurs d'une recette entière (somme de ses aliments) et caractère partiellement évalué (RG-CAL-05). */
export function valeursRecetteEntiere(recette) {
  const valeurs = valeursAZero();
  let partiel = false;
  for (const c of recette.compositions ?? []) {
    if (c.est_element_supprime || !c.aliment) {
      partiel = true;
      continue;
    }
    const contribution = contributionAliment(c.aliment, c.poids_g, c.etat_aliment);
    if (contribution.causes.length > 0) partiel = true;
    ajouter(valeurs, contribution.valeurs);
  }
  return { valeurs, partiellementEvalue: partiel };
}

/**
 * Ratio de portion d'une recette ou d'un plat préparé (RG-CAL-02) :
 * % / 100, a / b, ou poids consommé / poids total. null si incalculable.
 */
export function ratioPortion(element, poidsTotal) {
  switch (element.mode_portion) {
    case 'POURCENTAGE':
      return Number(element.portion_pourcentage) / 100;
    case 'PART':
      return Number(element.portion_numerateur) / Number(element.portion_denominateur);
    case 'GRAMMES':
      return estRenseigne(poidsTotal) && Number(poidsTotal) > 0
        ? Number(element.portion_grammes) / Number(poidsTotal)
        : null;
    default:
      return null;
  }
}

/** Contribution d'un élément de prise alimentaire : { valeurs, causes }. */
export function contributionElement(element) {
  if (element.est_element_supprime) {
    return { valeurs: valeursAZero(), causes: [CAUSES.ELEMENT_SUPPRIME] };
  }
  switch (element.type_element) {
    case 'ALIMENT':
      return contributionAliment(element.aliment, element.portion_grammes, element.etat_aliment);
    case 'RECETTE': {
      if (!element.recette) return { valeurs: valeursAZero(), causes: [CAUSES.ELEMENT_SUPPRIME] };
      const { valeurs, partiellementEvalue } = valeursRecetteEntiere(element.recette);
      const ratio = ratioPortion(element, element.recette.poids_total_net_g);
      return {
        valeurs: ratio === null ? valeursAZero() : multiplier(valeurs, ratio),
        causes: partiellementEvalue || ratio === null ? [CAUSES.ELEMENT_PARTIELLEMENT_EVALUE] : [],
      };
    }
    case 'PLAT_PREPARE': {
      if (!element.plat_prepare) return { valeurs: valeursAZero(), causes: [CAUSES.ELEMENT_SUPPRIME] };
      const { valeurs, partiellementEvalue } = valeursPlatEntier(element.plat_prepare);
      const ratio = ratioPortion(element, element.plat_prepare.poids_total_g);
      return {
        valeurs: ratio === null ? valeursAZero() : multiplier(valeurs, ratio),
        causes: partiellementEvalue || ratio === null ? [CAUSES.ELEMENT_PARTIELLEMENT_EVALUE] : [],
      };
    }
    default:
      return { valeurs: valeursAZero(), causes: [] };
  }
}

/**
 * Agrégat nutritionnel d'une liste d'éléments (RG-CAL-03) : somme exacte, sans arrondi.
 * Renvoie { valeurs, causes (sans doublon), estIncomplet }.
 */
export function agregerElements(elements) {
  const valeurs = valeursAZero();
  const causes = new Set();
  for (const e of elements) {
    const c = contributionElement(e);
    ajouter(valeurs, c.valeurs);
    c.causes.forEach((x) => causes.add(x));
  }
  return { valeurs, causes: [...causes], estIncomplet: causes.size > 0 };
}

/** Agrégat de plusieurs agrégats (prises d'une journée, journées d'une période). */
export function agregerAgregats(agregats) {
  const valeurs = valeursAZero();
  const causes = new Set();
  for (const a of agregats) {
    ajouter(valeurs, a.valeurs);
    a.causes.forEach((x) => causes.add(x));
  }
  return { valeurs, causes: [...causes], estIncomplet: causes.size > 0 };
}

const FORMAT_ENTIER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const FORMAT_DECIMAL = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const FORMAT_LIBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/**
 * Arrondi à l'affichage seulement (RG-CAL-01) : entier pour kcal et IG, une décimale
 * pour les grammes, virgule décimale. Une valeur non renseignée s'affiche « — » (docs/03 §4.3).
 */
export function formaterValeur(grandeur, valeur) {
  if (!estRenseigne(valeur)) return '—';
  const v = Number(valeur);
  if (grandeur === 'energie_kcal' || grandeur === 'index_glycemique') return FORMAT_ENTIER.format(v);
  return FORMAT_DECIMAL.format(v);
}

/** Nombre saisi par l'utilisateur, affiché sans arrondi forcé (ex. rendement 2,5 ; portion 150). */
export function formaterNombre(valeur) {
  return estRenseigne(valeur) ? FORMAT_LIBRE.format(Number(valeur)) : '';
}

/** Lecture d'un nombre saisi avec virgule ou point. null si vide ; NaN si invalide. */
export function lireNombre(texte) {
  if (texte === null || texte === undefined) return null;
  const t = String(texte).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

/** Libellé d'une portion : « 150 g », « 50 % », « 1/4 ». */
export function libellePortion(element) {
  switch (element.mode_portion) {
    case 'GRAMMES':
      return `${formaterNombre(element.portion_grammes)} g`;
    case 'POURCENTAGE':
      return `${formaterNombre(element.portion_pourcentage)} %`;
    case 'PART':
      return `${element.portion_numerateur}/${element.portion_denominateur}`;
    default:
      return '';
  }
}
