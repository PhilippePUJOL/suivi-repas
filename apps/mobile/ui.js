// Briques d'interface partagées par les écrans (docs/03 §4).
import { el, remplacer } from './dom.js';
import { GRANDEURS_AGREGEABLES, LIBELLES_GRANDEURS, UNITES_GRANDEURS } from '../../shared/utils/grandeurs.js';
import { formaterValeur, LIBELLES_CAUSES } from '../../shared/utils/calcul-nutritionnel.js';
import { libelleDate, decalerDate } from '../../shared/utils/fenetre-temporelle.js';

// ---------- Notification brève (4 s)
let minuterieNotification = null;
export function notifier(message) {
  document.querySelector('.notification')?.remove();
  clearTimeout(minuterieNotification);
  const n = el('div', { class: 'notification', role: 'status' }, message);
  document.body.append(n);
  minuterieNotification = setTimeout(() => n.remove(), 4000);
}

// ---------- Bandeau d'erreur persistant avec « Réessayer »
export function bandeauErreur(message, reessayer) {
  return el('div', { class: 'bandeau-erreur', role: 'alert' },
    el('span', { class: 'grandit' }, message),
    reessayer && el('button', { class: 'bouton', type: 'button', onclick: reessayer }, 'Réessayer'));
}

// ---------- Indicateur d'incomplétude (triangle + texte accessible)
export function indicateurIncompletude(causes, surTap) {
  if (!causes || causes.length === 0) return null;
  const texte = causes.map((c) => LIBELLES_CAUSES[c]).join(' · ');
  return el(surTap ? 'button' : 'span', {
    class: surTap ? 'incompletude bouton--discret' : 'incompletude',
    type: surTap ? 'button' : undefined,
    title: texte,
    'aria-label': `Total incomplet : ${texte}`,
    onclick: surTap ? (e) => { e.stopPropagation(); surTap(); } : (e) => { e.stopPropagation(); notifier(texte); },
  }, '⚠');
}

// ---------- Bloc de valeurs complet (docs/03 §4.3)
const SOUS_GRANDEURS = new Set(['sucres_g', 'acides_gras_satures_g']);
export function blocValeurs(valeurs, { indexGlycemique } = {}) {
  const lignes = [];
  for (const g of GRANDEURS_AGREGEABLES) {
    const unite = UNITES_GRANDEURS[g];
    lignes.push(
      el('span', { class: SOUS_GRANDEURS.has(g) ? 'retrait' : '' }, LIBELLES_GRANDEURS[g]),
      el('span', { class: 'nombre' }, `${formaterValeur(g, valeurs[g])} ${unite}`));
  }
  if (indexGlycemique !== undefined) {
    lignes.push(el('span', {}, 'Index glycémique'), el('span', { class: 'nombre' }, formaterValeur('index_glycemique', indexGlycemique)));
  }
  return el('div', { class: 'valeurs' }, lignes);
}

// ---------- Feuille (panneau depuis le bas). Renvoie { fermer, feuille }.
export function ouvrirFeuille({ titre, pleine = false, surFermeture } = {}) {
  const precedent = document.activeElement;
  const feuille = el('div', { class: `feuille${pleine ? ' feuille--pleine' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titre });
  const voile = el('div', { class: 'voile' }, feuille);
  const fermer = () => {
    voile.remove();
    document.removeEventListener('keydown', surTouche);
    precedent?.focus?.();
    surFermeture?.();
  };
  const surTouche = (e) => { if (e.key === 'Escape') fermer(); };
  voile.addEventListener('click', (e) => { if (e.target === voile) fermer(); });
  document.addEventListener('keydown', surTouche);
  document.body.append(voile);
  return { feuille, fermer };
}

// ---------- Dialogue de confirmation (docs/03 §4.6). Renvoie une promesse booléenne.
export function confirmer({ message, libelleOui = 'Confirmer', libelleNon = 'Annuler', danger = false }) {
  return new Promise((resoudre) => {
    let reponse = false;
    const { feuille, fermer } = ouvrirFeuille({ titre: 'Confirmation', surFermeture: () => resoudre(reponse) });
    const oui = el('button', {
      class: `bouton bouton--large ${danger ? 'bouton--danger' : 'bouton--principal'}`, type: 'button',
      onclick: () => { reponse = true; fermer(); },
    }, libelleOui);
    remplacer(feuille,
      el('p', {}, message),
      el('div', { class: 'pile' }, oui,
        el('button', { class: 'bouton bouton--large', type: 'button', onclick: fermer }, libelleNon)));
    oui.focus();
  });
}

// ---------- Navigation de date (‹ date ›), sur la date partagée du contexte (docs/03 §3.5)
export function navigationDate(contexte, surChangement) {
  const champ = el('input', {
    type: 'date', class: 'visuellement-cache', value: contexte.dateSelectionnee, 'aria-label': 'Choisir une date',
    onchange: () => { if (champ.value) changer(champ.value); },
  });
  const libelle = el('button', {
    class: 'bouton bouton--discret date', type: 'button',
    onclick: () => (champ.showPicker ? champ.showPicker() : champ.focus()),
  }, libelleDate(contexte.dateSelectionnee));
  function changer(date) {
    contexte.dateSelectionnee = date;
    surChangement(date);
  }
  return el('div', { class: 'navigation-date' },
    el('button', { class: 'bouton bouton--icone', type: 'button', 'aria-label': 'Jour précédent', onclick: () => changer(decalerDate(contexte.dateSelectionnee, -1)) }, '‹'),
    libelle, champ,
    el('button', { class: 'bouton bouton--icone', type: 'button', 'aria-label': 'Jour suivant', onclick: () => changer(decalerDate(contexte.dateSelectionnee, 1)) }, '›'));
}

// ---------- État de chargement / vide
export function chargement(texte = 'Chargement…') {
  return el('p', { class: 'texte-secondaire', role: 'status', 'aria-live': 'polite' }, texte);
}
