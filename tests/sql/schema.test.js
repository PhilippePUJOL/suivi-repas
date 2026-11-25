// Vérification locale du schéma (docs/04 §6.1) sur PGlite. Lancer : node --test tests/sql/
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { creerBase, enTantQue, idMandant } from './base-locale.js';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const INCONNU = '33333333-3333-3333-3333-333333333333';

let db, REAL, TEST;

async function rejette(promesse, motif) {
  await assert.rejects(promesse, motif);
}

before(async () => {
  db = await creerBase();
  REAL = await idMandant(db, 'REAL');
  TEST = await idMandant(db, 'TEST');
  await db.query(`insert into public.utilisateurs_autorises (email, mandant_id) values
    ('alice@exemple.fr', $1), ('alice@exemple.fr', $2), ('bob@exemple.fr', $2)`, [REAL, TEST]);
  // Création des comptes : déclenche l'initialisation (RG-USR-02). E-mail en majuscules pour Alice.
  await db.query(`insert into auth.users (id, email) values ($1, 'Alice@Exemple.fr'), ($2, 'bob@exemple.fr'), ($3, 'intrus@exemple.fr')`,
    [ALICE, BOB, INCONNU]);
});

test('RLS activée sur toutes les tables exposées', async () => {
  const r = await db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  assert.deepEqual(r.rows, []);
});

test('première connexion : habilitations, 7 types dont 1 par défaut, 7 cibles de départ', async () => {
  const h = await db.query('select mandant_id from public.habilitations where user_id = $1', [ALICE]);
  assert.equal(h.rows.length, 2);
  const t = await db.query(`select count(*)::int n, count(*) filter (where est_type_par_defaut)::int d
    from public.types_prise_alimentaire where user_id = $1 and mandant_id = $2`, [ALICE, TEST]);
  assert.deepEqual(t.rows[0], { n: 7, d: 1 });
  const c = await db.query('select count(*)::int n from public.cibles_nutritionnelles where user_id = $1 and mandant_id = $2', [ALICE, REAL]);
  assert.equal(c.rows[0].n, 7);
  const b = await db.query('select count(*)::int n from public.habilitations where user_id = $1', [BOB]);
  assert.equal(b.rows[0].n, 1);
});

test('compte absent de la liste : aucune habilitation, aucun accès', async () => {
  const h = await db.query('select count(*)::int n from public.habilitations where user_id = $1', [INCONNU]);
  assert.equal(h.rows[0].n, 0);
  await enTantQue(db, INCONNU, async () => {
    const m = await db.query('select * from public.mandants');
    assert.equal(m.rows.length, 0);
    await rejette(db.query(`insert into public.aliments (mandant_id, nom) values ($1, 'Pomme')`, [TEST]), /row-level security/);
  });
});

test('utilisateurs_autorises inaccessible depuis l\'API', async () => {
  await enTantQue(db, ALICE, async () => {
    await rejette(db.query('select * from public.utilisateurs_autorises'), /permission denied/);
  });
});

test('anon ne voit rien', async () => {
  await enTantQue(db, null, async () => {
    const m = await db.query('select * from public.mandants');
    assert.equal(m.rows.length, 0);
    const a = await db.query('select * from public.aliments');
    assert.equal(a.rows.length, 0);
  });
});

test('isolation entre utilisateurs et entre mandants', async () => {
  await enTantQue(db, ALICE, () =>
    db.query(`insert into public.aliments (mandant_id, nom) values ($1, 'Pomme TEST Alice')`, [TEST]));
  await enTantQue(db, BOB, async () => {
    const a = await db.query('select * from public.aliments');
    assert.equal(a.rows.length, 0, 'Bob ne voit pas les aliments d\'Alice');
    await rejette(db.query(`insert into public.aliments (mandant_id, nom) values ($1, 'Pomme REAL Bob')`, [REAL]), /row-level security/);
  });
  await enTantQue(db, ALICE, async () => {
    const a = await db.query('select nom from public.aliments where mandant_id = $1', [REAL]);
    assert.equal(a.rows.length, 0, 'rien de TEST dans REAL');
  });
});

test('référence croisée entre mandants refusée (clé étrangère composite)', async () => {
  await enTantQue(db, ALICE, async () => {
    const al = await db.query(`insert into public.aliments (mandant_id, nom) values ($1, 'Riz TEST') returning id`, [TEST]);
    const type = await db.query(`select id from public.types_prise_alimentaire where mandant_id = $1 and priorite = 1`, [REAL]);
    const prise = await db.query(`insert into public.prises_alimentaires (mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale)
      values ($1, $2, now(), current_date) returning id`, [REAL, type.rows[0].id]);
    await rejette(db.query(`insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, aliment_id, mode_portion, portion_grammes)
      values ($1, $2, 'ALIMENT', $3, 'GRAMMES', 100)`, [prise.rows[0].id, REAL, al.rows[0].id]), /foreign key/);
  });
});

test('statut Évalué / Aliment non évalué (CA-05)', async () => {
  await enTantQue(db, ALICE, async () => {
    const statut = async (valeurs) => {
      const cols = Object.keys(valeurs);
      const r = await db.query(
        `insert into public.aliments (mandant_id, nom, ${cols.join(', ')}) values ($1, 'X', ${cols.map((_, i) => '$' + (i + 2)).join(', ')}) returning statut_evaluation`,
        [TEST, ...Object.values(valeurs)]);
      return r.rows[0].statut_evaluation;
    };
    const huit = { energie_kcal: 100, glucides_g: 10, sucres_g: 1, lipides_g: 1, acides_gras_satures_g: 0.1, proteines_g: 3, fibres_g: 2, sel_g: 0 };
    assert.equal(await statut({ est_cuisinable: false }), 'NON_EVALUE');
    assert.equal(await statut(huit), 'NON_EVALUE', 'IG manquant avec glucides non nuls');
    assert.equal(await statut({ ...huit, index_glycemique: 50 }), 'EVALUE');
    assert.equal(await statut({ ...huit, glucides_g: 0, sucres_g: 0 }), 'EVALUE', 'IG non requis si glucides = 0');
    assert.equal(await statut({ ...huit, index_glycemique: 50, est_cuisinable: true }), 'NON_EVALUE', 'cuisinable sans rendement');
    assert.equal(await statut({ ...huit, index_glycemique: 50, est_cuisinable: true, rendement_cuisson: 2.5 }), 'EVALUE');
    assert.equal(await statut({ ...huit, index_glycemique: 50, est_non_evalue_manuel: true }), 'NON_EVALUE', 'dérogation manuelle');
  });
});

test('rendement interdit sur un aliment à état unique', async () => {
  await enTantQue(db, ALICE, async () => {
    await rejette(db.query(`insert into public.aliments (mandant_id, nom, est_cuisinable, rendement_cuisson) values ($1, 'Moutarde', false, 1.2)`, [TEST]), /aliment_rendement_si_cuisinable/);
  });
});

test('état à la pesée cohérent, changement de cuisinable refusé sur un aliment utilisé (CA-14)', async () => {
  await enTantQue(db, ALICE, async () => {
    const riz = (await db.query(`insert into public.aliments (mandant_id, nom, est_cuisinable) values ($1, 'Riz', true) returning id`, [TEST])).rows[0].id;
    const moutarde = (await db.query(`insert into public.aliments (mandant_id, nom) values ($1, 'Moutarde') returning id`, [TEST])).rows[0].id;
    const type = (await db.query(`select id from public.types_prise_alimentaire where mandant_id = $1 and priorite = 1`, [TEST])).rows[0].id;
    const prise = (await db.query(`insert into public.prises_alimentaires (mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale)
      values ($1, $2, now(), current_date) returning id`, [TEST, type])).rows[0].id;
    const ligne = (aliment, etat) => db.query(`insert into public.elements_prise_alimentaire
      (prise_alimentaire_id, mandant_id, type_element, aliment_id, etat_aliment, mode_portion, portion_grammes)
      values ($1, $2, 'ALIMENT', $3, $4, 'GRAMMES', 150)`, [prise, TEST, aliment, etat]);
    await rejette(ligne(riz, null), /Cru ou Cuit/);
    await rejette(ligne(moutarde, 'CRU'), /état unique/);
    await ligne(riz, 'CUIT');
    await ligne(moutarde, null);
    await rejette(db.query('update public.aliments set est_cuisinable = false where id = $1', [riz]), /déjà utilisé/);
    await db.query('update public.aliments set rendement_cuisson = 2.5 where id = $1', [riz]);
  });
});

test('suppression physique : « Élément supprimé » conservé dans l\'historique (CA-09)', async () => {
  await enTantQue(db, ALICE, async () => {
    const pain = (await db.query(`insert into public.aliments (mandant_id, nom) values ($1, 'Pain') returning id`, [TEST])).rows[0].id;
    const type = (await db.query(`select id from public.types_prise_alimentaire where mandant_id = $1 and priorite = 3`, [TEST])).rows[0].id;
    const prise = (await db.query(`insert into public.prises_alimentaires (mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale)
      values ($1, $2, now(), current_date) returning id`, [TEST, type])).rows[0].id;
    await db.query(`insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, aliment_id, mode_portion, portion_grammes)
      values ($1, $2, 'ALIMENT', $3, 'GRAMMES', 60)`, [prise, TEST, pain]);
    await db.query('delete from public.aliments where id = $1', [pain]);
    const l = await db.query('select aliment_id, est_element_supprime, libelle_element_supprime from public.elements_prise_alimentaire where prise_alimentaire_id = $1', [prise]);
    assert.deepEqual(l.rows[0], { aliment_id: null, est_element_supprime: true, libelle_element_supprime: 'Élément supprimé' });
  });
});

test('types : type utilisé non supprimable, type par défaut ni archivable ni supprimable, priorités uniques', async () => {
  await enTantQue(db, ALICE, async () => {
    const defaut = (await db.query(`select id from public.types_prise_alimentaire where mandant_id = $1 and est_type_par_defaut`, [TEST])).rows[0].id;
    await rejette(db.query('update public.types_prise_alimentaire set est_archive = true where id = $1', [defaut]), /type_par_defaut_non_archive/);
    await rejette(db.query('delete from public.types_prise_alimentaire where id = $1', [defaut]), /type par défaut/);
    const utilise = (await db.query(`select id from public.types_prise_alimentaire where mandant_id = $1 and priorite = 1`, [TEST])).rows[0].id;
    await rejette(db.query('delete from public.types_prise_alimentaire where id = $1', [utilise]), /foreign key/);
    await rejette(db.query(`insert into public.types_prise_alimentaire (mandant_id, libelle, icone, fenetre_debut, fenetre_fin, priorite)
      values ($1, 'Doublon', 'x', '08:00', '09:00', 1)`, [TEST]), /duplicate key/);
    await rejette(db.query(`insert into public.types_prise_alimentaire (mandant_id, libelle, icone, fenetre_debut, fenetre_fin, priorite)
      values ($1, 'Vide', 'x', '08:00', '08:00', 99)`, [TEST]), /check constraint/);
    await rejette(db.query(`insert into public.prises_alimentaires (mandant_id, horodatage_prise, date_locale) values ($1, now(), current_date)`, [TEST]), /null value/);
  });
});

test('portion en grammes d\'une recette sans poids total refusée, part acceptée (CA-11)', async () => {
  await enTantQue(db, ALICE, async () => {
    const gateau = (await db.query(`insert into public.recettes (mandant_id, nom) values ($1, 'Gâteau') returning id`, [TEST])).rows[0].id;
    const type = (await db.query(`select id from public.types_prise_alimentaire where mandant_id = $1 and priorite = 5`, [TEST])).rows[0].id;
    const prise = (await db.query(`insert into public.prises_alimentaires (mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale)
      values ($1, $2, now(), current_date) returning id`, [TEST, type])).rows[0].id;
    await rejette(db.query(`insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, recette_id, mode_portion, portion_grammes)
      values ($1, $2, 'RECETTE', $3, 'GRAMMES', 80)`, [prise, TEST, gateau]), /poids total/);
    await db.query(`insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, recette_id, mode_portion, portion_numerateur, portion_denominateur)
      values ($1, $2, 'RECETTE', $3, 'PART', 1, 4)`, [prise, TEST, gateau]);
    await db.query(`insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, recette_id, mode_portion, portion_pourcentage)
      values ($1, $2, 'RECETTE', $3, 'POURCENTAGE', 150)`, [prise, TEST, gateau]);
  });
});

test('cibles : contraintes et rétablissement des cibles de départ (CA-16)', async () => {
  await enTantQue(db, ALICE, async () => {
    await rejette(db.query(`insert into public.cibles_nutritionnelles (mandant_id, grandeur, forme_cible, valeur_basse, valeur_haute)
      values ($1, 'ENERGIE_KCAL', 'PLAGE', 1800, 2200)`, [TEST]), /cible_energie_absolue/);
    await db.query(`insert into public.cibles_nutritionnelles (mandant_id, grandeur, forme_cible, valeur_cible) values ($1, 'ENERGIE_KCAL', 'VALEUR', 2000)`, [TEST]);
    await rejette(db.query(`update public.cibles_nutritionnelles set valeur_basse = 40, valeur_haute = 38 where mandant_id = $1 and grandeur = 'FIBRES_G'`, [TEST]), /cible_bornes_ordonnees/);
    await rejette(db.query(`insert into public.cibles_nutritionnelles (mandant_id, grandeur, forme_cible, base_cible, valeur_cible) values ($1, 'SEL_G', 'VALEUR', 'POURCENTAGE_ENERGIE', 2)`, [TEST]), /check constraint/);
    await db.query(`update public.cibles_nutritionnelles set valeur_basse = 30 where mandant_id = $1 and grandeur = 'FIBRES_G'`, [TEST]);
    await db.query(`insert into public.poids_reference (mandant_id, date_effet, poids_kg) values ($1, current_date, 75)`, [TEST]);
    await rejette(db.query(`insert into public.poids_reference (mandant_id, date_effet, poids_kg) values ($1, current_date, 74)`, [TEST]), /duplicate key/);
    await db.query('select public.retablir_cibles_de_depart($1)', [TEST]);
    const f = await db.query(`select valeur_basse::float from public.cibles_nutritionnelles where mandant_id = $1 and grandeur = 'FIBRES_G'`, [TEST]);
    assert.equal(f.rows[0].valeur_basse, 25);
    const e = await db.query(`select count(*)::int n from public.cibles_nutritionnelles where mandant_id = $1 and grandeur = 'ENERGIE_KCAL'`, [TEST]);
    assert.equal(e.rows[0].n, 1, 'cible d\'énergie conservée');
    const p = await db.query('select count(*)::int n from public.poids_reference where mandant_id = $1', [TEST]);
    assert.equal(p.rows[0].n, 1, 'poids conservé');
  });
  await enTantQue(db, BOB, async () => {
    await rejette(db.query('select public.retablir_cibles_de_depart($1)', [REAL]), /Accès refusé/);
  });
});

test('suppression d\'un compte : toutes ses données partent en cascade', async () => {
  await db.query('delete from auth.users where id = $1', [ALICE]);
  const r = await db.query('select count(*)::int n from public.types_prise_alimentaire where user_id = $1', [ALICE]);
  assert.equal(r.rows[0].n, 0);
});
