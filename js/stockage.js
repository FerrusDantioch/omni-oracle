// Stockage sur l'appareil (localStorage) et export / import en fichier JSON.
//
// Tous les noms commencent par le préfixe de l'application (config.js : idStockage),
// pour ne jamais se mélanger avec les autres applications du même site.
//   <prefixe>-parties   : toutes les parties { id: partie }
//   <prefixe>-courante  : id de la partie ouverte
//   <prefixe>-reglages  : réglages de l'appareil (thème, vibration, dé physique…)

const CONFIG = globalThis.CONFIG_APP;
const P = CONFIG.idStockage;
const CLE_PARTIES = `${P}-parties`;
const CLE_COURANTE = `${P}-courante`;
const CLE_REGLAGES = `${P}-reglages`;

export const REGLAGES_PAR_DEFAUT = Object.freeze({
  theme: 'omni',        // 'omni' | 'sombre' | 'clair' | 'auto'
  vibration: true,
  dePhysique: false,    // saisir le résultat d'un vrai dé au lieu de le lancer
  secret: false,        // « Masquer les résultats (écran visible des joueurs) » : floutés, révélés au toucher
  luminosite: 100,      // en %, de 50 à 100 (100 = aucun assombrissement)
});

function lire(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle);
    return brut === null ? defaut : JSON.parse(brut);
  } catch {
    return defaut;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch (e) {
    console.error('Enregistrement impossible', e);
    return false;
  }
}

// --- Réglages -------------------------------------------------------------------------
export function lireReglages() {
  return Object.assign({}, REGLAGES_PAR_DEFAUT, lire(CLE_REGLAGES, {}));
}
export function ecrireReglages(r) {
  return ecrire(CLE_REGLAGES, r);
}

// --- Parties ---------------------------------------------------------------------------
export function listerParties() {
  return Object.values(lire(CLE_PARTIES, {})).sort((a, b) => (b.modifie || '').localeCompare(a.modifie || ''));
}
export function lirePartie(id) {
  return lire(CLE_PARTIES, {})[id] || null;
}
export function enregistrerPartie(partie) {
  const toutes = lire(CLE_PARTIES, {});
  toutes[partie.id] = partie;
  return ecrire(CLE_PARTIES, toutes);
}
export function supprimerPartie(id) {
  const toutes = lire(CLE_PARTIES, {});
  delete toutes[id];
  ecrire(CLE_PARTIES, toutes);
  if (lire(CLE_COURANTE, null) === id) localStorage.removeItem(CLE_COURANTE);
}
export function lireCourante() {
  return lire(CLE_COURANTE, null);
}
export function ecrireCourante(id) {
  if (id) ecrire(CLE_COURANTE, id);
  else localStorage.removeItem(CLE_COURANTE);
}

// --- Export / import --------------------------------------------------------------------

function nomFichier(texte) {
  const propre = String(texte || 'partie').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
  return propre || 'partie';
}

function telecharger(nom, objet) {
  const blob = new Blob([JSON.stringify(objet, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Enregistre une partie dans un fichier .json (dossier Téléchargements). */
export function exporterPartie(partie) {
  telecharger(`oracle-${nomFichier(partie.mission?.nom)}-${aujourdhui()}.json`, {
    application: CONFIG.nom,
    type: 'partie',
    version: CONFIG.version,
    exporte: new Date().toISOString(),
    partie,
  });
}

/** Enregistre toutes les parties dans un seul fichier .json. */
export function exporterTout() {
  telecharger(`oracle-toutes-les-parties-${aujourdhui()}.json`, {
    application: CONFIG.nom,
    type: 'parties',
    version: CONFIG.version,
    exporte: new Date().toISOString(),
    parties: listerParties(),
  });
}

/** Vérifie qu'un objet ressemble bien à une partie de l'Oracle. Renvoie un message d'erreur ou null. */
export function verifierPartie(p, universConnus) {
  if (!p || typeof p !== 'object') return 'ce n\'est pas une partie';
  if (p.format !== 1) return 'format de partie inconnu';
  for (const champ of ['id', 'univers', 'mode', 'pression', 'scene', 'pjs', 'oracle', 'journal', 'fiche']) {
    if (p[champ] === undefined) return `il manque « ${champ} »`;
  }
  if (!universConnus.includes(p.univers)) return `univers inconnu (« ${p.univers} »)`;
  if (!Array.isArray(p.pjs) || !Array.isArray(p.journal)) return 'contenu abîmé';
  return null;
}

/**
 * Lit un fichier choisi par la personne. Renvoie la liste des parties qu'il contient.
 * Lève une erreur claire si le fichier n'est pas reconnu.
 */
export async function lireFichierImport(fichier, universConnus) {
  let donnees;
  try {
    donnees = JSON.parse(await fichier.text());
  } catch {
    throw new Error('Ce fichier n\'est pas un fichier JSON lisible.');
  }
  if (donnees?.application !== CONFIG.nom) throw new Error('Ce fichier ne vient pas d\'Omni-Oracle.');
  const parties = donnees.type === 'partie' ? [donnees.partie] : donnees.type === 'parties' ? donnees.parties : null;
  if (!Array.isArray(parties) || parties.length === 0) throw new Error('Ce fichier ne contient aucune partie.');
  for (const p of parties) {
    const err = verifierPartie(p, universConnus);
    if (err) throw new Error(`Partie illisible : ${err}.`);
  }
  return parties;
}
