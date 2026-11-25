// Client Supabase simulé en mémoire, pour essayer l'interface sans compte ni base.
// Couvre uniquement les appels utilisés par les services. Panne réseau simulée avec
// window.__PANNE_RESEAU__ = true.
import { statutAliment } from '../../shared/utils/statut-aliment.js';

const UTILISATEUR = { id: 'u-demo', email: 'demo@exemple.fr', user_metadata: { full_name: 'Utilisateur de démonstration' } };
let n = 0;
const id = (p) => `${p}-${++n}`;

const base = {
  mandants: [{ id: 'm-test', code: 'TEST', libelle: 'Essais et tests', est_actif: true }],
  habilitations: [{ id: 'h1', user_id: UTILISATEUR.id, mandant_id: 'm-test', est_active: true }],
  types_prise_alimentaire: [
    ['Déjeuner', '🍽️', '11:30:00', '14:30:00', 1], ['Dîner', '🌙', '19:00:00', '22:30:00', 2],
    ['Petit déjeuner', '☕', '05:00:00', '10:00:00', 3], ['Apéritif', '🥂', '18:00:00', '20:00:00', 4],
    ['Goûter', '🍪', '15:30:00', '18:00:00', 5], ['Collation matinale', '🍎', '10:00:00', '11:30:00', 6],
    ['Collation nocturne', '🌌', '22:30:00', '05:00:00', 7],
  ].map(([libelle, icone, fenetre_debut, fenetre_fin, priorite]) => ({
    id: id('t'), mandant_id: 'm-test', libelle, icone, fenetre_debut, fenetre_fin, priorite,
    est_type_par_defaut: libelle === 'Goûter', est_archive: false,
  })),
  aliments: [
    { nom: 'Riz basmati', est_cuisinable: true, rendement_cuisson: 2.5, energie_kcal: 351, glucides_g: 77.8, sucres_g: 0.3, lipides_g: 0.9, acides_gras_satures_g: 0.2, proteines_g: 8.1, fibres_g: 1.6, sel_g: 0.01, index_glycemique: 58 },
    { nom: 'Filet de poulet', est_cuisinable: true, rendement_cuisson: null, energie_kcal: 121, glucides_g: 0, sucres_g: 0, lipides_g: 2, acides_gras_satures_g: 0.6, proteines_g: 25, fibres_g: 0, sel_g: 0.15 },
    { nom: 'Moutarde', est_cuisinable: false, energie_kcal: 151, glucides_g: 3.5, sucres_g: 2.4, lipides_g: 11.3, acides_gras_satures_g: 0.6, proteines_g: 7.1, fibres_g: null, sel_g: 6 },
    { nom: 'Huile d\'olive', est_cuisinable: false, energie_kcal: 900, glucides_g: 0, sucres_g: 0, lipides_g: 100, acides_gras_satures_g: 14, proteines_g: 0, fibres_g: 0, sel_g: 0 },
  ].map((a) => avecStatut({
    id: id('a'), mandant_id: 'm-test', icone: null, index_glycemique: null, est_non_evalue_manuel: false,
    est_base_courante: false, grammage_base_defaut: null, est_archive: false, ...a,
  })),
  prises_alimentaires: [],
  elements_prise_alimentaire: [],
};

function avecStatut(a) {
  a.statut_evaluation = statutAliment(a);
  return a;
}

function panne() {
  if (globalThis.__PANNE_RESEAU__) throw new TypeError('Failed to fetch');
}

function priseComplete(p) {
  return {
    ...p,
    type_prise_alimentaire: base.types_prise_alimentaire.find((t) => t.id === p.type_prise_alimentaire_id),
    elements: base.elements_prise_alimentaire.filter((e) => e.prise_alimentaire_id === p.id).map((e) => ({
      ...e, aliment: base.aliments.find((a) => a.id === e.aliment_id) ?? null, recette: null, plat_prepare: null,
    })),
  };
}

class Requete {
  constructor(table) {
    this.table = table;
    this.filtres = [];
    this.tri = [];
    this.operation = 'select';
    this.unique = false;
  }
  select() { if (this.operation === 'select') this.operation = 'select'; this.retour = true; return this; }
  eq(col, val) { this.filtres.push((r) => r[col] === val); return this; }
  order(col) { this.tri.push(col); return this; }
  limit(nb) { this.limite = nb; return this; }
  single() { this.unique = true; return this; }
  insert(ligne) { this.operation = 'insert'; this.donnees = ligne; return this; }
  update(champs) { this.operation = 'update'; this.donnees = champs; return this; }
  delete() { this.operation = 'delete'; return this; }

  executer() {
    panne();
    const table = base[this.table];
    if (this.operation === 'insert') {
      const ligne = { id: id(this.table[0]), est_archive: false, ...this.donnees };
      table.push(this.table === 'aliments' ? avecStatut(ligne) : ligne);
      return { data: this.unique ? ligne : [ligne], error: null };
    }
    const lignes = table.filter((r) => this.filtres.every((f) => f(r)));
    if (this.operation === 'update') {
      lignes.forEach((r) => { Object.assign(r, this.donnees); if (this.table === 'aliments') avecStatut(r); });
      return { data: this.unique ? lignes[0] : lignes, error: null };
    }
    if (this.operation === 'delete') {
      base[this.table] = table.filter((r) => !lignes.includes(r));
      if (this.table === 'prises_alimentaires') {
        base.elements_prise_alimentaire = base.elements_prise_alimentaire.filter((e) => !lignes.some((p) => p.id === e.prise_alimentaire_id));
      }
      return { data: null, error: null };
    }
    let resultat = lignes.map((r) => (this.table === 'prises_alimentaires' ? priseComplete(r) : { ...r }));
    for (const col of [...this.tri].reverse()) resultat.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0));
    if (this.limite) resultat = resultat.slice(0, this.limite);
    if (this.unique) return resultat.length === 1 ? { data: resultat[0], error: null } : { data: null, error: { message: 'introuvable', code: 'PGRST116' } };
    return { data: resultat, error: null };
  }
  then(resoudre, rejeter) {
    return new Promise((r) => setTimeout(r, 150)).then(() => this.executer()).then(resoudre, rejeter);
  }
}

function enregistrerPrise({ p_prise: p, p_elements: elements }) {
  let priseId = p.id;
  if (!priseId) {
    priseId = id('p');
    base.prises_alimentaires.push({ ...p, id: priseId });
  } else {
    Object.assign(base.prises_alimentaires.find((x) => x.id === priseId), p);
    base.elements_prise_alimentaire = base.elements_prise_alimentaire.filter((e) => e.prise_alimentaire_id !== priseId);
  }
  elements.forEach((e, position) => base.elements_prise_alimentaire.push({
    ...e, id: id('e'), prise_alimentaire_id: priseId, position, est_element_supprime: false, libelle_element_supprime: null,
  }));
  return priseId;
}

export const clientSimule = {
  from: (table) => new Requete(table),
  rpc: async (nom, args) => {
    await new Promise((r) => setTimeout(r, 300));
    panne();
    if (nom === 'enregistrer_prise_alimentaire') return { data: enregistrerPrise(args), error: null };
    return { data: null, error: { message: `RPC inconnue : ${nom}` } };
  },
  auth: {
    getSession: async () => ({ data: { session: { user: UTILISATEUR } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
    refreshSession: async () => ({ data: { session: { user: UTILISATEUR } }, error: null }),
    signInWithOAuth: async () => ({ error: null }),
  },
  base,
};
