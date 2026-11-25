import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lireFichierAliments, planifierImport, exporterJson, exporterCsv, nomFichierExport, cleNom,
} from '../../shared/utils/format-aliments.js';

const JSON_EXEMPLE = JSON.stringify({
  format: 'suivi-repas/aliments', version: 1, mandant: 'REAL', exporte_le: '2026-11-25T20:45:00Z',
  aliments: [
    { nom: 'Riz basmati', cuisinable: true, rendement_cuisson: 2.5, energie_kcal: 351, glucides_g: 77.8, sucres_g: 0.3, lipides_g: 0.9,
      acides_gras_satures_g: 0.2, proteines_g: 8.1, fibres_g: 1.6, sel_g: 0.01, index_glycemique: 58, source: 'Ciqual 2025' },
    { nom: 'Moutarde', cuisinable: false, energie_kcal: 151, glucides_g: 3.5, sucres_g: 2.4, lipides_g: 11.3,
      acides_gras_satures_g: 0.6, proteines_g: 7.1, fibres_g: null, sel_g: 6.0, index_glycemique: null },
  ],
});

const CSV_EXEMPLE = '﻿nom;cuisinable;rendement_cuisson;energie_kcal;glucides_g;sucres_g;lipides_g;acides_gras_satures_g;proteines_g;fibres_g;sel_g;index_glycemique;icone;non_evalue_manuel;archive;source\r\n'
  + 'Riz basmati;oui;2,5;351;77,8;0,3;0,9;0,2;8,1;1,6;0,01;58;;non;non;Ciqual 2025\r\n'
  + 'Moutarde;non;;151;3,5;2,4;11,3;0,6;7,1;;6;;;non;non;\r\n';

test('lecture JSON et CSV du format §3.8 : mêmes aliments', () => {
  const j = lireFichierAliments(JSON_EXEMPLE);
  const c = lireFichierAliments(CSV_EXEMPLE);
  assert.equal(j.erreurFichier, null);
  assert.equal(c.erreurFichier, null);
  // Le CSV porte explicitement non_evalue_manuel = non, absent du JSON : on compare le reste.
  const sansDerogation = ({ est_non_evalue_manuel, ...reste }) => reste;
  assert.deepEqual(j.lignes.map((l) => l.aliment), c.lignes.map((l) => sansDerogation(l.aliment)));
  assert.equal(c.lignes[0].aliment.est_non_evalue_manuel, false);
  assert.equal(c.lignes[0].aliment.rendement_cuisson, 2.5);
  assert.equal(c.lignes[1].aliment.fibres_g, undefined, 'vide = non renseigné');
  assert.equal(c.lignes[1].aliment.sel_g, 6);
});

test('erreurs bloquantes par ligne', () => {
  const csv = 'nom;cuisinable;rendement_cuisson;energie_kcal;index_glycemique\n'
    + ';oui;;;\n'
    + 'A;peut-être;;;\n'
    + 'B;non;1,2;;\n'
    + 'C;oui;0;;\n'
    + 'D;non;;-5;\n'
    + 'E;non;;abc;\n'
    + 'F;non;;;151\n'
    + 'G;non;;;\n'
    + 'g ;non;;;\n'
    + 'H;oui;2;100;40\n';
  const { lignes } = lireFichierAliments(csv);
  const rejetees = lignes.filter((l) => l.erreurs.length > 0).map((l) => l.numero);
  assert.deepEqual(rejetees, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(lignes[9].erreurs, []);
});

test('CA-17 : réimport d\'un export avec « Ignorer » ne crée aucun doublon ; sans fibres → non évalué', () => {
  const { lignes } = lireFichierAliments(JSON_EXEMPLE);
  const existants = [{ id: 'a1', nom: ' riz BASMATI ', est_cuisinable: true }];
  const plan = planifierImport(lignes, existants, () => 'IGNORER');
  assert.deepEqual(plan.compteRendu, { crees: 1, mis_a_jour: 0, ignores: 1, rejetes: 0, non_evalues: 1 });
  assert.equal(plan.operations.find((o) => o.type === 'CREER').nom, 'Moutarde');
});

test('mise à jour : seuls les champs renseignés remplacent ; changement de cuisinable refusé si utilisé', () => {
  const { lignes } = lireFichierAliments('nom;cuisinable;energie_kcal;fibres_g\nRiz basmati;oui;360;\nPâtes;non;350;3\n');
  const existants = [
    { id: 'a1', nom: 'Riz basmati', est_cuisinable: true, fibres_g: 1.6 },
    { id: 'a2', nom: 'pâtes', est_cuisinable: true },
  ];
  const plan = planifierImport(lignes, existants, () => 'METTRE_A_JOUR', new Set(['a2']));
  const maj = plan.operations[0];
  assert.equal(maj.type, 'METTRE_A_JOUR');
  assert.deepEqual(maj.valeurs, { est_cuisinable: true, energie_kcal: 360 });
  assert.equal(plan.operations[1].type, 'REJETER');
});

test('export JSON et CSV réimportables, nom de fichier', () => {
  const aliments = [{ nom: 'Riz; "long"', est_cuisinable: true, rendement_cuisson: 2.5, energie_kcal: 351, fibres_g: null, est_archive: false }];
  const csv = exporterCsv(aliments);
  assert.ok(csv.startsWith('﻿nom;cuisinable;'));
  assert.ok(csv.includes('2,5'));
  const relu = lireFichierAliments(csv).lignes[0].aliment;
  assert.equal(relu.nom, 'Riz; "long"');
  assert.equal(relu.rendement_cuisson, 2.5);
  const json = JSON.parse(exporterJson(aliments, 'TEST', new Date('2026-11-25T20:45:00.123Z')));
  assert.equal(json.exporte_le, '2026-11-25T20:45:00Z');
  assert.equal(lireFichierAliments(JSON.stringify(json)).lignes[0].aliment.energie_kcal, 351);
  assert.equal(nomFichierExport('REAL', '2026-11-25', 'csv'), 'aliments-REAL-2026-11-25.csv');
  assert.equal(cleNom('  Riz '), 'riz');
});
