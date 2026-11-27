// Mandant actif (docs/04 §5, RG-MND-02 à 04).
// - sessionStorage : Mandant actif de l'onglet (isolé par onglet, conservé pendant la redirection Google) ;
// - localStorage : dernier Mandant utilisé sur l'appareil, repris à l'ouverture d'un nouvel onglet
//   ou de l'application installée tant que la session est valide.
import { supabase } from '../lib/supabase-client.js';
import { appeler, ErreurService } from './erreurs.js';

const CLE_ONGLET = 'suivi-repas.mandant';
const CLE_DERNIER = 'suivi-repas.dernier-mandant';
export const CODES_MANDANT = Object.freeze(['REAL', 'TEST']);

function stockage(type) {
  try {
    return globalThis[type] ?? null;
  } catch {
    return null;
  }
}

function lire(type, cle) {
  try {
    const brut = stockage(type)?.getItem(cle);
    const m = brut ? JSON.parse(brut) : null;
    return m && CODES_MANDANT.includes(m.code) ? m : null;
  } catch {
    return null;
  }
}

function ecrire(m) {
  const valeur = JSON.stringify(m);
  try { stockage('sessionStorage')?.setItem(CLE_ONGLET, valeur); } catch { /* stockage indisponible */ }
  try { stockage('localStorage')?.setItem(CLE_DERNIER, JSON.stringify({ code: m.code })); } catch { /* idem */ }
}

/** Mémorise le Mandant choisi (onglet et appareil), par ex. avant la redirection Google (RG-MND-02). */
export function choisirMandant(code) {
  if (!CODES_MANDANT.includes(code)) throw new Error(`Mandant inconnu : ${code}`);
  ecrire({ code });
}

/** Mandant de l'onglet, à défaut le dernier Mandant utilisé sur l'appareil : { code, id? } ou null. */
export function mandantMemorise() {
  return lire('sessionStorage', CLE_ONGLET) ?? lire('localStorage', CLE_DERNIER);
}

/** Oublie le Mandant de l'onglet et, si demandé, celui mémorisé sur l'appareil (déconnexion). */
export function oublierMandant({ appareil = false } = {}) {
  try { stockage('sessionStorage')?.removeItem(CLE_ONGLET); } catch { /* ignoré */ }
  if (appareil) {
    try { stockage('localStorage')?.removeItem(CLE_DERNIER); } catch { /* ignoré */ }
  }
}

async function lireMandantHabilite(code) {
  // La RLS ne renvoie que les mandants actifs sur lesquels l'utilisateur est habilité.
  const mandants = await appeler(
    () => supabase().from('mandants').select('id, code, libelle').eq('code', code),
    'Impossible de vérifier l\'accès au mandant.');
  return mandants.length === 1 ? mandants[0] : null;
}

function erreurAcces(message, motif) {
  const e = new ErreurService('ACCES', message);
  e.motif = motif;
  return e;
}

/**
 * Vérifie que l'utilisateur connecté est habilité au Mandant mémorisé et que celui-ci est actif
 * (RG-MND-03). Renvoie { id, code, libelle }.
 * Lève ErreurService('ACCES') avec un motif : 'MANDANT_ABSENT', 'AUCUNE_HABILITATION'
 * (compte non autorisé) ou 'MANDANT_NON_HABILITE'. Aucun repli vers REAL.
 */
export async function verifierMandant() {
  const memorise = mandantMemorise();
  if (!memorise) throw erreurAcces('Choisissez un mandant.', 'MANDANT_ABSENT');
  const m = await lireMandantHabilite(memorise.code);
  if (m) {
    ecrire({ code: m.code, id: m.id });
    return m;
  }
  oublierMandant({ appareil: true });
  const habilitations = await appeler(
    () => supabase().from('habilitations').select('id').eq('est_active', true).limit(1),
    'Impossible de vérifier l\'accès au mandant.');
  return habilitations.length === 0
    ? Promise.reject(erreurAcces('Ce compte Google n\'est pas autorisé à utiliser l\'application.', 'AUCUNE_HABILITATION'))
    : Promise.reject(erreurAcces(`Votre compte n'a pas accès au mandant ${memorise.code}. Choisissez un autre mandant.`, 'MANDANT_NON_HABILITE'));
}

/**
 * Changement de Mandant sans nouvelle authentification (RG-MND-04) : vérifie l'habilitation
 * au Mandant cible puis le mémorise. L'appelant recharge ensuite toute l'application.
 */
export async function changerMandant(code) {
  if (!CODES_MANDANT.includes(code)) throw new Error(`Mandant inconnu : ${code}`);
  const m = await lireMandantHabilite(code);
  if (!m) throw erreurAcces(`Votre compte n'a pas accès au mandant ${code}.`, 'MANDANT_NON_HABILITE');
  ecrire({ code: m.code, id: m.id });
  return m;
}

/** Mandants sur lesquels l'utilisateur connecté est habilité (pour le changement de Mandant). */
export async function listerMandantsHabilites() {
  return appeler(
    () => supabase().from('mandants').select('id, code, libelle').order('code'),
    'Impossible de charger les mandants.');
}
