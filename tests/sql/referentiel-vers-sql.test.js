import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerBase } from './base-locale.js';
import { construireSql } from '../../scripts/referentiel-vers-sql.js';

const FICHIER = JSON.stringify({
  format: 'suivi-repas/aliments', version: 1, aliments: [
    { nom: 'Riz basmati', cuisinable: true, rendement_cuisson: 2.5, energie_kcal: 351, glucides_g: 77.8, sucres_g: 0.3, lipides_g: 0.9,
      acides_gras_satures_g: 0.2, proteines_g: 8.1, fibres_g: 1.6, sel_g: 0.01, index_glycemique: 58, source: 'Ciqual 2025' },
    { nom: "Huile d'olive", cuisinable: false, energie_kcal: 900, glucides_g: 0, sucres_g: 0, lipides_g: 100,
      acides_gras_satures_g: 14, proteines_g: 0, fibres_g: 0, sel_g: 0 },
    { nom: 'Moutarde', cuisinable: false, energie_kcal: 151 },
    { nom: '', cuisinable: false },
  ],
});

test('le script SQL charge les aliments, recalcule le statut et ignore les doublons', async () => {
  const db = await creerBase();
  await db.query(`insert into public.utilisateurs_autorises (email, mandant_id) select 'philippe@exemple.fr', id from public.mandants where code = 'TEST'`);
  await db.query(`insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'Philippe@exemple.fr')`);
  const { sql, rejets } = construireSql(FICHIER, 'philippe@exemple.fr', 'TEST');
  assert.equal(rejets.length, 1);
  await db.exec(sql);
  await db.exec(sql); // rejoué : aucun doublon
  const r = await db.query('select nom, statut_evaluation from public.aliments order by nom');
  assert.deepEqual(r.rows, [
    { nom: "Huile d'olive", statut_evaluation: 'EVALUE' },
    { nom: 'Moutarde', statut_evaluation: 'NON_EVALUE' },
    { nom: 'Riz basmati', statut_evaluation: 'EVALUE' },
  ]);
  assert.throws(() => construireSql(FICHIER, 'x@y.fr', 'PROD'), /REAL ou TEST/);
  await assert.rejects(db.exec(construireSql(FICHIER, 'inconnu@exemple.fr', 'TEST').sql), /introuvable/);
});
