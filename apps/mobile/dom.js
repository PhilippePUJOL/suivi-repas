// Construction sûre du DOM : createElement / textContent uniquement (jamais innerHTML
// avec des données, docs/04 §2.1).

/**
 * el('button', { class: 'bouton', onclick: fn, 'aria-label': '…' }, 'Texte', autreNoeud)
 * - les attributs on* sont des écouteurs ; class, for, value, checked, disabled sont gérés ;
 * - false / null / undefined sont ignorés (attributs et enfants).
 */
export function el(balise, attributs = {}, ...enfants) {
  const n = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs ?? {})) {
    if (valeur === false || valeur === null || valeur === undefined) continue;
    if (cle.startsWith('on') && typeof valeur === 'function') n.addEventListener(cle.slice(2), valeur);
    else if (cle === 'class') n.className = valeur;
    else if (cle === 'value') n.value = valeur;
    else if (cle === 'checked' || cle === 'disabled' || cle === 'hidden') n[cle] = Boolean(valeur);
    else if (cle === 'dataset') Object.assign(n.dataset, valeur);
    else n.setAttribute(cle, valeur === true ? '' : String(valeur));
  }
  ajouter(n, enfants);
  return n;
}

function ajouter(parent, enfants) {
  for (const e of enfants.flat(Infinity)) {
    if (e === false || e === null || e === undefined) continue;
    parent.append(e instanceof Node ? e : document.createTextNode(String(e)));
  }
}

/** Remplace le contenu d'un nœud. */
export function remplacer(noeud, ...enfants) {
  noeud.replaceChildren();
  ajouter(noeud, enfants);
  return noeud;
}

/** Comparaison insensible à la casse et aux accents (docs/03 §4.5). */
export function normaliserTexte(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
