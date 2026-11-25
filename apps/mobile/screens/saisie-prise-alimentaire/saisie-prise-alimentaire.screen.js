// E-04 — Saisie d'une prise alimentaire (docs/03 §5.4, F-EDIT-01 à 05).
// Première version : contexte temporel avec présélection du type, recherche et création
// d'aliments à la volée, portion en grammes, état Cru / Cuit, note libre, totaux en temps
// réel, enregistrement atomique, erreurs sans perte de saisie, session expirée.
// Étapes suivantes : suggestions (RG-SUG-01 à 03), bases courantes, recettes et plats préparés.
import { el, remplacer, normaliserTexte } from '../../dom.js';
import { bandeauErreur, chargement, indicateurIncompletude, blocValeurs, ouvrirFeuille, confirmer, notifier } from '../../ui.js';
import { naviguer } from '../../navigation.js';
import { nomElement } from '../journal/journal.screen.js';
import { ouvrirCreationAliment, ouvrirComplementAliment, ouvrirRendement } from './formulaire-aliment.js';
import { listerTypesPriseAlimentaire } from '../../../../shared/services/configuration.service.js';
import { listerAlimentsActifs } from '../../../../shared/services/aliment.service.js';
import { listerPrisesDuJour, lirePrise, enregistrerPrise } from '../../../../shared/services/prise-alimentaire.service.js';
import { connexionGoogle, renouvelerSession } from '../../../../shared/services/auth.service.js';
import { choisirMandant } from '../../../../shared/services/mandant.service.js';
import {
  agregerElements, agregerAgregats, contributionElement, formaterValeur, formaterNombre, lireNombre, libellePortion,
} from '../../../../shared/utils/calcul-nutritionnel.js';
import { typePreselectionne, dateLocale, heureLocale, instantLocal } from '../../../../shared/utils/fenetre-temporelle.js';
import { statutAliment } from '../../../../shared/utils/statut-aliment.js';

const CLE_SAISIE_EN_COURS = 'suivi-repas.saisie-en-cours';
let compteurCle = 0;
const nouvelleCle = () => `l${++compteurCle}`;

// ------------------------------------------------------------------ session expirée (F-EDIT-05)

/** Conserve la saisie dans le stockage de l'onglet le temps de la reconnexion. */
function conserverSaisie(contexte, etat) {
  const lignes = etat.lignes.map(({ noeud, ...l }) => l);
  sessionStorage.setItem(CLE_SAISIE_EN_COURS, JSON.stringify({
    user_id: contexte.session?.user?.id, mandant: contexte.mandant.code,
    etat: { ...etat, lignes, enregistrement: false, erreur: null },
  }));
}

/** Saisie conservée, restituée seulement pour le même compte et le même mandant ; toujours effacée. */
export function reprendreSaisieConservee(contexte) {
  const brut = sessionStorage.getItem(CLE_SAISIE_EN_COURS);
  if (!brut) return null;
  sessionStorage.removeItem(CLE_SAISIE_EN_COURS);
  try {
    const s = JSON.parse(brut);
    if (s.user_id === contexte.session?.user?.id && s.mandant === contexte.mandant.code) return s.etat;
  } catch {
    // contenu illisible : ignoré
  }
  return null;
}

export function existeSaisieConservee() {
  try {
    return Boolean(sessionStorage.getItem(CLE_SAISIE_EN_COURS));
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ écran

export function afficher(conteneur, contexte, params = []) {
  const idPrise = params[0] ?? null;
  let actif = true;
  let types = [];
  let aliments = [];
  let autresPrisesDuJour = []; // pour le total de la journée avec cette prise
  const etat = {
    id: idPrise,
    date: contexte.ecranPrecedent === 'journal' ? contexte.dateSelectionnee : dateLocale(new Date()),
    heure: heureLocale(new Date()),
    typeId: null,
    typeChoisi: Boolean(idPrise), // en modification, le type est considéré comme choisi (RG-TMP-04)
    lignes: [],
    modifie: false,
    enregistrement: false,
    erreur: null,
  };

  // Références vers les zones mises à jour sans tout redessiner.
  const zones = {
    erreur: el('div', { 'aria-live': 'assertive' }),
    contexte: el('div'),
    lignes: el('div'),
    pied: el('footer', { class: 'pied-saisie' }),
  };

  // ---------------------------------------------------------------- chargement
  async function charger() {
    remplacer(conteneur, chargement());
    try {
      [types, aliments] = await Promise.all([
        listerTypesPriseAlimentaire(contexte.mandant.id),
        listerAlimentsActifs(contexte.mandant.id),
      ]);
      if (idPrise) {
        const prise = await lirePrise(contexte.mandant.id, idPrise);
        const instant = new Date(prise.horodatage_prise);
        etat.date = prise.date_locale;
        etat.heure = heureLocale(instant);
        etat.typeId = prise.type_prise_alimentaire_id;
        etat.lignes = prise.elements.map((e) => ({ ...e, cle: nouvelleCle() }));
      } else {
        const conservee = reprendreSaisieConservee(contexte);
        if (conservee) {
          Object.assign(etat, conservee);
          etat.lignes.forEach((l) => { l.cle = nouvelleCle(); });
          notifier('Votre saisie en cours a été restaurée.');
        } else {
          etat.typeId = typePreselectionne(types, etat.heure)?.id ?? null;
        }
      }
      await chargerJournee();
      if (!actif) return;
      dessiner();
    } catch (erreur) {
      if (actif) remplacer(conteneur, enTete(), bandeauErreur(erreur.message, charger));
    }
  }

  async function chargerJournee() {
    try {
      const prises = await listerPrisesDuJour(contexte.mandant.id, etat.date);
      autresPrisesDuJour = prises.filter((p) => p.id !== etat.id);
    } catch {
      autresPrisesDuJour = null; // total de la journée indisponible, sans bloquer la saisie
    }
  }

  // ---------------------------------------------------------------- en-tête et contexte temporel
  function enTete() {
    const code = contexte.mandant.code;
    return el('header', { class: 'entete' },
      el('button', { class: 'bouton bouton--icone bouton--discret', type: 'button', 'aria-label': 'Annuler', onclick: annuler }, '✕'),
      el('h1', {}, idPrise ? 'Modifier la prise alimentaire' : 'Nouvelle prise alimentaire'),
      el('span', { class: `badge-mandant${code === 'TEST' ? ' badge-mandant--test' : ''}`, style: 'display:inline-flex;align-items:center' }, code));
  }

  function dessinerContexte() {
    const selectionnables = types.filter((t) => !t.est_archive || t.id === etat.typeId);
    const select = el('select', {
      class: 'saisie', 'aria-label': 'Type de prise alimentaire',
      onchange: () => { etat.typeId = select.value || null; etat.typeChoisi = true; etat.modifie = true; dessinerPied(); },
    },
    !etat.typeId && el('option', { value: '' }, 'Choisir…'),
    selectionnables.map((t) => el('option', { value: t.id, selected: t.id === etat.typeId ? 'selected' : false },
      `${t.icone} ${t.libelle}${t.est_archive ? ' (Archivé)' : ''}`)));
    if (etat.typeId) select.value = etat.typeId;
    const heure = el('input', {
      class: 'saisie', type: 'time', value: etat.heure, 'aria-label': 'Heure', required: true,
      onchange: () => {
        if (!heure.value) return;
        etat.heure = heure.value;
        etat.modifie = true;
        if (!etat.typeChoisi) {
          etat.typeId = typePreselectionne(types, etat.heure)?.id ?? null;
          dessinerContexte();
        }
      },
    });
    const date = el('input', {
      class: 'saisie', type: 'date', value: etat.date, 'aria-label': 'Date', required: true,
      onchange: async () => {
        if (!date.value) return;
        etat.date = date.value;
        etat.modifie = true;
        await chargerJournee();
        dessinerPied();
      },
    });
    remplacer(zones.contexte, el('div', { class: 'contexte-temporel' }, select, heure, date));
  }

  // ---------------------------------------------------------------- lignes
  function estDoublon(ligne) {
    if (ligne.type_element !== 'ALIMENT' || !ligne.aliment_id) return false;
    return etat.lignes.some((l) => l !== ligne && l.type_element === 'ALIMENT'
      && l.aliment_id === ligne.aliment_id && (l.etat_aliment ?? null) === (ligne.etat_aliment ?? null));
  }

  function dessinerLigne(ligne) {
    const c = contributionElement(ligne);
    const a = ligne.aliment;
    const energie = el('span', { class: 'energie' }, `${formaterValeur('energie_kcal', c.valeurs.energie_kcal)} kcal`);
    const commandes = [];

    if (ligne.type_element === 'ALIMENT' && !ligne.est_element_supprime) {
      const portion = el('input', {
        class: 'saisie portion', type: 'text', inputmode: 'decimal', autocomplete: 'off',
        value: formaterNombre(ligne.portion_grammes), 'aria-label': `Portion de ${a.nom} en grammes`,
        oninput: () => {
          const v = lireNombre(portion.value);
          ligne.portion_grammes = Number.isFinite(v) && v > 0 ? v : null;
          etat.modifie = true;
          const contribution = contributionElement({ ...ligne, portion_grammes: ligne.portion_grammes ?? 0 });
          energie.textContent = `${formaterValeur('energie_kcal', contribution.valeurs.energie_kcal)} kcal`;
          dessinerPied();
        },
      });
      commandes.push(el('label', { class: 'ligne' }, portion, el('span', {}, 'g')));
      if (a.est_cuisinable) {
        const bascule = (valeur, libelle) => el('button', {
          type: 'button', 'aria-pressed': String(ligne.etat_aliment === valeur),
          onclick: () => { ligne.etat_aliment = valeur; etat.modifie = true; dessinerLignes(); dessinerPied(); },
        }, libelle);
        commandes.push(el('div', { class: 'segmente', role: 'group', 'aria-label': `État à la pesée de ${a.nom}` },
          bascule('CRU', 'Cru'), bascule('CUIT', 'Cuit')));
      }
    } else {
      commandes.push(el('span', { class: 'texte-secondaire' }, libellePortion(ligne)));
    }
    commandes.push(el('button', {
      class: 'bouton bouton--icone bouton--discret', type: 'button', 'aria-label': `Retirer ${nomElement(ligne)} de la prise`,
      onclick: () => { etat.lignes = etat.lignes.filter((l) => l !== ligne); etat.modifie = true; dessinerLignes(); dessinerPied(); },
    }, '🗑'));

    const avertissements = [];
    if (a?.est_cuisinable && !ligne.etat_aliment) {
      avertissements.push(el('p', { class: 'avertissement' }, 'Choisissez l\'état à la pesée : Cru ou Cuit.'));
    }
    if (a?.est_cuisinable && ligne.etat_aliment === 'CUIT' && a.rendement_cuisson == null) {
      avertissements.push(el('p', { class: 'avertissement' },
        'Rendement de cuisson non renseigné : cette ligne compte pour 0. ',
        el('button', { class: 'bouton bouton--discret', type: 'button', style: 'min-height:32px;padding:0;color:var(--couleur-principale)', onclick: () => renseignerRendement(a) }, 'Renseigner le rendement')));
    }
    if (estDoublon(ligne)) {
      avertissements.push(el('p', { class: 'avertissement' }, 'Cet aliment figure déjà dans la prise avec le même état.'));
    }

    return el('div', { class: 'ligne-element' },
      el('div', { class: 'ligne' },
        el('button', { class: `nom grandit${ligne.est_element_supprime ? ' element-supprime' : ''}`, type: 'button', onclick: () => ouvrirFeuilleElement(ligne) },
          nomElement(ligne), ' ',
          a && statutAliment(a) === 'NON_EVALUE' ? el('span', { class: 'badge badge--ambre' }, 'Non évalué') : null),
        energie, indicateurIncompletude(c.causes)),
      el('div', { class: 'commandes' }, commandes),
      ligne.note_libre && el('p', { class: 'note' }, ligne.note_libre),
      avertissements);
  }

  function dessinerLignes() {
    remplacer(zones.lignes, etat.lignes.length === 0
      ? el('p', { class: 'texte-secondaire' }, 'Aucun élément pour l\'instant.')
      : el('div', { class: 'carte' }, etat.lignes.map(dessinerLigne)));
  }

  // ---------------------------------------------------------------- pied : totaux et enregistrement
  function motifBlocage() {
    if (etat.lignes.length === 0) return 'Ajoutez au moins un élément';
    if (!etat.typeId) return 'Choisissez un type de prise alimentaire';
    const sansEtat = etat.lignes.find((l) => l.type_element === 'ALIMENT' && l.aliment?.est_cuisinable && !l.etat_aliment);
    if (sansEtat) return `Choisissez l'état de ${sansEtat.aliment.nom} (Cru ou Cuit)`;
    const sansPortion = etat.lignes.find((l) => l.type_element === 'ALIMENT' && !l.est_element_supprime && !(l.portion_grammes > 0));
    if (sansPortion) return `Saisissez la portion de ${sansPortion.aliment.nom} en grammes`;
    return null;
  }

  function dessinerPied() {
    const lignesCalculables = etat.lignes.map((l) => (l.type_element === 'ALIMENT' && !(l.portion_grammes > 0) ? { ...l, portion_grammes: 0 } : l));
    const prise = agregerElements(lignesCalculables);
    const motif = motifBlocage();
    const v = prise.valeurs;
    let journee = null;
    if (autresPrisesDuJour) {
      const total = agregerAgregats([prise, ...autresPrisesDuJour.map((p) => agregerElements(p.elements))]);
      journee = el('p', { class: 'texte-secondaire' }, `Journée : ${formaterValeur('energie_kcal', total.valeurs.energie_kcal)} kcal `, indicateurIncompletude(total.causes));
    }
    const detail = el('div', { hidden: true }, blocValeurs(v));
    const bouton = el('button', {
      class: 'bouton bouton--principal bouton--large', type: 'button',
      disabled: Boolean(motif) || etat.enregistrement, 'aria-busy': etat.enregistrement ? 'true' : false,
      onclick: enregistrer,
    }, etat.enregistrement ? 'Enregistrement…' : 'Enregistrer');
    remplacer(zones.pied,
      el('button', {
        class: 'total bouton--discret', type: 'button', style: 'border:0;background:none;padding:0;cursor:pointer;text-align:left',
        'aria-label': 'Afficher le détail des valeurs de la prise', onclick: () => { detail.hidden = !detail.hidden; },
      },
      el('span', { class: 'kcal' }, `${formaterValeur('energie_kcal', v.energie_kcal)} kcal`),
      el('span', { class: 'texte-secondaire' },
        `G ${formaterValeur('glucides_g', v.glucides_g)} · L ${formaterValeur('lipides_g', v.lipides_g)} · P ${formaterValeur('proteines_g', v.proteines_g)}`),
      indicateurIncompletude(prise.causes)),
      detail,
      journee,
      motif && el('p', { class: 'texte-secondaire' }, motif),
      bouton);
  }

  // ---------------------------------------------------------------- recherche unifiée (aliments)
  function ouvrirRecherche() {
    const { feuille, fermer } = ouvrirFeuille({ titre: 'Rechercher un aliment', pleine: true });
    const resultats = el('div', { role: 'listbox', 'aria-label': 'Résultats' });
    const champ = el('input', {
      class: 'saisie', type: 'search', placeholder: 'Ajouter un aliment', autocomplete: 'off', 'aria-label': 'Rechercher un aliment',
      oninput: () => majResultats(),
    });
    function majResultats() {
      const texte = champ.value.trim();
      const cle = normaliserTexte(texte);
      const trouves = cle ? aliments.filter((a) => normaliserTexte(a.nom).includes(cle)).slice(0, 50) : aliments.slice(0, 50);
      remplacer(resultats,
        trouves.map((a) => el('button', {
          class: 'resultat-recherche', type: 'button', role: 'option',
          onclick: () => { fermer(); ouvrirFeuilleElement({ cle: nouvelleCle(), type_element: 'ALIMENT', aliment_id: a.id, aliment: a, mode_portion: 'GRAMMES', portion_grammes: null, etat_aliment: null, note_libre: null }, true); },
        },
        el('span', { 'aria-hidden': 'true' }, a.icone ?? '🥄'),
        el('span', { class: 'grandit' }, a.nom),
        statutAliment(a) === 'NON_EVALUE' && el('span', { class: 'badge badge--ambre' }, 'Non évalué'))),
        texte && el('button', {
          class: 'resultat-recherche resultat-recherche--creer', type: 'button',
          onclick: () => {
            fermer();
            ouvrirCreationAliment({
              mandantId: contexte.mandant.id, nomInitial: texte,
              surCree: (aliment) => {
                aliments.push(aliment);
                aliments.sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
                ouvrirFeuilleElement({ cle: nouvelleCle(), type_element: 'ALIMENT', aliment_id: aliment.id, aliment, mode_portion: 'GRAMMES', portion_grammes: null, etat_aliment: null, note_libre: null }, true);
              },
            });
          },
        }, `Créer l'aliment « ${texte} »`),
        !texte && aliments.length === 0 && el('p', { class: 'texte-secondaire', style: 'padding: 12px' }, 'Votre référentiel est vide : saisissez un nom pour créer un aliment.'));
    }
    remplacer(feuille,
      el('div', { class: 'ligne' }, champ, el('button', { class: 'bouton bouton--icone', type: 'button', 'aria-label': 'Fermer', onclick: fermer }, '✕')),
      resultats);
    majResultats();
    champ.focus();
  }

  // ---------------------------------------------------------------- feuille d'élément (docs/03 §5.4.2)
  function ouvrirFeuilleElement(ligneSource, estNouvelle = false) {
    const ligne = { ...ligneSource };
    const a = ligne.aliment;
    const { feuille, fermer } = ouvrirFeuille({ titre: nomElement(ligne) });
    const zoneErreur = el('div', { 'aria-live': 'polite' });
    const apercu = el('div');
    const majApercu = () => {
      const c = contributionElement({ ...ligne, portion_grammes: ligne.portion_grammes ?? 0 });
      remplacer(apercu, blocValeurs(c.valeurs, a ? { indexGlycemique: a.index_glycemique } : {}), indicateurIncompletude(c.causes));
    };
    const elements = [el('div', { class: 'ligne ligne--espacee' },
      el('h2', {}, nomElement(ligne), ' ', a && statutAliment(a) === 'NON_EVALUE' ? el('span', { class: 'badge badge--ambre' }, 'Non évalué') : null),
      el('button', { class: 'bouton bouton--icone', type: 'button', 'aria-label': 'Fermer', onclick: fermer }, '✕'))];

    if (a && statutAliment(a) === 'NON_EVALUE') {
      elements.push(el('button', {
        class: 'bouton', type: 'button',
        onclick: () => { fermer(); completerAliment(a); },
      }, 'Compléter l\'aliment'));
    }
    let portion = null;
    if (ligne.type_element === 'ALIMENT' && a) {
      if (a.est_cuisinable) {
        const puces = el('div', { class: 'puces', role: 'group', 'aria-label': 'État à la pesée' });
        const aide = el('div');
        const dessinerPuces = () => {
          remplacer(puces, ['CRU', 'CUIT'].map((v) => el('button', {
            class: 'puce', type: 'button', 'aria-pressed': String(ligne.etat_aliment === v),
            onclick: () => { ligne.etat_aliment = v; dessinerPuces(); majApercu(); },
          }, v === 'CRU' ? 'Cru' : 'Cuit')));
          remplacer(aide, ligne.etat_aliment === 'CUIT' && a.rendement_cuisson == null
            ? el('p', { class: 'avertissement' }, 'Rendement de cuisson non renseigné : cette ligne compte pour 0.')
            : '');
        };
        dessinerPuces();
        elements.push(el('div', { class: 'champ' }, el('span', {}, 'État à la pesée'), puces, aide));
      }
      portion = el('input', {
        class: 'saisie', type: 'text', inputmode: 'decimal', autocomplete: 'off', value: formaterNombre(ligne.portion_grammes),
        oninput: () => { const v = lireNombre(portion.value); ligne.portion_grammes = Number.isFinite(v) && v > 0 ? v : null; majApercu(); },
      });
      elements.push(el('label', { class: 'champ' }, el('span', {}, 'Portion (g)'), portion));
    }
    const note = el('input', { class: 'saisie', type: 'text', value: ligne.note_libre ?? '', placeholder: 'ex. poêlé, fait maison', maxlength: '200' });
    elements.push(el('label', { class: 'champ' }, el('span', {}, 'Note libre'), note), apercu, zoneErreur);

    const valider = el('button', {
      class: 'bouton bouton--principal bouton--large', type: 'button',
      onclick: () => {
        if (ligne.type_element === 'ALIMENT' && a) {
          if (a.est_cuisinable && !ligne.etat_aliment) return remplacer(zoneErreur, bandeauErreur('Choisissez l\'état à la pesée : Cru ou Cuit.'));
          if (!(ligne.portion_grammes > 0)) return remplacer(zoneErreur, bandeauErreur('Saisissez une portion en grammes.'));
        }
        ligne.note_libre = note.value.trim() || null;
        if (estNouvelle) etat.lignes.push(ligne);
        else etat.lignes = etat.lignes.map((l) => (l.cle === ligne.cle ? ligne : l));
        etat.modifie = true;
        fermer();
        dessinerLignes();
        dessinerPied();
      },
    }, estNouvelle ? 'Ajouter' : 'Mettre à jour');
    elements.push(valider);
    if (!estNouvelle) {
      elements.push(el('button', {
        class: 'bouton bouton--danger bouton--large', type: 'button',
        onclick: () => { etat.lignes = etat.lignes.filter((l) => l.cle !== ligne.cle); etat.modifie = true; fermer(); dessinerLignes(); dessinerPied(); },
      }, 'Retirer de la prise'));
    }
    remplacer(feuille, elements);
    majApercu();
    (portion ?? note).focus();
  }

  // ---------------------------------------------------------------- compléments d'aliment à la volée
  function appliquerAlimentModifie(aliment) {
    aliments = aliments.map((x) => (x.id === aliment.id ? aliment : x));
    etat.lignes.forEach((l) => { if (l.aliment_id === aliment.id) l.aliment = aliment; });
    dessinerLignes();
    dessinerPied();
  }
  function renseignerRendement(aliment) {
    ouvrirRendement({ mandantId: contexte.mandant.id, aliment, surModifie: appliquerAlimentModifie });
  }
  function completerAliment(aliment) {
    ouvrirComplementAliment({ mandantId: contexte.mandant.id, aliment, surModifie: appliquerAlimentModifie });
  }

  // ---------------------------------------------------------------- enregistrement, abandon
  async function enregistrer() {
    if (motifBlocage() || etat.enregistrement) return;
    etat.enregistrement = true;
    remplacer(zones.erreur);
    dessinerPied();
    try {
      const id = await enregistrerPrise(contexte.mandant.id, {
        id: etat.id,
        type_prise_alimentaire_id: etat.typeId,
        horodatage_prise: instantLocal(etat.date, etat.heure).toISOString(),
        date_locale: etat.date,
      }, etat.lignes.filter((l) => !l.est_element_supprime));
      contexte.dateSelectionnee = etat.date;
      contexte.priseMiseEnEvidence = id;
      etat.modifie = false;
      notifier('Prise alimentaire enregistrée');
      naviguer('journal');
    } catch (erreur) {
      etat.enregistrement = false;
      if (erreur.type === 'SESSION' && !(await renouvelerSession())) {
        dessinerPied();
        sessionExpiree();
        return;
      }
      remplacer(zones.erreur, bandeauErreur(
        erreur.type === 'METIER' ? erreur.message : 'La prise alimentaire n\'a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.',
        enregistrer));
      dessinerPied();
    }
  }

  async function sessionExpiree() {
    const ok = await confirmer({
      message: 'Votre session a expiré. Reconnectez-vous pour enregistrer cette prise alimentaire.',
      libelleOui: 'Se reconnecter',
    });
    if (!ok) return;
    conserverSaisie(contexte, etat);
    choisirMandant(contexte.mandant.code);
    try {
      await connexionGoogle(`${location.origin}${location.pathname}`);
    } catch (erreur) {
      sessionStorage.removeItem(CLE_SAISIE_EN_COURS);
      remplacer(zones.erreur, bandeauErreur(erreur.message));
    }
  }

  async function annuler() {
    if (etat.modifie && !(await confirmer({
      message: 'Abandonner cette saisie ? Les éléments ajoutés seront perdus.', libelleOui: 'Abandonner', libelleNon: 'Continuer la saisie', danger: true,
    }))) return;
    etat.modifie = false;
    naviguer(contexte.ecranPrecedent ?? 'accueil');
  }

  function dessiner() {
    dessinerContexte();
    dessinerLignes();
    dessinerPied();
    remplacer(conteneur,
      el('div', { class: 'saisie-ecran' },
        zones.erreur,
        zones.contexte,
        el('button', { class: 'bouton bouton--large champ-recherche', type: 'button', onclick: ouvrirRecherche }, '🔍 Ajouter un aliment'),
        zones.lignes),
      zones.pied);
    conteneur.parentElement?.prepend(enTete());
  }

  // Avertissement natif si l'onglet est fermé pendant une saisie non enregistrée.
  const avantDeQuitter = (e) => { if (etat.modifie) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', avantDeQuitter);

  charger();
  return () => {
    actif = false;
    window.removeEventListener('beforeunload', avantDeQuitter);
  };
}
