// Fenêtres temporelles et présélection du type de prise alimentaire (RG-TMP-01 à 05).
// Heures au format 'HH:MM' ou 'HH:MM:SS' (colonnes time de PostgreSQL).

/** 'HH:MM[:SS]' → minutes depuis minuit. */
export function enMinutes(heure) {
  const [h, m] = String(heure).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Appartenance d'une heure à une fenêtre (RG-TMP-03) : début inclus, fin exclue ;
 * fenêtre traversant minuit lorsque début > fin.
 */
export function estDansFenetre(heure, fenetreDebut, fenetreFin) {
  const h = enMinutes(heure);
  const d = enMinutes(fenetreDebut);
  const f = enMinutes(fenetreFin);
  if (d === f) return false; // fenêtre interdite
  return d < f ? h >= d && h < f : h >= d || h < f;
}

/**
 * Type présélectionné pour une heure (RG-TMP-04) : parmi les types non archivés dont la
 * fenêtre couvre l'heure, celui de priorité la plus élevée (plus petit rang) ; à défaut,
 * le Type par défaut. Renvoie null si la liste est vide.
 */
export function typePreselectionne(types, heure) {
  const actifs = types.filter((t) => !t.est_archive);
  const couvrants = actifs
    .filter((t) => estDansFenetre(heure, t.fenetre_debut, t.fenetre_fin))
    .sort((a, b) => a.priorite - b.priorite);
  if (couvrants.length > 0) return couvrants[0];
  return actifs.find((t) => t.est_type_par_defaut) ?? null;
}

function deuxChiffres(n) {
  return String(n).padStart(2, '0');
}

/** Date calendaire locale 'AAAA-MM-JJ' d'un instant (RG-TMP-01), dans le fuseau du navigateur. */
export function dateLocale(date) {
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

/** Heure locale 'HH:MM' d'un instant. */
export function heureLocale(date) {
  return `${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
}

/** Instant (Date) correspondant à une date locale 'AAAA-MM-JJ' et une heure 'HH:MM'. */
export function instantLocal(dateTexte, heureTexte) {
  const [a, mo, j] = dateTexte.split('-').map(Number);
  const [h, mi] = heureTexte.split(':').map(Number);
  return new Date(a, mo - 1, j, h, mi, 0, 0);
}

/** Décale une date locale 'AAAA-MM-JJ' d'un nombre de jours. */
export function decalerDate(dateTexte, jours) {
  const [a, mo, j] = dateTexte.split('-').map(Number);
  return dateLocale(new Date(a, mo - 1, j + jours));
}

const FORMAT_DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** « Lundi 24 novembre », ou « Aujourd'hui » / « Hier » / « Demain ». */
export function libelleDate(dateTexte, aujourdhui = dateLocale(new Date())) {
  if (dateTexte === aujourdhui) return "Aujourd'hui";
  if (dateTexte === decalerDate(aujourdhui, -1)) return 'Hier';
  if (dateTexte === decalerDate(aujourdhui, 1)) return 'Demain';
  const [a, mo, j] = dateTexte.split('-').map(Number);
  const texte = FORMAT_DATE_LONGUE.format(new Date(a, mo - 1, j));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
