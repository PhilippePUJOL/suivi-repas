// Configuration : types de prise alimentaire (F-CFG-01). Filtrage systématique par mandant_id.
import { supabase } from '../lib/supabase-client.js';
import { appeler } from './erreurs.js';

/** Types de prise alimentaire du mandant, archivés compris, triés par priorité. */
export async function listerTypesPriseAlimentaire(mandantId) {
  return appeler(
    () => supabase().from('types_prise_alimentaire')
      .select('id, libelle, icone, fenetre_debut, fenetre_fin, priorite, est_type_par_defaut, est_archive')
      .eq('mandant_id', mandantId)
      .order('est_archive')
      .order('priorite'),
    'Impossible de charger les types de prise alimentaire.');
}
