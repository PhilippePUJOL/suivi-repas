import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contributionAliment, contributionElement, agregerElements, formaterValeur, ratioPortion,
  valeursPlatEntier, lireNombre, libellePortion, CAUSES,
} from '../../shared/utils/calcul-nutritionnel.js';
import { statutAliment, grandeursManquantes } from '../../shared/utils/statut-aliment.js';

const complet = { energie_kcal: 100, glucides_g: 10, sucres_g: 1, lipides_g: 1, acides_gras_satures_g: 0.1, proteines_g: 3, fibres_g: 2, sel_g: 0, index_glycemique: 50 };
const riz = { ...complet, energie_kcal: 350, est_cuisinable: true, rendement_cuisson: 2.5 };

test('CA-04 : 150 g de riz cuit (rendement 2,5) = 60 g cru = 210 kcal', () => {
  assert.equal(contributionAliment(riz, 150, 'CUIT').valeurs.energie_kcal, 210);
  assert.equal(contributionAliment(riz, 60, 'CRU').valeurs.energie_kcal, 210);
});

test('CA-04 : pesée cuite sans rendement = 0 avec avertissement', () => {
  const r = contributionAliment({ ...riz, rendement_cuisson: null }, 150, 'CUIT');
  assert.equal(r.valeurs.energie_kcal, 0);
  assert.deepEqual(r.causes, [CAUSES.ALIMENT_NON_EVALUE]);
});

test('aliment à état unique : valeurs appliquées au poids pesé', () => {
  const moutarde = { ...complet, energie_kcal: 151, est_cuisinable: false };
  assert.equal(contributionAliment(moutarde, 10, null).valeurs.energie_kcal, 15.1);
});

test('CA-18 : 12,345 g de protéines aux 100 g × 150 g → affiché 18,5 g, sans arrondi intermédiaire', () => {
  const a = { ...complet, proteines_g: 12.345 };
  const v = contributionAliment(a, 150, null).valeurs.proteines_g;
  assert.ok(Math.abs(v - 18.5175) < 1e-9);
  assert.equal(formaterValeur('proteines_g', v), '18,5');
  // Somme sur valeurs non arrondies : 3 × 0,04 = 0,12 → 0,1 (et non 0,0 + 0,0 + 0,0)
  const petit = { ...complet, sel_g: 0.04 };
  const agregat = agregerElements([1, 2, 3].map(() => ({ type_element: 'ALIMENT', aliment: petit, mode_portion: 'GRAMMES', portion_grammes: 100 })));
  assert.equal(formaterValeur('sel_g', agregat.valeurs.sel_g), '0,1');
});

test('RG-CAL-04 / CA-06 : grandeur non renseignée comptée 0, prise signalée incomplète', () => {
  const nonEvalue = { nom: 'Mystère', est_cuisinable: false, energie_kcal: 200 };
  const agregat = agregerElements([
    { type_element: 'ALIMENT', aliment: { ...complet, est_cuisinable: false }, mode_portion: 'GRAMMES', portion_grammes: 100 },
    { type_element: 'ALIMENT', aliment: nonEvalue, mode_portion: 'GRAMMES', portion_grammes: 50 },
  ]);
  assert.equal(agregat.valeurs.energie_kcal, 200);
  assert.equal(agregat.valeurs.proteines_g, 3);
  assert.equal(agregat.estIncomplet, true);
  assert.deepEqual(agregat.causes, [CAUSES.ALIMENT_NON_EVALUE]);
});

test('élément supprimé : 0 et avertissement', () => {
  const r = contributionElement({ type_element: 'ALIMENT', aliment: null, est_element_supprime: true, mode_portion: 'GRAMMES', portion_grammes: 80 });
  assert.equal(r.valeurs.energie_kcal, 0);
  assert.deepEqual(r.causes, [CAUSES.ELEMENT_SUPPRIME]);
});

test('CA-11 : recette sans poids total consommée en part 1/4 ou à 150 %', () => {
  const gateau = { poids_total_net_g: null, compositions: [
    { aliment: { ...complet, energie_kcal: 400, est_cuisinable: false }, poids_g: 500, etat_aliment: null },
  ] };
  const quart = contributionElement({ type_element: 'RECETTE', recette: gateau, mode_portion: 'PART', portion_numerateur: 1, portion_denominateur: 4 });
  assert.equal(quart.valeurs.energie_kcal, 500);
  assert.deepEqual(quart.causes, []);
  const p150 = contributionElement({ type_element: 'RECETTE', recette: gateau, mode_portion: 'POURCENTAGE', portion_pourcentage: 150 });
  assert.equal(p150.valeurs.energie_kcal, 3000);
  assert.equal(ratioPortion({ mode_portion: 'GRAMMES', portion_grammes: 100 }, null), null);
});

test('recette contenant un aliment non évalué : élément partiellement évalué', () => {
  const r = contributionElement({ type_element: 'RECETTE', mode_portion: 'POURCENTAGE', portion_pourcentage: 100,
    recette: { compositions: [{ aliment: { nom: 'X', est_cuisinable: false }, poids_g: 100 }] } });
  assert.deepEqual(r.causes, [CAUSES.ELEMENT_PARTIELLEMENT_EVALUE]);
});

test('plat préparé aux 100 g et pour le plat entier (RG-REC-02)', () => {
  const p100 = { base_valeurs: 'PAR_100G', poids_total_g: 400, ...complet };
  assert.equal(valeursPlatEntier(p100).valeurs.energie_kcal, 400);
  const entier = { base_valeurs: 'PLAT_ENTIER', poids_total_g: null, ...complet, fibres_g: null };
  const v = valeursPlatEntier(entier);
  assert.equal(v.valeurs.energie_kcal, 100);
  assert.equal(v.partiellementEvalue, true);
  const enGrammes = contributionElement({ type_element: 'PLAT_PREPARE', plat_prepare: p100, mode_portion: 'GRAMMES', portion_grammes: 100 });
  assert.equal(enGrammes.valeurs.energie_kcal, 100);
});

test('CA-05 : statut de l\'aliment', () => {
  assert.equal(statutAliment({ nom: 'Pomme', est_cuisinable: false }), 'NON_EVALUE');
  const { index_glycemique, ...huit } = complet;
  assert.equal(statutAliment(huit), 'NON_EVALUE');
  assert.equal(statutAliment(complet), 'EVALUE');
  assert.equal(statutAliment({ ...huit, glucides_g: 0, sucres_g: 0 }), 'EVALUE');
  assert.equal(statutAliment({ ...complet, est_non_evalue_manuel: true }), 'NON_EVALUE');
  assert.equal(statutAliment({ ...complet, est_cuisinable: true }), 'NON_EVALUE');
  assert.deepEqual(grandeursManquantes({ ...complet, est_cuisinable: true }), ['rendement_cuisson']);
  assert.equal(statutAliment({ ...complet, fibres_g: 0 }), 'EVALUE', '0 est une valeur renseignée');
});

test('affichage : arrondis, tiret pour non renseigné, lecture des nombres saisis', () => {
  assert.equal(formaterValeur('energie_kcal', 209.6), '210');
  assert.equal(formaterValeur('fibres_g', null), '—');
  assert.equal(formaterValeur('fibres_g', 0), '0,0');
  assert.equal(lireNombre('2,5'), 2.5);
  assert.equal(lireNombre(''), null);
  assert.ok(Number.isNaN(lireNombre('abc')));
  assert.equal(libellePortion({ mode_portion: 'PART', portion_numerateur: 1, portion_denominateur: 4 }), '1/4');
  assert.equal(libellePortion({ mode_portion: 'GRAMMES', portion_grammes: 150 }), '150 g');
});
