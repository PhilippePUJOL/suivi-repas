// E-02 — Accueil (docs/03 §5.2). Première version : agrégat nutritionnel de la journée.
// Barres de grandeur avec cibles, vues Semaine et 7 jours : étape suivante du plan.
import { el, remplacer } from '../../dom.js';
import { bandeauErreur, chargement, indicateurIncompletude, blocValeurs, navigationDate } from '../../ui.js';
import { naviguer } from '../../navigation.js';
import { listerPrisesDuJour } from '../../../../shared/services/prise-alimentaire.service.js';
import { agregerElements, agregerAgregats, formaterValeur } from '../../../../shared/utils/calcul-nutritionnel.js';

export function afficher(conteneur, contexte) {
  let actif = true;
  const zone = el('div', { class: 'pile' });

  async function charger() {
    remplacer(zone, chargement());
    try {
      const prises = await listerPrisesDuJour(contexte.mandant.id, contexte.dateSelectionnee);
      if (!actif) return;
      const total = agregerAgregats(prises.map((p) => agregerElements(p.elements)));
      const versJournal = () => naviguer('journal');
      remplacer(zone,
        el('section', { class: 'carte pile', 'aria-labelledby': 'titre-energie' },
          el('h2', { id: 'titre-energie', class: 'texte-secondaire' }, 'Énergie'),
          el('div', { class: 'ligne' },
            el('span', { class: 'total-jour' }, `${formaterValeur('energie_kcal', total.valeurs.energie_kcal)} kcal`),
            prises.length > 0 && indicateurIncompletude(total.causes, versJournal)),
          prises.length === 0 && el('p', { class: 'texte-secondaire' }, 'Aucune prise alimentaire ce jour')),
        el('section', { class: 'carte' }, blocValeurs(total.valeurs)),
        el('button', { class: 'bouton', type: 'button', onclick: versJournal }, 'Voir le journal du jour'));
    } catch (erreur) {
      if (actif) remplacer(zone, bandeauErreur(erreur.message, charger));
    }
  }

  remplacer(conteneur, navigationDate(contexte, () => afficher(conteneur, contexte)), zone);
  charger();
  return () => { actif = false; };
}
