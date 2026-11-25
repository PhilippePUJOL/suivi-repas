#!/usr/bin/env node
// Transforme un fichier d'aliments (format docs/04 §3.8, JSON ou CSV, produit par le Préparateur)
// en un script SQL à coller dans l'éditeur SQL du Dashboard Supabase (décision D4 du plan).
//
// Usage :
//   node scripts/referentiel-vers-sql.js <fichier> <email-du-compte> <REAL|TEST> [fichier-sortie.sql]
//
// Le compte doit s'être connecté au moins une fois à l'application (il existe alors dans auth.users).
// Les aliments dont le nom existe déjà pour ce compte et ce mandant sont ignorés (choix « Ignorer »
// de RG-REF-07) : le script peut être rejoué sans créer de doublon. Le statut Évalué / Non évalué
// est recalculé par la base. Les lignes en erreur sont signalées et non chargées.
import { readFile, writeFile } from 'node:fs/promises';
import { lireFichierAliments } from '../shared/utils/format-aliments.js';
import { GRANDEURS_ALIMENT } from '../shared/utils/grandeurs.js';

const COLONNES = ['nom', 'icone', 'est_cuisinable', 'rendement_cuisson', ...GRANDEURS_ALIMENT, 'est_non_evalue_manuel'];

function litteral(valeur) {
  if (valeur === undefined || valeur === null) return 'null';
  if (typeof valeur === 'boolean') return valeur ? 'true' : 'false';
  if (typeof valeur === 'number') return String(valeur);
  return `'${String(valeur).replace(/'/g, "''")}'`;
}

/** Construit le script SQL ; renvoie { sql, rejets }. */
export function construireSql(texte, email, codeMandant) {
  if (!['REAL', 'TEST'].includes(codeMandant)) throw new Error('Le mandant doit être REAL ou TEST.');
  const { lignes, erreurFichier } = lireFichierAliments(texte);
  if (erreurFichier) throw new Error(erreurFichier);
  const valides = lignes.filter((l) => l.erreurs.length === 0);
  const rejets = lignes.filter((l) => l.erreurs.length > 0);
  if (valides.length === 0) throw new Error('Aucun aliment valide dans le fichier.');

  const valeurs = valides.map((l) => {
    const a = { est_non_evalue_manuel: false, ...l.aliment };
    return `    (${COLONNES.map((c) => litteral(a[c])).join(', ')})`;
  }).join(',\n');
  const typesColonnes = {
    nom: 'text', icone: 'text', est_cuisinable: 'boolean', est_non_evalue_manuel: 'boolean', index_glycemique: 'integer',
  };
  const selection = COLONNES.map((c) => `v.${c}::${typesColonnes[c] ?? 'numeric'}`).join(', ');

  const sql = `-- Chargement du référentiel d'aliments (${valides.length} aliment(s)) pour ${email}, mandant ${codeMandant}.
-- Généré par scripts/referentiel-vers-sql.js le ${new Date().toISOString()}.
-- À coller dans l'éditeur SQL du Dashboard Supabase. Les aliments déjà présents (même nom) sont ignorés.
do $chargement$
declare
  v_user_id uuid;
  v_mandant_id uuid;
  v_crees integer;
begin
  select id into v_user_id from auth.users where lower(email) = lower(${litteral(email)});
  if v_user_id is null then
    raise exception 'Compte % introuvable : connectez-vous d''abord une fois à l''application.', ${litteral(email)};
  end if;
  select id into v_mandant_id from public.mandants where code = ${litteral(codeMandant)};
  if not exists (select 1 from public.habilitations where user_id = v_user_id and mandant_id = v_mandant_id and est_active) then
    raise exception 'Le compte % n''a pas d''habilitation active sur le mandant ${codeMandant}.', ${litteral(email)};
  end if;

  insert into public.aliments (user_id, mandant_id, ${COLONNES.join(', ')})
  select v_user_id, v_mandant_id, ${selection}
  from (values
${valeurs}
  ) as v(${COLONNES.join(', ')})
  where not exists (
    select 1 from public.aliments a
     where a.user_id = v_user_id and a.mandant_id = v_mandant_id
       and lower(trim(a.nom)) = lower(trim(v.nom)));
  get diagnostics v_crees = row_count;
  raise notice '% aliment(s) créé(s), % ignoré(s) car déjà présents.', v_crees, ${valides.length} - v_crees;
end
$chargement$;
`;
  return { sql, rejets };
}

async function principal() {
  const [fichier, email, mandant, sortie] = process.argv.slice(2);
  if (!fichier || !email || !mandant) {
    console.error('Usage : node scripts/referentiel-vers-sql.js <fichier> <email-du-compte> <REAL|TEST> [fichier-sortie.sql]');
    process.exit(1);
  }
  const { sql, rejets } = construireSql(await readFile(fichier, 'utf8'), email, mandant);
  for (const r of rejets) console.error(`Ligne ${r.numero} (${r.aliment.nom || 'sans nom'}) rejetée : ${r.erreurs.join(' ')}`);
  if (sortie) {
    await writeFile(sortie, sql, 'utf8');
    console.error(`Script écrit dans ${sortie}.`);
  } else {
    process.stdout.write(sql);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/').replace(/^\/?/, '/')}` || process.argv[1]?.endsWith('referentiel-vers-sql.js')) {
  principal().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
