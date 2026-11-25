import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estDansFenetre, typePreselectionne, dateLocale, decalerDate, instantLocal, libelleDate,
} from '../../shared/utils/fenetre-temporelle.js';

const types = [
  { libelle: 'Déjeuner', fenetre_debut: '11:30:00', fenetre_fin: '14:30:00', priorite: 1 },
  { libelle: 'Apéritif', fenetre_debut: '17:00:00', fenetre_fin: '19:00:00', priorite: 2 },
  { libelle: 'Goûter', fenetre_debut: '16:00:00', fenetre_fin: '18:00:00', priorite: 3, est_type_par_defaut: true },
  { libelle: 'Collation nocturne', fenetre_debut: '23:00:00', fenetre_fin: '05:00:00', priorite: 4 },
  { libelle: 'Archivé', fenetre_debut: '00:00:00', fenetre_fin: '23:59:00', priorite: 0, est_archive: true },
];

test('début inclus, fin exclue (RG-TMP-03)', () => {
  assert.equal(estDansFenetre('11:30', '11:30', '14:30'), true);
  assert.equal(estDansFenetre('14:30', '11:30', '14:30'), false);
  assert.equal(estDansFenetre('10:00', '10:00', '10:00'), false);
});

test('passage de minuit (RG-TMP-03, CA-03)', () => {
  assert.equal(estDansFenetre('00:30', '23:00', '05:00'), true);
  assert.equal(estDansFenetre('23:00', '23:00', '05:00'), true);
  assert.equal(estDansFenetre('05:00', '23:00', '05:00'), false);
  assert.equal(typePreselectionne(types, '00:30').libelle, 'Collation nocturne');
});

test('CA-02 : chevauchement, la priorité la plus élevée l\'emporte', () => {
  assert.equal(typePreselectionne(types, '17:30').libelle, 'Apéritif');
  assert.equal(typePreselectionne(types, '16:30').libelle, 'Goûter');
});

test('CA-12 : aucune fenêtre → type par défaut ; types archivés ignorés', () => {
  assert.equal(typePreselectionne(types, '09:00').libelle, 'Goûter');
  assert.equal(typePreselectionne([], '09:00'), null);
});

test('dates locales (RG-TMP-01)', () => {
  const d = instantLocal('2026-05-15', '00:30');
  assert.equal(dateLocale(d), '2026-05-15');
  assert.equal(decalerDate('2026-03-01', -1), '2026-02-28');
  assert.equal(decalerDate('2026-12-31', 1), '2027-01-01');
  assert.equal(libelleDate('2026-11-25', '2026-11-25'), "Aujourd'hui");
  assert.equal(libelleDate('2026-11-24', '2026-11-25'), 'Hier');
  assert.equal(libelleDate('2026-11-23', '2026-11-25'), 'Lundi 23 novembre');
});
