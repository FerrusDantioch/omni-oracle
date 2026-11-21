// =============================================================================
// Moteur de règles de l'Oracle Omni-système.
//
// Ce fichier ne touche jamais à l'affichage : il calcule, et c'est tout. Il est
// utilisé par l'application (index.html) et par les tests (tests/moteur.test.mjs).
//
// Toutes les règles appliquées ici viennent de data/commun.json (section par
// section du tronc commun). Les nombres (Pression de départ, seuils…) sont lus
// dans ce fichier de données, pas écrits en dur.
//
// Les dés : chaque fonction qui lance un dé reçoit en option un paramètre `de`,
// une fonction de(faces) qui renvoie un entier entre 1 et faces. Par défaut, on
// utilise le hasard du navigateur (crypto). Les tests fournissent des dés
// « truqués » pour vérifier chaque cas précis.
// =============================================================================

// --- Hasard --------------------------------------------------------------------

/** Dé équitable : entier de 1 à `faces`, tiré avec le générateur cryptographique. */
export function deAleatoire(faces) {
  const limite = Math.floor(0x100000000 / faces) * faces; // évite le biais du modulo
  const tampon = new Uint32Array(1);
  let x;
  do { globalThis.crypto.getRandomValues(tampon); x = tampon[0]; } while (x >= limite);
  return 1 + (x % faces);
}

/** Lance une formule simple du type « 1d4+1 » ou « 2d6-1 ». */
export function lancerFormule(formule, de = deAleatoire) {
  const m = String(formule).replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!m) throw new Error(`Formule de dé illisible : ${formule}`);
  const nombre = m[1] ? +m[1] : 1;
  const des = Array.from({ length: nombre }, () => de(+m[2]));
  const bonus = m[3] ? +m[3] : 0;
  return { formule, des, bonus, total: des.reduce((a, b) => a + b, 0) + bonus };
}

/** Vérifie qu'une valeur saisie à la main est bien un résultat de d20 (1 à 20). */
export function valeurD20Valide(v) {
  return Number.isInteger(v) && v >= 1 && v <= 20;
}

/**
 * Lance un d20 avec avantage, désavantage ou normalement, puis ajoute le modificateur.
 * - mode : 'normal' | 'avantage' | 'desavantage'
 * - des  : (facultatif) valeurs d'un vrai dé saisies à la main (1 valeur, ou 2 si avantage/désavantage)
 * Renvoie { mode, des, naturel, modificateur, total }. `naturel` est la valeur du dé gardé.
 */
export function lancerD20({ mode = 'normal', modificateur = 0, des = null, de = deAleatoire } = {}) {
  const nb = mode === 'normal' ? 1 : 2;
  let valeurs;
  if (des) {
    if (des.length !== nb) throw new Error(`Il faut ${nb} valeur(s) de dé pour ce jet.`);
    if (!des.every(valeurD20Valide)) throw new Error('Un d20 donne un nombre entier de 1 à 20.');
    valeurs = [...des];
  } else {
    valeurs = Array.from({ length: nb }, () => de(20));
  }
  const naturel = mode === 'avantage' ? Math.max(...valeurs)
    : mode === 'desavantage' ? Math.min(...valeurs)
    : valeurs[0];
  return { mode, des: valeurs, naturel, modificateur, total: naturel + modificateur };
}

// --- Lecture des tables ------------------------------------------------------------

/** Lit une plage écrite comme dans les sources : « 5 », « 1-4 », « 2 à 7 », « 1 ou moins », « 20 ou plus ». */
export function lirePlage(texte) {
  const t = String(texte).trim();
  let m;
  if ((m = t.match(/^(\d+)$/))) return { min: +m[1], max: +m[1] };
  if ((m = t.match(/^(\d+)\s*-\s*(\d+)$/))) return { min: +m[1], max: +m[2] };
  if ((m = t.match(/^(\d+) à (\d+)$/))) return { min: +m[1], max: +m[2] };
  if ((m = t.match(/^(\d+) ou moins$/))) return { min: -Infinity, max: +m[1] };
  if ((m = t.match(/^(\d+) ou plus$/))) return { min: +m[1], max: Infinity };
  return null;
}

/** Ramène un total entre 1 et 20 (un 24 se lit sur la dernière ligne, un −1 sur la première). */
export function borner20(v) {
  return Math.min(20, Math.max(1, v));
}

/** Indice de la ligne d'une table (ou de la colonne d'une grille) correspondant à une valeur. */
export function indiceParValeur(plages, valeur) {
  const v = borner20(valeur);
  return plages.findIndex((p) => { const r = lirePlage(p); return r && v >= r.min && v <= r.max; });
}

/** Ligne d'une table d20 correspondant à une valeur (bornée entre 1 et 20). */
export function ligneParValeur(table, valeur) {
  const i = indiceParValeur(table.lignes.map((l) => l.plage), valeur);
  return i < 0 ? null : table.lignes[i];
}

/**
 * Catalogue : réunit le tronc commun et les univers, et suit les renvois entre
 * tables (ex. N2 du space opéra = N2 du cyberpunk).
 */
export function creerCatalogue(commun, listeUnivers) {
  const univers = [...listeUnivers].sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));
  const parId = Object.fromEntries(univers.map((u) => [u.id, u]));
  function table(universId, tableId, profondeur = 0) {
    const doc = universId === 'commun' ? commun : parId[universId];
    if (!doc) throw new Error(`Univers inconnu : ${universId}`);
    const t = doc.tables.find((x) => x.id === tableId);
    if (!t) throw new Error(`Table inconnue : ${universId}/${tableId}`);
    if (t.reference) {
      if (profondeur > 5) throw new Error('Renvoi de table en boucle.');
      const cible = table(t.reference.univers, t.reference.table, profondeur + 1);
      return Object.assign({}, cible, { id: t.id, titre: t.titre, reference: t.reference, origine: cible });
    }
    return t;
  }
  /** D'où vient une table reprise : « du tronc commun » ou « de l'univers « Cyberpunk » ». */
  const origine = (ref) => (ref.univers === 'commun' ? 'du tronc commun' : `de l'univers « ${parId[ref.univers].nom} »`);
  return { commun, univers, parId, table, univ: (id) => parId[id], origine };
}

/** Tire une ligne dans une table d20 (ou prend la valeur imposée). */
export function tirerTable(table, { valeur = null, de = deAleatoire } = {}) {
  const v = valeur ?? de(20);
  return { table: table.id, titre: table.titre, valeur: v, ligne: ligneParValeur(table, v) };
}

// --- Oracle de question (tronc commun, section 2) -----------------------------------

const tableCommune = (commun, id) => commun.tables.find((t) => t.id === id);

export function vraisemblances(commun) {
  return tableCommune(commun, 'vraisemblances').lignes;
}

export function vraisemblance(commun, id) {
  const v = vraisemblances(commun).find((x) => x.id === id);
  if (!v) throw new Error(`Vraisemblance inconnue : ${id}`);
  return v;
}

export function reponses(commun) {
  return tableCommune(commun, 'reponses').lignes;
}

/**
 * Réponse de l'oracle pour un jet déjà fait.
 * Un 1 ou un 20 naturel l'emportent toujours sur les modificateurs.
 */
export function lireReponse(commun, jet) {
  const reps = reponses(commun);
  let id;
  if (jet.naturel === 1) id = commun.oracle.naturel1;
  else if (jet.naturel === 20) id = commun.oracle.naturel20;
  if (id) return reps.find((r) => r.id === id);
  return ligneParValeur(tableCommune(commun, 'reponses'), jet.total);
}

/** Pose une question à l'oracle (sans l'inscrire au journal). */
export function interrogerOracle(commun, { vraisemblance: idV = commun.oracle.vraisemblanceParDefaut, des = null, de = deAleatoire } = {}) {
  const v = vraisemblance(commun, idV);
  const jet = lancerD20({ mode: v.jet.mode, modificateur: v.jet.modificateur, des, de });
  const rep = lireReponse(commun, jet);
  return {
    vraisemblance: v.id,
    jet,
    reponse: rep.id,
    libelle: rep.libelle,
    naturel: jet.naturel === 1 || jet.naturel === 20,
    complication: commun.oracle.complications[rep.id] || null, // 'mineure' | 'majeure' | null
  };
}

/** Vraisemblance liée à une attitude (hostile : improbable ; neutre : incertain ; amical : probable). */
export function vraisemblancePourAttitude(commun, attitude) {
  const a = commun.attitudes.find((x) => x.id === attitude);
  return a ? a.vraisemblance : commun.oracle.vraisemblanceParDefaut;
}

// --- Options d'univers -------------------------------------------------------------

/**
 * Différences de règles d'un univers (bloc « options » de son JSON). Une option absente
 * = comme le tronc commun. Le code lit ces options ; il ne teste jamais le nom d'un univers.
 * - omniPoints : false = aucun omni-point (ni PJ ni Oracle), pas de gain au seuil de rupture
 * - contestation : false = pas de contestation en duo (sans omni-points, jamais de contestation)
 * - rebondissementAuSeuil : true = propose l'« option à tester » de la source (case décochée par
 *   défaut, dans la partie) : à 9, tirer le rebondissement s'il ne l'est pas encore
 * - paliers : table de l'univers qui remplace les paliers de Pression du tronc commun
 * - profils : tables de profils d'intention ajoutées à celles du tronc commun
 * - fiche : rubriques en plus dans la fiche de suivi ; chocs : compteur de chocs par PJ
 * - rappelOmni : rappel affiché avec « Dépenser un omni-point » ; libelles : mots de l'interface
 */
export function optionsUnivers(univers) {
  const o = (univers && univers.options) || {};
  const omniPoints = o.omniPoints !== false;
  return {
    omniPoints,
    contestation: omniPoints && o.contestation !== false,
    rebondissementAuSeuil: !!o.rebondissementAuSeuil,
    paliers: o.paliers || null,
    profils: o.profils || [],
    fiche: o.fiche || [],
    chocs: o.chocs || null,
    rappelOmni: o.rappelOmni || '',
    libelles: o.libelles || {},
  };
}

/**
 * Mot qui remplace « mission » dans l'interface (options.libelles.mission = { nom, feminin },
 * ex. « quête » en fantasy, « mystère » en horreur), avec ses accords tout faits.
 */
export function vocabulaire(univers) {
  const v = optionsUnivers(univers).libelles.mission || { nom: 'mission', feminin: true };
  const f = v.feminin !== false;
  const n = v.nom;
  const voyelle = /^[aeiouyéèêh]/i.test(n);
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const la = voyelle ? `l'${n}` : `${f ? 'la' : 'le'} ${n}`;
  return {
    nom: n,
    Nom: maj(n),
    la,
    de: voyelle ? `de l'${n}` : `${f ? 'de la' : 'du'} ${n}`,
    toute: `${f ? 'toute' : 'tout'} ${la}`,
    nouvelle: `${f ? 'nouvelle' : (voyelle ? 'nouvel' : 'nouveau')} ${n}`,
    suivante: `${n} ${f ? 'suivante' : 'suivant'}`,
    Suivante: `${maj(n)} ${f ? 'suivante' : 'suivant'}`,
    laSuivante: `${la} ${f ? 'suivante' : 'suivant'}`,
    deLaNouvelle: f ? `de la nouvelle ${n}` : `du ${voyelle ? 'nouvel' : 'nouveau'} ${n}`,
    sansNom: `${maj(n)} sans nom`,
    tiree: f ? 'tirée' : 'tiré',
    cette: `${f ? 'cette' : (voyelle ? 'cet' : 'ce')} ${n}`,
    bonne: f ? 'Bonne' : 'Bon',
  };
}

// --- Pression (section 3) -----------------------------------------------------------

/** Paliers de Pression : ceux de l'univers s'il en a (ex. horreur), sinon ceux du tronc commun. */
export function paliers(commun, univers = null) {
  const id = optionsUnivers(univers).paliers;
  return (id ? univers.tables.find((t) => t.id === id) : tableCommune(commun, 'paliers')).lignes;
}

/**
 * Palier correspondant à une valeur de Pression, avec la chance d'altération (Pression × 5 %).
 * Seuls les noms et les textes changent d'un univers à l'autre, jamais la mécanique.
 */
export function palier(commun, pression, univers = null) {
  const p = paliers(commun, univers).find((x) => pression >= x.min && pression <= x.max);
  return Object.assign({}, p, { chance: pression * commun.pression.chanceParPoint });
}

function bornerPression(commun, v) {
  return Math.min(commun.pression.max, Math.max(commun.pression.min, v));
}

// --- Partie ---------------------------------------------------------------------------

function nouvelleScene(numero) {
  return { numero, prevue: '', etat: 'preparation', soupape: false, alteration: null, pressionBougee: false };
}

/**
 * Crée une partie neuve.
 * pjs : [{ nom }] (1 en solo, 2 en duo) ; pnjs : [{ nom, role, attitude, profil, notes }]
 */
export function creerPartie(commun, univers, { mode = 'solo', mission = '', pjs = [{ nom: '' }], pnjs = [], id = null } = {}) {
  if (mode === 'duo' && pjs.length !== 2) throw new Error('Le mode duo demande deux PJ.');
  if (mode === 'solo' && pjs.length !== 1) throw new Error('Le mode solo demande un PJ.');
  const maintenant = new Date().toISOString();
  return {
    format: 1,
    id: id || `partie-${Date.now().toString(36)}`,
    cree: maintenant,
    modifie: maintenant,
    univers: univers.id,
    mode,
    mission: { nom: mission, numero: 1 },
    pression: commun.pression.depart,
    seuilAtteint: false,
    rebondissementSignale: false,
    scene: nouvelleScene(1),
    pjs: pjs.map((p, i) => ({ id: `pj${i + 1}`, nom: p.nom || `PJ ${i + 1}`, omni: univers.omniPointsPJ })),
    oracle: { omni: commun.omniPoints.oracleDepart, utilisationsJoueurs: 0 },
    tirageMission: {},
    journal: [],
    compteur: 0,
    fiche: {
      fils: [],
      pnjs: pnjs.map((p) => Object.assign({ nom: '', role: '', attitude: 'neutre', profil: '', notes: '' }, p)),
      menaces: [],
      lieux: [],
      scenes: [],
    },
  };
}

/**
 * Type d'une entrée du journal. Jusqu'à la version 0.2.1, les débuts de scène étaient
 * enregistrés par erreur avec le type « modifiee », « interrompue » ou null : on les
 * reconnaît à leurs champs, sans modifier les parties enregistrées.
 */
export function typeEntree(e) {
  if (e.type !== 'scene-debut' && 'alteree' in e && 'soupape' in e && 'prevue' in e) return 'scene-debut';
  return e.type;
}
/** Altération d'un début de scène : 'modifiee', 'interrompue' ou null. */
export const alterationEntree = (e) => (e.type === 'scene-debut' ? e.alteration ?? null : e.type);

/** Ajoute une entrée au journal et la renvoie. */
export function journaliser(partie, entree) {
  partie.compteur += 1;
  const e = Object.assign({ n: partie.compteur, quand: new Date().toISOString(), scene: partie.scene.numero, mission: partie.mission.numero }, entree);
  partie.journal.push(e);
  partie.modifie = e.quand;
  return e;
}

/**
 * Vérifie les seuils après un changement de Pression :
 * - seuil de rupture : la 1re fois qu'elle atteint 9 dans la mission, l'Oracle gagne 1 omni-point
 *   (rien dans un univers sans omni-points : l'événement est signalé avec un gain de 0) ;
 * - étau : la 1re fois qu'elle atteint 7, on signale que le rebondissement entre en jeu.
 * Renvoie la liste des événements survenus.
 */
function verifierSeuils(commun, partie, univers = null) {
  const ev = [];
  if (!partie.seuilAtteint && partie.pression >= commun.pression.seuilRupture) {
    partie.seuilAtteint = true;
    const gain = optionsUnivers(univers).omniPoints ? commun.omniPoints.gainSeuilRupture : 0;
    partie.oracle.omni += gain;
    ev.push({ type: 'seuil-rupture', gain });
  }
  if (!partie.rebondissementSignale && partie.pression >= commun.pression.etau) {
    partie.rebondissementSignale = true;
    ev.push({ type: 'rebondissement' });
  }
  return ev;
}

/**
 * Change la Pression à la main (+1 / −1 du tableau de bord).
 * La Pression ne bouge qu'une fois par scène : si elle a déjà bougé, le
 * changement est fait quand même mais `dejaBougee` le signale.
 */
export function ajusterPression(commun, partie, delta, { univers = null } = {}) {
  const avant = partie.pression;
  const dejaBougee = partie.scene.pressionBougee;
  partie.pression = bornerPression(commun, avant + delta);
  if (partie.pression !== avant) partie.scene.pressionBougee = true;
  const evenements = verifierSeuils(commun, partie, univers);
  if (partie.pression !== avant) journaliser(partie, { type: 'pression', avant, apres: partie.pression, manuel: true });
  return { avant, apres: partie.pression, dejaBougee, evenements };
}

// --- Scènes (section 4) -------------------------------------------------------------

/**
 * Début de scène : lance le d20 d'altération.
 * - Pression à 10 (soupape) : scène automatiquement altérée ; le d20 décide pair/impair.
 * - Sinon : altérée si d20 ≤ Pression ; pair = modifiée, impair = interrompue.
 * Si la scène est altérée et qu'une table de complications est fournie, on y tire une ligne.
 */
export function debuterScene(commun, partie, { prevue = '', complications = null, des = null, de = deAleatoire, univers = null } = {}) {
  const valeur = des ?? de(20);
  if (!valeurD20Valide(valeur)) throw new Error('Un d20 donne un nombre entier de 1 à 20.');
  const soupape = partie.pression >= commun.pression.soupape.niveau;
  const alteree = soupape || valeur <= partie.pression;
  const type = alteree ? (valeur % 2 === 0 ? 'modifiee' : 'interrompue') : null;
  const complication = alteree && complications ? tirerTable(complications, { de }) : null;
  partie.scene.prevue = prevue;
  partie.scene.etat = 'en-cours';
  partie.scene.soupape = soupape;
  partie.scene.alteration = { de: valeur, pression: partie.pression, alteree, type, complication };
  const res = { de: valeur, pression: partie.pression, soupape, alteree, type, complication, palier: palier(commun, partie.pression, univers) };
  // « alteration » (modifiée / interrompue) : rangé à part pour ne pas écraser le type de l'entrée.
  journaliser(partie, { ...res, type: 'scene-debut', alteration: type, prevue, palier: res.palier.id });
  return res;
}

/**
 * Calcule (sans rien changer) l'effet de la fin de scène sur la Pression.
 * issue : 'main' (le PJ avait la main : +1) | 'subi' (le PJ a subi : −1) | 'neutre'
 */
export function proposerFinScene(commun, partie, issue) {
  const avant = partie.pression;
  if (partie.scene.soupape) {
    return { avant, apres: commun.pression.soupape.retour, raison: 'soupape' };
  }
  if (partie.scene.pressionBougee) {
    return { avant, apres: avant, raison: 'deja-bougee' };
  }
  const delta = issue === 'main' ? 1 : issue === 'subi' ? -1 : 0;
  return { avant, apres: bornerPression(commun, avant + delta), raison: issue };
}

/** Termine la scène : applique la Pression proposée, note la scène dans la fiche, passe à la suivante. */
export function terminerScene(commun, partie, issue, { resume = '', univers = null } = {}) {
  const prop = proposerFinScene(commun, partie, issue);
  partie.pression = prop.apres;
  const evenements = verifierSeuils(commun, partie, univers);
  if (resume || partie.scene.prevue) {
    partie.fiche.scenes.push({ numero: partie.scene.numero, mission: partie.mission.numero, texte: resume || partie.scene.prevue });
  }
  journaliser(partie, { type: 'scene-fin', issue, ...prop, resume, evenements });
  partie.scene = nouvelleScene(partie.scene.numero + 1);
  return Object.assign({}, prop, { evenements });
}

// --- Omni-points (sections 6 et 8) --------------------------------------------------

function trouverPJ(partie, idPJ) {
  const pj = partie.pjs.find((p) => p.id === idPJ);
  if (!pj) throw new Error(`PJ inconnu : ${idPJ}`);
  return pj;
}

/** Compte une utilisation d'omni-point par un joueur ; toutes les 2, l'Oracle gagne 1 omni-point. */
function compterUtilisation(commun, partie) {
  partie.oracle.utilisationsJoueurs += 1;
  if (partie.oracle.utilisationsJoueurs % commun.omniPoints.gainOracleToutesLes === 0) {
    partie.oracle.omni += 1;
    return [{ type: 'gain-oracle', raison: 'utilisations' }];
  }
  return [];
}

/** Un PJ dépense un omni-point (avec sa réplique, facultative). */
export function depenserOmniPJ(commun, partie, idPJ, { replique = '', motif = '' } = {}) {
  const pj = trouverPJ(partie, idPJ);
  if (pj.omni <= 0) throw new Error(`${pj.nom} n'a plus d'omni-point.`);
  pj.omni -= 1;
  const evenements = compterUtilisation(commun, partie);
  journaliser(partie, { type: 'omni-pj', pj: pj.id, replique, motif, evenements });
  return { reste: pj.omni, evenements };
}

export const ACTIONS_ORACLE = {
  complication: 'Imposer une complication',
  relance: 'Relancer le jet d\'un ennemi ou d\'un PNJ',
  'oui-mais': 'Transformer « Oui » en « Oui, mais… »',
};

/**
 * L'Oracle dépense un omni-point pour une de ses trois actions.
 * Pour 'oui-mais', il faut fournir l'entrée du journal (réponse « Oui » simple).
 */
export function depenserOmniOracle(commun, partie, action, { entree = null, detail = '' } = {}) {
  if (!ACTIONS_ORACLE[action]) throw new Error(`Action inconnue : ${action}`);
  if (partie.oracle.omni <= 0) throw new Error('L\'Oracle n\'a pas d\'omni-point.');
  if (action === 'oui-mais') {
    if (!entree || entree.type !== 'oracle' || entree.reponse !== 'oui') {
      throw new Error('Seule une réponse « Oui » peut devenir « Oui, mais… ».');
    }
    const om = reponses(commun).find((r) => r.id === 'oui-mais');
    entree.historique = [...(entree.historique || []), { reponse: entree.reponse, libelle: entree.libelle, par: 'oracle' }];
    entree.reponse = om.id;
    entree.libelle = om.libelle;
    entree.complication = commun.oracle.complications[om.id] || null;
    entree.transformeeParOracle = true;
  }
  partie.oracle.omni -= 1;
  journaliser(partie, { type: 'omni-oracle', action, detail, cible: entree ? entree.n : null });
  return { reste: partie.oracle.omni };
}

// --- Questions à l'oracle, inscrites au journal, et contestation (duo) --------------

/** Pose une question et l'inscrit au journal. `joueur` = id du PJ qui la pose (duo), ou null. */
export function poserQuestion(commun, partie, { question = '', vraisemblance: v, joueur = null, des = null, de = deAleatoire } = {}) {
  const r = interrogerOracle(commun, { vraisemblance: v, des, de });
  return journaliser(partie, { type: 'oracle', question, joueur, ...r, contestee: false });
}

/**
 * Contestation (duo) : l'autre joueur dépense 1 omni-point pour relancer la
 * question. Le nouveau résultat remplace l'ancien et ne peut plus être contesté.
 * La dépense compte pour le gain d'omni-point de l'Oracle.
 */
export function contester(commun, partie, entree, idContestataire, { replique = '', des = null, de = deAleatoire, univers = null } = {}) {
  if (partie.mode !== 'duo') throw new Error('La contestation n\'existe qu\'en duo.');
  if (!optionsUnivers(univers).contestation) throw new Error('Pas de contestation dans cet univers : celui qui a posé la question tranche.');
  if (entree.type !== 'oracle') throw new Error('Seule une réponse de l\'oracle peut être contestée.');
  if (entree.contestee) throw new Error('Cette réponse a déjà été contestée : elle est définitive.');
  if (entree.joueur && entree.joueur === idContestataire) throw new Error('C\'est l\'autre joueur qui peut contester.');
  const pj = trouverPJ(partie, idContestataire);
  if (pj.omni <= 0) throw new Error(`${pj.nom} n'a plus d'omni-point.`);
  pj.omni -= 1;
  const evenements = compterUtilisation(commun, partie);
  const r = interrogerOracle(commun, { vraisemblance: entree.vraisemblance, des, de });
  entree.historique = [...(entree.historique || []), { reponse: entree.reponse, libelle: entree.libelle, jet: entree.jet, par: 'contestation' }];
  Object.assign(entree, r, { contestee: true, contestePar: pj.id, repliqueContestation: replique });
  journaliser(partie, { type: 'omni-pj', pj: pj.id, replique, motif: 'contestation', cible: entree.n, evenements });
  return { entree, evenements };
}

/**
 * « Option à tester » (horreur) : la première fois que la Pression atteint 9, si le
 * rebondissement (roles.rebondissement, T6) n'a pas encore été tiré, on le tire tout de suite.
 * Seulement si l'univers propose l'option ET si elle est cochée dans la partie.
 * Renvoie l'entrée du journal du tirage, ou null (option absente ou décochée, déjà tiré).
 */
export function rebondissementAuSeuil(catalogue, universId, partie, { de = deAleatoire } = {}) {
  const u = catalogue.univ(universId);
  if (!optionsUnivers(u).rebondissementAuSeuil || !partie.rebondissementAuSeuil) return null;
  const id = u.roles.rebondissement;
  partie.tirageMission ||= {};
  const etat = (partie.tirageMission[id] ||= { valeur: null, verrou: false });
  if (etat.valeur) return null;
  const table = catalogue.table(universId, id);
  const t = tirerTable(table, { de });
  const e = journaliser(partie, {
    type: 'tirage', table: table.id, titre: table.titre, valeur: t.valeur, plage: t.ligne.plage,
    texte: t.ligne.texte, autres: t.ligne.autres || null, cible: null, contexte: 'mission', manuel: false, auto: 'seuil-rupture',
  });
  etat.valeur = t.valeur;
  etat.n = e.n;
  return e;
}

// --- Chocs et folie (horreur : options.chocs) -----------------------------------------

function reglesChocs(univers) {
  const o = optionsUnivers(univers).chocs;
  if (!o) throw new Error('Cet univers n\'a pas de points de choc.');
  return o;
}

/**
 * Ajoute (ou retire, n < 0) des points de choc à un PJ. Renvoie le total et l'alerte
 * « 5 chocs = 1 point de folie » quand le seuil est atteint.
 */
export function ajouterChocs(univers, partie, idPJ, n, { motif = '' } = {}) {
  const o = reglesChocs(univers);
  const pj = trouverPJ(partie, idPJ);
  const avant = pj.chocs || 0;
  pj.chocs = Math.max(0, avant + n);
  if (pj.chocs !== avant) journaliser(partie, { type: 'choc', pj: idPJ, nb: pj.chocs - avant, total: pj.chocs, motif });
  return { avant, chocs: pj.chocs, alerte: pj.chocs >= o.seuil };
}

/** Corrige à la main les points de folie d'un PJ (sans jet). */
export function ajusterFolie(univers, partie, idPJ, n) {
  reglesChocs(univers);
  const pj = trouverPJ(partie, idPJ);
  const avant = pj.folie || 0;
  pj.folie = Math.max(0, avant + n);
  if (pj.folie !== avant) journaliser(partie, { type: 'folie-points', pj: idPJ, nb: pj.folie - avant, total: pj.folie });
  return pj.folie;
}

/** Intertitre d'une ligne de table (ex. « CHOC IMMÉDIAT — 1-7 · … » pour la folie), ou null. */
export function groupeDe(table, ligne) {
  let trouve = null;
  for (const g of table.groupes || []) {
    if (lirePlage(g.avant).min <= lirePlage(ligne.plage).min) trouve = g;
  }
  return trouve;
}

/**
 * Jet sur la table de folie. Option « la folie s'aggrave avec l'accumulation » :
 * 1d20 + le nombre total de points de folie du PJ ; au-delà de 20, résultats de
 * `aggravation` (21-22, 23+). Inscrit au journal (type « folie ») et renvoie l'entrée.
 */
export function tirerFolie(catalogue, universId, partie, idPJ, { aggravation = false, des = null, de = deAleatoire } = {}) {
  const o = reglesChocs(catalogue.univ(universId));
  const table = catalogue.table(universId, o.folie);
  const pj = trouverPJ(partie, idPJ);
  const valeur = des ?? de(20);
  if (!valeurD20Valide(valeur)) throw new Error('Un d20 donne un nombre entier de 1 à 20.');
  const bonus = aggravation ? (pj.folie || 0) : 0;
  const total = valeur + bonus;
  const res = { type: 'folie', pj: idPJ, table: table.id, titre: table.titre, de: valeur, bonus, total, aggravation };
  if (total <= 20) {
    const ligne = ligneParValeur(table, total);
    Object.assign(res, {
      plage: ligne.plage, nom: ligne.texte, texte: (ligne.autres || [])[0] || '',
      groupe: groupeDe(table, ligne)?.texte || null, chocAllie: ligne.chocAllie || 0,
    });
  } else {
    const a = table.aggravation.find((x) => total >= x.min && (x.max === null || total <= x.max));
    const [nom, ...reste] = a.texte.split(' : ');
    Object.assign(res, { plage: a.plage, nom: `**${nom}**`, texte: reste.join(' : '), groupe: null, chocAllie: 0 });
  }
  return journaliser(partie, res);
}

/**
 * 5 chocs = 1 point de folie + un jet sur la table de folie : retire les chocs, ajoute
 * le point de folie, puis lance le jet. Renvoie l'entrée du journal du jet.
 */
export function convertirFolie(catalogue, universId, partie, idPJ, options = {}) {
  const o = reglesChocs(catalogue.univ(universId));
  const pj = trouverPJ(partie, idPJ);
  if ((pj.chocs || 0) < o.seuil) throw new Error(`Il faut ${o.seuil} points de choc pour un point de folie.`);
  pj.chocs -= o.seuil;
  pj.folie = (pj.folie || 0) + 1;
  return Object.assign(tirerFolie(catalogue, universId, partie, idPJ, options), { conversion: true });
}

// --- Intentions des PNJ (section 5) et des vaisseaux ennemis (E) ---------------------

/**
 * Intention d'un PNJ ou d'un compagnon.
 * - blesse : le PNJ a perdu la moitié de ses PV ou plus (+4, sauf Fanatique)
 * - pression : Pression en cours (−2 si elle est de 7 ou plus)
 * Le total est ramené entre 1 et 20 avant de lire la colonne.
 */
export function intentionPNJ(commun, { profil, blesse = false, pression = 0, des = null, de = deAleatoire, table = null }) {
  const t = table || tableCommune(commun, 'intentions');
  const p = t.lignes.find((x) => x.id === profil);
  if (!p) throw new Error(`Profil inconnu : ${profil}`);
  const mods = [];
  if (blesse && !(t.modificateurs.blesseSaufProfils || []).includes(p.id)) mods.push({ id: 'blesse', valeur: t.modificateurs.blesse });
  if (pression >= t.modificateurs.pression.seuil) mods.push({ id: 'pression', valeur: t.modificateurs.pression.valeur });
  return lireIntention(t.plages, (i) => p.autres[i], mods, des, de, { profil: p.id, nom: p.nom });
}

/**
 * Tables de profils d'intention d'un univers : celle du tronc commun (Brute, Tacticien…,
 * compagnons), puis celles que l'univers ajoute (options.profils, ex. F4 en fantasy).
 */
export function tablesProfils(catalogue, universId) {
  const u = catalogue.univ(universId);
  return [tableCommune(catalogue.commun, 'intentions'), ...optionsUnivers(u).profils.map((id) => catalogue.table(universId, id))];
}

/** Profil d'intention et sa table, ou null (profil d'un autre univers, par exemple). */
export function trouverProfil(catalogue, universId, profilId) {
  for (const table of tablesProfils(catalogue, universId)) {
    const ligne = table.lignes.find((l) => l.id === profilId);
    if (ligne) return { table, ligne };
  }
  return null;
}

/** Intention d'un vaisseau ennemi (table E de l'univers). */
export function intentionVaisseau(tableE, { blesse = false, pression = 0, des = null, de = deAleatoire }) {
  const m = tableE.modificateurs;
  const mods = [];
  if (blesse) mods.push({ id: 'blesse', valeur: m.blesse });
  if (pression >= m.pression.seuil) mods.push({ id: 'pression', valeur: m.pression.valeur });
  return lireIntention(tableE.lignes.map((l) => l.plage), (i) => tableE.lignes[i].texte, mods, des, de, {});
}

function lireIntention(plages, action, mods, des, de, extra) {
  const valeur = des ?? de(20);
  if (!valeurD20Valide(valeur)) throw new Error('Un d20 donne un nombre entier de 1 à 20.');
  const modificateur = mods.reduce((s, m) => s + m.valeur, 0);
  const total = valeur + modificateur;
  const i = indiceParValeur(plages, total);
  return Object.assign({ de: valeur, modificateurs: mods, modificateur, total, lu: borner20(total), plage: plages[i], action: action(i) }, extra);
}

// --- Générateurs ------------------------------------------------------------------------

/**
 * Tire la mission (T1 à T6). `verrous` : { T1: tirage déjà gardé, … } ; les tables
 * verrouillées ne sont pas relancées.
 */
export function tirerMission(catalogue, universId, { verrous = {}, de = deAleatoire } = {}) {
  const u = catalogue.univ(universId);
  const res = {};
  for (const id of u.roles.mission) {
    res[id] = verrous[id] || tirerTable(catalogue.table(universId, id), { de });
  }
  return res;
}

/** Génère un PNJ : rôle, trait, motivation (N1, N2, N3). */
export function genererPNJ(catalogue, universId, { verrous = {}, de = deAleatoire } = {}) {
  const r = catalogue.univ(universId).roles.pnj;
  const res = {};
  for (const [cle, id] of Object.entries(r)) {
    res[cle] = verrous[cle] || tirerTable(catalogue.table(universId, id), { de });
  }
  return res;
}

/**
 * Rencontre (roles.rencontres de l'univers) : type puis attitude et état.
 * Space opéra (D1, D2) : chasseurs en escadrille de 1d4+1 ; croiseur ou vaisseau-mère :
 * escorte de chasseurs si un d20 supplémentaire donne 14 ou plus.
 * Fantasy (F1, F2) : une bande de brigands compte 1d4+1 membres (champ « groupe »).
 */
export function rencontreVaisseau(catalogue, universId, { de = deAleatoire, valeurType = null, valeurAttitude = null } = {}) {
  const u = catalogue.univ(universId);
  if (!u.roles.rencontres) throw new Error('Cet univers n\'a pas de table de rencontres.');
  const d1 = catalogue.table(universId, u.roles.rencontres.type);
  const d2 = catalogue.table(universId, u.roles.rencontres.attitude);
  const type = tirerTable(d1, { valeur: valeurType, de });
  const res = { type };
  if (type.ligne.escadrille) res.escadrille = lancerFormule(type.ligne.escadrille, de);
  if (type.ligne.groupe) res.groupe = lancerFormule(type.ligne.groupe, de);
  if (type.ligne.escorte) {
    const jet = de(20);
    const deploie = jet >= d1.escorte.seuil;
    res.escorte = { de: jet, seuil: d1.escorte.seuil, deploie, famille: type.ligne.famille || null };
    if (deploie) res.escorte.escadrille = lancerFormule(d1.escorte.escadrille, de);
  }
  res.attitude = tirerTable(d2, { valeur: valeurAttitude, de });
  res.vraisemblance = vraisemblancePourAttitude(catalogue.commun, res.attitude.ligne.attitude);
  return res;
}

/** Issue de la clôture de mission (« La mission est-elle un succès ? ») pour une réponse donnée. */
export function issueCloture(univers, reponseId) {
  return univers.cloture.issues.find((i) => i.reponses.includes(reponseId)) || null;
}

/**
 * Mission suivante : Pression de départ, omni-points des PJ rétablis, l'Oracle
 * perd ses omni-points restants, seuil de rupture et étau remis à zéro, scène 1.
 * La fiche de suivi et le journal sont conservés.
 */
export function missionSuivante(commun, univers, partie, { nom = '' } = {}) {
  partie.mission = { nom, numero: partie.mission.numero + 1 };
  partie.pression = commun.pression.depart;
  partie.seuilAtteint = false;
  partie.rebondissementSignale = false;
  partie.pjs.forEach((p) => { p.omni = univers.omniPointsPJ; });
  partie.oracle = { omni: commun.omniPoints.oracleDepart, utilisationsJoueurs: 0 };
  partie.tirageMission = {};
  partie.scene = nouvelleScene(1);
  journaliser(partie, { type: 'mission', nom });
  return partie;
}
