// Base PostgreSQL embarquée (PGlite) pour vérifier les migrations sur le poste, sans Docker.
// Reproduit le strict nécessaire de Supabase : rôles anon / authenticated, schéma auth,
// auth.users et auth.uid(). Les tests pgTAP complets tournent sur GitHub Actions.
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOSSIER_MIGRATIONS = join(RACINE, 'supabase', 'migrations');

const SOCLE_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

export async function creerBase() {
  const db = new PGlite();
  await db.exec(SOCLE_SUPABASE);
  const fichiers = (await readdir(DOSSIER_MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort();
  for (const fichier of fichiers) {
    const sql = await readFile(join(DOSSIER_MIGRATIONS, fichier), 'utf8');
    try {
      await db.exec(sql);
    } catch (erreur) {
      erreur.message = `Migration ${fichier} : ${erreur.message}`;
      throw erreur;
    }
  }
  return db;
}

/** Exécute fn en tant qu'utilisateur authentifié (ou anon si userId est null), puis revient en superutilisateur. */
export async function enTantQue(db, userId, fn) {
  const role = userId ? 'authenticated' : 'anon';
  const claims = userId ? JSON.stringify({ sub: userId, role }) : '';
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claims', '', false)`);
  }
}

export async function idMandant(db, code) {
  const r = await db.query('select id from public.mandants where code = $1', [code]);
  return r.rows[0].id;
}
