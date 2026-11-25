// Statut Évalué / Aliment non évalué (RG-REF-04). Même règle que le déclencheur SQL
// public.calculer_statut_aliment (migration 20261126000300).
import { GRANDEURS_AGREGEABLES, estRenseigne } from './grandeurs.js';

export const EVALUE = 'EVALUE';
export const NON_EVALUE = 'NON_EVALUE';

/** Vrai si toutes les grandeurs requises (et le rendement d'un aliment cuisinable) sont renseignées. */
export function aValeursCompletes(aliment) {
  if (!aliment) return false;
  for (const g of GRANDEURS_AGREGEABLES) {
    if (!estRenseigne(aliment[g])) return false;
  }
  const igRequis = Number(aliment.glucides_g) !== 0;
  if (igRequis && !estRenseigne(aliment.index_glycemique)) return false;
  if (aliment.est_cuisinable && !estRenseigne(aliment.rendement_cuisson)) return false;
  return true;
}

/** Statut calculé de l'aliment : 'EVALUE' ou 'NON_EVALUE'. */
export function statutAliment(aliment) {
  if (!aliment) return NON_EVALUE;
  if (aliment.est_non_evalue_manuel) return NON_EVALUE;
  return aValeursCompletes(aliment) ? EVALUE : NON_EVALUE;
}

export function estEvalue(aliment) {
  return statutAliment(aliment) === EVALUE;
}

/** Liste des grandeurs (et du rendement) manquantes, pour guider le complément d'un aliment. */
export function grandeursManquantes(aliment) {
  const manquantes = GRANDEURS_AGREGEABLES.filter((g) => !estRenseigne(aliment?.[g]));
  if (Number(aliment?.glucides_g) !== 0 && !estRenseigne(aliment?.index_glycemique)) {
    manquantes.push('index_glycemique');
  }
  if (aliment?.est_cuisinable && !estRenseigne(aliment?.rendement_cuisson)) {
    manquantes.push('rendement_cuisson');
  }
  return manquantes;
}
