// E-05 — Référentiel (docs/03 §5.5). Première version : liste des aliments en lecture.
// Fiches, recettes, plats préparés et import / export : étapes suivantes du plan.
import { el, remplacer } from '../../dom.js';
import { bandeauErreur, chargement } from '../../ui.js';
import { listerAlimentsActifs } from '../../../../shared/services/aliment.service.js';
import { statutAliment } from '../../../../shared/utils/statut-aliment.js';
import { formaterValeur } from '../../../../shared/utils/calcul-nutritionnel.js';

export function afficher(conteneur, contexte) {
  let actif = true;
  const charger = async () => {
    remplacer(conteneur, chargement());
    try {
      const aliments = await listerAlimentsActifs(contexte.mandant.id);
      if (!actif) return;
      const nonEvalues = aliments.filter((a) => statutAliment(a) === 'NON_EVALUE').length;
      remplacer(conteneur,
        el('p', { class: 'texte-secondaire' }, `${aliments.length} aliment(s), dont ${nonEvalues} non évalué(s). La gestion complète du référentiel arrive dans une prochaine étape.`),
        aliments.length === 0
          ? el('p', {}, 'Aucun aliment pour l\'instant. Créez-en à la volée depuis la saisie d\'une prise alimentaire.')
          : el('div', { class: 'carte' }, aliments.map((a) => el('div', { class: 'ligne-detail' },
            el('span', { class: 'grandit' }, a.icone ? `${a.icone} ` : '', a.nom, ' ',
              a.est_cuisinable ? el('span', { class: 'badge' }, 'cuisinable') : null, ' ',
              statutAliment(a) === 'NON_EVALUE' ? el('span', { class: 'badge badge--ambre' }, 'Non évalué') : null),
            el('span', { class: 'texte-secondaire' }, `${formaterValeur('energie_kcal', a.energie_kcal)} kcal/100 g`)))));
    } catch (erreur) {
      if (actif) remplacer(conteneur, bandeauErreur(erreur.message, charger));
    }
  };
  charger();
  return () => { actif = false; };
}
