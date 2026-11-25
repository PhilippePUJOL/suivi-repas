// Format d'import / export de la table d'aliments (docs/04 §3.8, RG-REF-07). Fonctions pures.
// Sert à l'écran d'import / export et au script scripts/referentiel-vers-sql.js.
import { GRANDEURS_AGREGEABLES, estRenseigne } from './grandeurs.js';
import { statutAliment } from './statut-aliment.js';

export const FORMAT = 'suivi-repas/aliments';
export const VERSION = 1;

/** Champs du fichier, dans l'ordre des colonnes CSV. */
export const CHAMPS = Object.freeze([
  'nom', 'cuisinable', 'rendement_cuisson',
  ...GRANDEURS_AGREGEABLES,
  'index_glycemique', 'icone', 'non_evalue_manuel', 'archive', 'source',
]);

/** Clé de rapprochement des doublons : sans casse ni espaces en début et fin. */
export function cleNom(nom) {
  return String(nom ?? '').trim().toLocaleLowerCase('fr-FR');
}

// ---------------------------------------------------------------- lecture

function lireBooleen(valeur) {
  if (typeof valeur === 'boolean') return valeur;
  const t = String(valeur ?? '').trim().toLowerCase();
  if (t === 'oui' || t === 'true') return true;
  if (t === 'non' || t === 'false') return false;
  return undefined;
}

function estVide(valeur) {
  return valeur === null || valeur === undefined || (typeof valeur === 'string' && valeur.trim() === '');
}

function lireDecimal(valeur) {
  if (typeof valeur === 'number') return valeur;
  const t = String(valeur).trim().replace(/\s/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

/** Découpe un texte CSV (séparateur ;, guillemets doubles) en lignes de cellules. */
export function decouperCsv(texte) {
  const lignes = [];
  let ligne = [];
  let cellule = '';
  let entreGuillemets = false;
  const t = texte.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreGuillemets) {
      if (c === '"' && t[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ';') { ligne.push(cellule); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(cellule); lignes.push(ligne); ligne = []; cellule = '';
    } else cellule += c;
  }
  if (cellule !== '' || ligne.length > 0) { ligne.push(cellule); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim() !== ''));
}

/**
 * Valide et normalise un enregistrement brut (objet JSON ou ligne CSV indexée par champ).
 * Renvoie { aliment, erreurs } ; aliment reprend les colonnes de la table aliments,
 * un champ absent ou vide valant undefined (« non renseigné »).
 */
export function normaliserEnregistrement(brut) {
  const erreurs = [];
  const aliment = {};

  const nom = estVide(brut.nom) ? '' : String(brut.nom).trim();
  if (!nom) erreurs.push('Le nom est vide.');
  aliment.nom = nom;

  const cuisinable = lireBooleen(brut.cuisinable);
  if (cuisinable === undefined) erreurs.push('« cuisinable » est absent ou invalide (oui / non).');
  aliment.est_cuisinable = cuisinable;

  if (!estVide(brut.rendement_cuisson)) {
    const r = lireDecimal(brut.rendement_cuisson);
    if (!Number.isFinite(r) || r <= 0) erreurs.push('Le rendement de cuisson doit être un nombre strictement positif.');
    else if (cuisinable === false) erreurs.push('Un rendement de cuisson est interdit sur un aliment à état unique.');
    else aliment.rendement_cuisson = r;
  }

  for (const g of GRANDEURS_AGREGEABLES) {
    if (estVide(brut[g])) continue;
    const v = lireDecimal(brut[g]);
    if (!Number.isFinite(v) || v < 0) erreurs.push(`« ${g} » doit être un nombre positif ou nul.`);
    else aliment[g] = v;
  }

  if (!estVide(brut.index_glycemique)) {
    const ig = lireDecimal(brut.index_glycemique);
    if (!Number.isInteger(ig) || ig < 0 || ig > 150) erreurs.push('L\'index glycémique doit être un entier de 0 à 150.');
    else aliment.index_glycemique = ig;
  }

  if (!estVide(brut.icone)) aliment.icone = String(brut.icone).trim();

  if (!estVide(brut.non_evalue_manuel)) {
    const b = lireBooleen(brut.non_evalue_manuel);
    if (b === undefined) erreurs.push('« non_evalue_manuel » doit valoir oui ou non.');
    else aliment.est_non_evalue_manuel = b;
  }
  // « archive » et « source » sont ignorés à l'import.
  return { aliment, erreurs };
}

/**
 * Lit un fichier d'aliments JSON ou CSV (détection par le contenu).
 * Renvoie { lignes: [{ numero, aliment, erreurs }], erreurFichier }.
 * Les lignes portant le même nom dans le fichier sont toutes rejetées.
 */
export function lireFichierAliments(texte) {
  const contenu = String(texte ?? '').replace(/^﻿/, '').trim();
  let bruts;
  if (contenu.startsWith('{') || contenu.startsWith('[')) {
    let racine;
    try {
      racine = JSON.parse(contenu);
    } catch {
      return { lignes: [], erreurFichier: 'Le fichier JSON est illisible.' };
    }
    const liste = Array.isArray(racine) ? racine : racine?.aliments;
    if (!Array.isArray(liste)) return { lignes: [], erreurFichier: 'Le fichier JSON ne contient pas de liste « aliments ».' };
    bruts = liste;
  } else {
    const lignesCsv = decouperCsv(contenu);
    if (lignesCsv.length === 0) return { lignes: [], erreurFichier: 'Le fichier est vide.' };
    const entete = lignesCsv[0].map((c) => c.trim().toLowerCase());
    if (!entete.includes('nom') || !entete.includes('cuisinable')) {
      return { lignes: [], erreurFichier: 'L\'en-tête CSV doit contenir au moins les colonnes « nom » et « cuisinable ».' };
    }
    bruts = lignesCsv.slice(1).map((cellules) => {
      const o = {};
      entete.forEach((champ, i) => { o[champ] = cellules[i]; });
      return o;
    });
  }

  const lignes = bruts.map((brut, i) => ({ numero: i + 1, ...normaliserEnregistrement(brut ?? {}) }));

  const occurrences = new Map();
  for (const l of lignes) {
    if (!l.aliment.nom) continue;
    const k = cleNom(l.aliment.nom);
    occurrences.set(k, (occurrences.get(k) ?? 0) + 1);
  }
  for (const l of lignes) {
    if (l.aliment.nom && occurrences.get(cleNom(l.aliment.nom)) > 1) {
      l.erreurs.push('Plusieurs lignes du fichier portent ce nom.');
    }
  }
  return { lignes, erreurFichier: null };
}

// ---------------------------------------------------------------- planification de l'import

/**
 * Prépare l'import sans rien écrire (prévisualisation, docs/03 §5.5.5).
 * @param lignes résultat de lireFichierAliments
 * @param existants aliments du mandant actif ({ id, nom, est_cuisinable, … })
 * @param choixDoublon (ligne, existant) => 'IGNORER' | 'METTRE_A_JOUR' | 'CREER'
 * @param idsUtilises Set des id d'aliments utilisés dans une prise ou une recette (RG-ETAT-05)
 * @returns { operations: [{ type: 'CREER'|'METTRE_A_JOUR'|'IGNORER'|'REJETER', numero, nom, valeurs, id, motifs }], compteRendu }
 */
export function planifierImport(lignes, existants, choixDoublon, idsUtilises = new Set()) {
  const parCle = new Map(existants.map((a) => [cleNom(a.nom), a]));
  const operations = [];
  for (const l of lignes) {
    if (l.erreurs.length > 0) {
      operations.push({ type: 'REJETER', numero: l.numero, nom: l.aliment.nom, motifs: l.erreurs });
      continue;
    }
    const existant = parCle.get(cleNom(l.aliment.nom));
    const choix = existant ? choixDoublon(l, existant) : 'CREER';
    if (choix === 'IGNORER') {
      operations.push({ type: 'IGNORER', numero: l.numero, nom: l.aliment.nom });
    } else if (choix === 'METTRE_A_JOUR') {
      const valeurs = {};
      for (const [k, v] of Object.entries(l.aliment)) if (v !== undefined && k !== 'nom') valeurs[k] = v;
      if (valeurs.est_cuisinable !== undefined && valeurs.est_cuisinable !== existant.est_cuisinable && idsUtilises.has(existant.id)) {
        operations.push({
          type: 'REJETER', numero: l.numero, nom: l.aliment.nom,
          motifs: ['Cet aliment est déjà utilisé : il ne peut pas passer de cuisinable à état unique, ni l\'inverse.'],
        });
        continue;
      }
      const resultat = { ...existant, ...valeurs };
      if (!resultat.est_cuisinable) {
        if (estRenseigne(resultat.rendement_cuisson)) {
          operations.push({
            type: 'REJETER', numero: l.numero, nom: l.aliment.nom,
            motifs: ['Un rendement de cuisson est interdit sur un aliment à état unique.'],
          });
          continue;
        }
      }
      operations.push({ type: 'METTRE_A_JOUR', numero: l.numero, nom: existant.nom, id: existant.id, valeurs, statut: statutAliment(resultat) });
    } else {
      const valeurs = {};
      for (const [k, v] of Object.entries(l.aliment)) if (v !== undefined) valeurs[k] = v;
      operations.push({ type: 'CREER', numero: l.numero, nom: l.aliment.nom, valeurs, statut: statutAliment(valeurs) });
    }
  }
  const compter = (t) => operations.filter((o) => o.type === t).length;
  return {
    operations,
    compteRendu: {
      crees: compter('CREER'),
      mis_a_jour: compter('METTRE_A_JOUR'),
      ignores: compter('IGNORER'),
      rejetes: compter('REJETER'),
      non_evalues: operations.filter((o) => (o.type === 'CREER' || o.type === 'METTRE_A_JOUR') && o.statut === 'NON_EVALUE').length,
    },
  };
}

// ---------------------------------------------------------------- export

function versEnregistrement(a) {
  const e = {
    nom: a.nom,
    cuisinable: Boolean(a.est_cuisinable),
    rendement_cuisson: estRenseigne(a.rendement_cuisson) ? Number(a.rendement_cuisson) : null,
  };
  for (const g of GRANDEURS_AGREGEABLES) e[g] = estRenseigne(a[g]) ? Number(a[g]) : null;
  e.index_glycemique = estRenseigne(a.index_glycemique) ? Number(a.index_glycemique) : null;
  e.icone = a.icone ?? null;
  e.non_evalue_manuel = Boolean(a.est_non_evalue_manuel);
  e.archive = Boolean(a.est_archive);
  return e;
}

export function nomFichierExport(codeMandant, date, extension) {
  return `aliments-${codeMandant}-${date}.${extension}`;
}

export function exporterJson(aliments, codeMandant, maintenant = new Date()) {
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    mandant: codeMandant,
    exporte_le: maintenant.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    aliments: aliments.map(versEnregistrement),
  }, null, 2);
}

function celluleCsv(valeur) {
  if (valeur === null || valeur === undefined) return '';
  if (typeof valeur === 'boolean') return valeur ? 'oui' : 'non';
  if (typeof valeur === 'number') return String(valeur).replace('.', ',');
  const t = String(valeur);
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function exporterCsv(aliments) {
  const lignes = [CHAMPS.join(';')];
  for (const a of aliments) {
    const e = versEnregistrement(a);
    lignes.push(CHAMPS.map((c) => celluleCsv(e[c])).join(';'));
  }
  return '﻿' + lignes.join('\r\n') + '\r\n';
}
