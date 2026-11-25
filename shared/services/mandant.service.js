// Mandant actif (docs/04 §5, RG-MND-02 à 04). Mémorisé par onglet dans sessionStorage.
import { supabase } from '../lib/supabase-client.js';
import { appeler, ErreurService } from './erreurs.js';

const CLE = 'suivi-repas.mandant';
export const CODES_MANDANT = Object.freeze(['REAL', 'TEST']);

function stockage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Mémorise le mandant choisi avant la redirection Google (RG-MND-02). */
export function choisirMandant(code) {
  if (!CODES_MANDANT.includes(code)) throw new Error(`Mandant inconnu : ${code}`);
  stockage()?.setItem(CLE, JSON.stringify({ code }));
}

/** Mandant mémorisé dans l'onglet : { code, id? } ou null. */
export function mandantMemorise() {
  try {
    const brut = stockage()?.getItem(CLE);
    const m = brut ? JSON.parse(brut) : null;
    return m && CODES_MANDANT.includes(m.code) ? m : null;
  } catch {
    return null;
  }
}

/** Oublie le mandant de l'onglet (changement de mandant, déconnexion). */
export function oublierMandant() {
  stockage()?.removeItem(CLE);
}

/**
 * Vérifie que l'utilisateur connecté est habilité au mandant mémorisé et que celui-ci est actif
 * (RG-MND-03). Renvoie { id, code, libelle }.
 * Lève ErreurService('ACCES') avec un motif : 'AUCUNE_HABILITATION' (compte non autorisé)
 * ou 'MANDANT_NON_HABILITE'.
 */
export async function verifierMandant() {
  const memorise = mandantMemorise();
  if (!memorise) {
    const e = new ErreurService('ACCES', 'Choisissez un mandant.');
    e.motif = 'MANDANT_ABSENT';
    throw e;
  }
  const client = supabase();
  // La RLS ne renvoie que les mandants actifs sur lesquels l'utilisateur est habilité.
  const mandants = await appeler(
    () => client.from('mandants').select('id, code, libelle').eq('code', memorise.code),
    'Impossible de vérifier l\'accès au mandant.');
  if (mandants.length === 1) {
    const m = mandants[0];
    stockage()?.setItem(CLE, JSON.stringify({ code: m.code, id: m.id }));
    return m;
  }
  const habilitations = await appeler(
    () => client.from('habilitations').select('id').eq('est_active', true).limit(1),
    'Impossible de vérifier l\'accès au mandant.');
  const e = habilitations.length === 0
    ? new ErreurService('ACCES', 'Ce compte Google n\'est pas autorisé à utiliser l\'application.')
    : new ErreurService('ACCES', `Votre compte n'a pas accès au mandant ${memorise.code}. Choisissez un autre mandant.`);
  e.motif = habilitations.length === 0 ? 'AUCUNE_HABILITATION' : 'MANDANT_NON_HABILITE';
  throw e;
}
