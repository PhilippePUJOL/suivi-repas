// Aliments (RG-REF-02, F-CAT-01, F-EDIT-03). Filtrage systématique par mandant_id.
import { supabase } from '../lib/supabase-client.js';
import { appeler } from './erreurs.js';
import { GRANDEURS_ALIMENT } from '../utils/grandeurs.js';

export const COLONNES_ALIMENT = [
  'id', 'nom', 'icone', 'est_cuisinable', 'rendement_cuisson', ...GRANDEURS_ALIMENT,
  'statut_evaluation', 'est_non_evalue_manuel', 'est_base_courante', 'grammage_base_defaut', 'est_archive',
].join(', ');

/** Aliments actifs (non archivés) du mandant, triés par nom. */
export async function listerAlimentsActifs(mandantId) {
  return appeler(
    () => supabase().from('aliments').select(COLONNES_ALIMENT)
      .eq('mandant_id', mandantId).eq('est_archive', false).order('nom'),
    'Impossible de charger les aliments.');
}

/**
 * Crée un aliment (à la volée ou depuis le référentiel). Seuls nom et est_cuisinable sont
 * obligatoires ; le statut est calculé par la base (RG-REF-04).
 */
export async function creerAliment(mandantId, champs) {
  const ligne = { mandant_id: mandantId, nom: String(champs.nom).trim(), est_cuisinable: Boolean(champs.est_cuisinable) };
  for (const c of ['icone', 'rendement_cuisson', ...GRANDEURS_ALIMENT, 'est_non_evalue_manuel']) {
    if (champs[c] !== undefined && champs[c] !== null && champs[c] !== '') ligne[c] = champs[c];
  }
  if (!ligne.est_cuisinable) delete ligne.rendement_cuisson;
  return appeler(
    () => supabase().from('aliments').insert(ligne).select(COLONNES_ALIMENT).single(),
    'L\'aliment n\'a pas pu être créé.');
}

/** Met à jour des champs d'un aliment (ex. rendement de cuisson renseigné à la volée). */
export async function modifierAliment(mandantId, id, champs) {
  return appeler(
    () => supabase().from('aliments').update(champs)
      .eq('id', id).eq('mandant_id', mandantId).select(COLONNES_ALIMENT).single(),
    'L\'aliment n\'a pas pu être modifié.');
}
