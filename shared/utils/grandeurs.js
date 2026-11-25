// Grandeurs nutritionnelles du socle (RG-REF-01), dans l'ordre d'affichage.
// Noms identiques aux colonnes de la base (docs/04 §3.3).

/** Les 8 grandeurs agrégeables (l'index glycémique n'est jamais agrégé, RG-CAL-03). */
export const GRANDEURS_AGREGEABLES = Object.freeze([
  'energie_kcal',
  'glucides_g',
  'sucres_g',
  'lipides_g',
  'acides_gras_satures_g',
  'proteines_g',
  'fibres_g',
  'sel_g',
]);

/** Les 9 grandeurs d'un aliment (RG-REF-01). */
export const GRANDEURS_ALIMENT = Object.freeze([...GRANDEURS_AGREGEABLES, 'index_glycemique']);

export const LIBELLES_GRANDEURS = Object.freeze({
  energie_kcal: 'Énergie',
  glucides_g: 'Glucides',
  sucres_g: 'dont sucres',
  lipides_g: 'Lipides',
  acides_gras_satures_g: 'dont acides gras saturés',
  proteines_g: 'Protéines',
  fibres_g: 'Fibres',
  sel_g: 'Sel',
  index_glycemique: 'Index glycémique',
});

export const UNITES_GRANDEURS = Object.freeze({
  energie_kcal: 'kcal',
  glucides_g: 'g',
  sucres_g: 'g',
  lipides_g: 'g',
  acides_gras_satures_g: 'g',
  proteines_g: 'g',
  fibres_g: 'g',
  sel_g: 'g',
  index_glycemique: '',
});

/** Code de grandeur des cibles nutritionnelles (docs/04 §3.7) ↔ nom de colonne. */
export const GRANDEUR_DE_CIBLE = Object.freeze({
  ENERGIE_KCAL: 'energie_kcal',
  GLUCIDES_G: 'glucides_g',
  SUCRES_G: 'sucres_g',
  LIPIDES_G: 'lipides_g',
  ACIDES_GRAS_SATURES_G: 'acides_gras_satures_g',
  PROTEINES_G: 'proteines_g',
  FIBRES_G: 'fibres_g',
  SEL_G: 'sel_g',
});

/** Un jeu de valeurs à zéro pour les 8 grandeurs agrégeables. */
export function valeursAZero() {
  const v = {};
  for (const g of GRANDEURS_AGREGEABLES) v[g] = 0;
  return v;
}

/** Valeur numérique ou null (non renseigné, distinct de 0 — RG-REF-03). */
export function estRenseigne(valeur) {
  return valeur !== null && valeur !== undefined && valeur !== '' && Number.isFinite(Number(valeur));
}
