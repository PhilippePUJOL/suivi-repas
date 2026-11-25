// Prises alimentaires (F-JRN-01 à 03, F-EDIT-01 à 05). Filtrage systématique par mandant_id.
import { supabase } from '../lib/supabase-client.js';
import { appeler } from './erreurs.js';
import { COLONNES_ALIMENT } from './aliment.service.js';

// Lecture d'une prise avec ses éléments et tout ce qu'il faut pour le calcul (RG-CAL-06 :
// les valeurs sont lues au moment de la consultation, jamais figées).
const SELECTION_PRISE = `
  id, type_prise_alimentaire_id, horodatage_prise, date_locale,
  type_prise_alimentaire:types_prise_alimentaire ( id, libelle, icone, est_archive ),
  elements:elements_prise_alimentaire (
    id, type_element, aliment_id, recette_id, plat_prepare_id, etat_aliment, mode_portion,
    portion_grammes, portion_pourcentage, portion_numerateur, portion_denominateur, note_libre,
    est_element_supprime, libelle_element_supprime, position,
    aliment:aliments ( ${COLONNES_ALIMENT} ),
    recette:recettes ( id, nom, poids_total_net_g, est_archive,
      compositions:compositions_recette ( aliment_id, etat_aliment, poids_g, est_element_supprime,
        aliment:aliments ( ${COLONNES_ALIMENT} ) ) ),
    plat_prepare:plats_prepares ( * )
  )`;

function trierElements(prise) {
  prise.elements?.sort((a, b) => a.position - b.position);
  return prise;
}

/** Prises alimentaires d'une date locale, dans l'ordre chronologique. */
export async function listerPrisesDuJour(mandantId, dateLocale) {
  const prises = await appeler(
    () => supabase().from('prises_alimentaires').select(SELECTION_PRISE)
      .eq('mandant_id', mandantId).eq('date_locale', dateLocale)
      .order('horodatage_prise'),
    'Impossible de charger les prises alimentaires.');
  return prises.map(trierElements);
}

/** Une prise alimentaire par son identifiant. */
export async function lirePrise(mandantId, id) {
  const prise = await appeler(
    () => supabase().from('prises_alimentaires').select(SELECTION_PRISE)
      .eq('mandant_id', mandantId).eq('id', id).single(),
    'Impossible de charger la prise alimentaire.');
  return trierElements(prise);
}

/**
 * Enregistre une prise et ses éléments en une seule transaction (création si prise.id est absent).
 * Renvoie l'identifiant de la prise.
 */
export async function enregistrerPrise(mandantId, prise, elements) {
  const lignes = elements.map((e) => ({
    type_element: e.type_element,
    aliment_id: e.aliment_id ?? null,
    recette_id: e.recette_id ?? null,
    plat_prepare_id: e.plat_prepare_id ?? null,
    etat_aliment: e.etat_aliment ?? null,
    mode_portion: e.mode_portion,
    portion_grammes: e.portion_grammes ?? null,
    portion_pourcentage: e.portion_pourcentage ?? null,
    portion_numerateur: e.portion_numerateur ?? null,
    portion_denominateur: e.portion_denominateur ?? null,
    note_libre: e.note_libre ?? null,
  }));
  return appeler(
    () => supabase().rpc('enregistrer_prise_alimentaire', {
      p_prise: {
        id: prise.id ?? null,
        mandant_id: mandantId,
        type_prise_alimentaire_id: prise.type_prise_alimentaire_id,
        horodatage_prise: prise.horodatage_prise,
        date_locale: prise.date_locale,
      },
      p_elements: lignes,
    }),
    'La prise alimentaire n\'a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.');
}

/** Supprime une prise alimentaire (ses éléments suivent en cascade). */
export async function supprimerPrise(mandantId, id) {
  await appeler(
    () => supabase().from('prises_alimentaires').delete().eq('mandant_id', mandantId).eq('id', id),
    'La prise alimentaire n\'a pas pu être supprimée.');
}
