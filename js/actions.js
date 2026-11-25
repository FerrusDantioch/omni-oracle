// Actions de jeu partagées entre les vues : fenêtres de dépense d'omni-points,
// contestation, fin de scène, tirage de complication, saisie d'un vrai dé.
// Chaque action passe par le moteur (js/moteur.js), puis enregistre la partie.

import * as M from './moteur.js';
import { h, ouvrirDialogue, confirmer, champ, choix, annoncer, vibrer } from './ui.js';
import { texteBrut } from './texte.js';

// --- Saisie d'un vrai dé -------------------------------------------------------------

/**
 * Champs pour saisir le résultat d'un ou deux vrais d20.
 * Renvoie { el, lire() } ; lire() renvoie les valeurs, ou null si le dé virtuel
 * est utilisé, et lève une erreur claire si la saisie est incorrecte.
 */
export function saisieDes(ctx, nb = 1, etiquette = 'Ton d20') {
  if (!ctx.reglages.dePhysique) return { el: null, lire: () => null };
  const champs = Array.from({ length: nb }, (_, i) => champ(nb > 1 ? `${etiquette} n° ${i + 1}` : etiquette, {
    type: 'number', inputmode: 'numeric', min: 1, max: 20, step: 1, placeholder: '1-20',
  }));
  return {
    el: h('div', { class: 'saisie-des' }, champs),
    lire() {
      const vals = champs.map((c) => Number(c.saisie.value));
      if (!vals.every(M.valeurD20Valide)) {
        champs.find((c) => !M.valeurD20Valide(Number(c.saisie.value)))?.saisie.focus();
        throw new Error(nb > 1 ? 'Saisis les deux dés (chacun de 1 à 20).' : 'Saisis ton dé (de 1 à 20).');
      }
      champs.forEach((c) => { c.saisie.value = ''; });
      return vals;
    },
  };
}

/** Exécute une action qui peut échouer (saisie incorrecte, plus d'omni-point…) et affiche l'erreur. */
export function essayer(f) {
  try {
    return f();
  } catch (e) {
    annoncer(e.message);
    return undefined;
  }
}

// --- Événements (seuil de rupture, gain de l'Oracle, rebondissement) ---------------------

export function messageEvenement(ev, voc = { la: 'la mission', de: 'de la mission', cette: 'cette mission' }) {
  switch (ev.type) {
    case 'seuil-rupture': return ev.gain === 0
      ? `Seuil de rupture : la Pression atteint 9 pour la première fois ${voc.de}. Sans omni-points dans cet univers, il ne rapporte rien à l'Oracle.`
      : `Seuil de rupture : la Pression atteint 9 pour la première fois ${voc.de}. L'Oracle gagne 1 omni-point.`;
    case 'gain-oracle': return 'L\'Oracle gagne 1 omni-point (2 utilisations d\'omni-points par les joueurs).';
    case 'rebondissement': {
      // ev.etau : résultat de M.rebondissementEtau (tiré maintenant, déjà tiré, ou à lancer au vrai dé).
      const r = ev.etau;
      const debut = 'La Pression atteint 7 (Étau) :';
      if (r?.tire) return `${debut} le rebondissement ${voc.de} est tiré. ${r.titre} (d20 : ${r.tire.valeur}) : ${r.tire.texte}`;
      if (r?.deja) return `${debut} le rebondissement ${voc.de}, déjà tiré, entre en jeu. ${r.titre} (${r.deja.valeur}) : ${r.deja.texte}`;
      if (r?.aLancer) return `${debut} le rebondissement ${voc.de} est tiré. Lance ton d20 et choisis la ligne (${r.titre}) dans l'onglet ${voc.Nom}.`;
      return `${debut} le rebondissement ${voc.de} est tiré.`;
    }
    default: return '';
  }
}

// --- Omni-points des PJ ----------------------------------------------------------------------

export async function dialogueOmniPJ(ctx, idPJ) {
  const pj = ctx.partie.pjs.find((p) => p.id === idPJ);
  if (pj.omni <= 0) {
    await ouvrirDialogue({ titre: `${pj.nom} : omni-points`, contenu: h('p', {}, `${pj.nom} n'a plus d'omni-point pour ${ctx.voc.cette}.`) });
    return;
  }
  const replique = champ('Ta réplique (facultative)', { type: 'textarea', rows: 2, placeholder: '« … »' });
  const r = await ouvrirDialogue({
    titre: `Dépenser un omni-point : ${pj.nom}`,
    contenu: [
      h('p', {}, `${pj.nom} a ${pj.omni} omni-point${pj.omni > 1 ? 's' : ''}.`),
      h('p', {}, 'Dis ta réplique, puis raconte comment tu perturbes la narration.'),
      replique,
      M.optionsUnivers(ctx.univ).rappelOmni && h('p', { class: 'rappel-omni' }, h('strong', {}, 'Rappel : '), M.optionsUnivers(ctx.univ).rappelOmni),
      h('p', { class: 'petit discret' }, 'Toutes les 2 utilisations d\'omni-points par les joueurs, l\'Oracle en gagne 1.'),
    ],
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: 'Dépenser 1 omni-point', classe: 'bouton-accent' }],
  });
  if (r !== 'oui') return;
  const res = essayer(() => M.depenserOmniPJ(ctx.commun, ctx.partie, idPJ, { replique: replique.saisie.value.trim() }));
  if (!res) return;
  vibrer();
  ctx.enregistrer();
  annoncer(`${pj.nom} dépense un omni-point (reste ${res.reste}).`);
  ctx.signaler(res.evenements);
}

// --- Omni-points de l'Oracle -----------------------------------------------------------------

/** Dernière réponse « Oui » simple du journal (celle que l'Oracle peut transformer). */
export function dernierOui(partie) {
  for (let i = partie.journal.length - 1; i >= 0; i--) {
    const e = partie.journal[i];
    if (e.type === 'oracle') return e.reponse === 'oui' ? e : null;
  }
  return null;
}

export async function dialogueOmniOracle(ctx, { entree = null } = {}) {
  const p = ctx.partie;
  const cible = entree || dernierOui(p);
  if (p.oracle.omni <= 0) {
    await ouvrirDialogue({
      titre: 'Omni-points de l\'Oracle',
      contenu: [
        h('p', {}, 'L\'Oracle n\'a pas d\'omni-point pour l\'instant.'),
        h('p', { class: 'discret' }, `Il en gagne 1 toutes les 2 utilisations d'omni-points par les joueurs (déjà ${p.oracle.utilisationsJoueurs % 2} sur 2), et 1 la première fois que la Pression atteint 9 dans ${ctx.voc.la}.`),
      ],
    });
    return;
  }
  const options = Object.entries(M.ACTIONS_ORACLE).map(([valeur, texte]) => ({
    valeur,
    texte,
    detail: valeur === 'oui-mais' ? (cible ? `Dernière réponse : « Oui »${cible.question ? ` à « ${cible.question} »` : ''}` : 'Aucune réponse « Oui » à transformer') : '',
  }));
  const quoi = choix('Que fait l\'Oracle ?', 'action-oracle', options, entree ? 'oui-mais' : 'complication', { classe: 'choix-colonne' });
  const detail = champ('Détail (facultatif)', { type: 'text', placeholder: 'Ex. : le garde se relève' });
  const r = await ouvrirDialogue({
    titre: `L'Oracle dépense un omni-point (${p.oracle.omni})`,
    contenu: [quoi, detail],
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: 'Dépenser 1 omni-point', classe: 'bouton-accent' }],
    avantFermeture: (id, _dlg, afficherErreur) => {
      if (id === 'oui' && quoi.valeur() === 'oui-mais' && !cible) {
        afficherErreur('Il n\'y a pas de réponse « Oui » à transformer.');
        return false;
      }
      return true;
    },
  });
  if (r !== 'oui') return;
  const action = quoi.valeur();
  const res = essayer(() => M.depenserOmniOracle(ctx.commun, p, action, { entree: action === 'oui-mais' ? cible : null, detail: detail.saisie.value.trim() }));
  if (!res) return;
  vibrer();
  ctx.enregistrer();
  annoncer(action === 'oui-mais' ? 'L\'Oracle transforme « Oui » en « Oui, mais… ».' : `L'Oracle dépense un omni-point : ${M.ACTIONS_ORACLE[action].toLowerCase()}.`);
}

// --- Contestation (duo) ----------------------------------------------------------------------

/** Peut-on contester cette réponse ? Renvoie le PJ contestataire ou null. */
export function contestataire(partie, entree, univers = null) {
  if (!M.optionsUnivers(univers).contestation) return null; // ex. horreur : celui qui pose la question tranche
  if (partie.mode !== 'duo' || entree.type !== 'oracle' || entree.contestee) return null;
  return partie.pjs.find((pj) => pj.id !== entree.joueur) || null;
}

export async function dialogueContester(ctx, entree) {
  const p = ctx.partie;
  const pj = contestataire(p, entree, ctx.univ);
  if (!pj) return;
  if (pj.omni <= 0) { annoncer(`${pj.nom} n'a plus d'omni-point pour contester.`); return; }
  const v = M.vraisemblance(ctx.commun, entree.vraisemblance);
  const replique = champ('Ta réplique (facultative)', { type: 'textarea', rows: 2 });
  const des = saisieDes(ctx, v.jet.mode === 'normal' ? 1 : 2);
  let valeurs = null;
  const r = await ouvrirDialogue({
    titre: `Contester : ${pj.nom}`,
    contenu: [
      h('p', {}, `Réponse actuelle : « ${entree.libelle} »${entree.question ? ` à « ${entree.question} »` : ''}.`),
      h('p', {}, `${pj.nom} dépense 1 omni-point pour relancer la question (même vraisemblance : ${v.texte.toLowerCase()}). Le nouveau résultat remplace l'ancien et ne peut plus être contesté.`),
      replique,
      des.el,
    ],
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: 'Contester (1 omni-point)', classe: 'bouton-accent' }],
    avantFermeture: (id, _dlg, afficherErreur) => {
      if (id !== 'oui') return true;
      try { valeurs = des.lire(); return true; } catch (e) { afficherErreur(e.message); return false; }
    },
  });
  if (r !== 'oui') return;
  const res = essayer(() => M.contester(ctx.commun, p, entree, pj.id, { replique: replique.saisie.value.trim(), des: valeurs, univers: ctx.univ }));
  if (!res) return;
  vibrer();
  ctx.enregistrer();
  ctx.annoncerResultat(`Nouvelle réponse : ${res.entree.libelle}`);
  ctx.signaler(res.evenements);
}

// --- Transformation « Oui » → « Oui, mais… » ----------------------------------------------------

export async function transformerOuiMais(ctx, entree) {
  if (ctx.partie.oracle.omni <= 0) { annoncer('L\'Oracle n\'a pas d\'omni-point.'); return; }
  const ok = await confirmer('L\'Oracle intervient', 'L\'Oracle dépense 1 omni-point pour transformer ce « Oui » en « Oui, mais… ».', { oui: 'Transformer' });
  if (!ok) return;
  if (essayer(() => M.depenserOmniOracle(ctx.commun, ctx.partie, 'oui-mais', { entree }))) {
    ctx.enregistrer();
    annoncer('« Oui » devient « Oui, mais… ».');
  }
}

// --- Complications ------------------------------------------------------------------------------

/** Tire une ligne dans la table des complications de l'univers et l'inscrit au journal. */
export function tirerComplication(ctx, { cible = null, valeur = null } = {}) {
  const table = ctx.cat.table(ctx.univ.id, ctx.univ.roles.complications);
  return tirerEtNoter(ctx, table, { cible, valeur });
}

/**
 * Le MJ écarte une suggestion inscrite au journal : motif 'relance' (un nouveau
 * tirage la remplace) ou 'ignore'. L'entrée reste dans le journal, barrée.
 */
export function ecarter(ctx, n, motif) {
  const e = typeof n === 'object' ? n : ctx.partie.journal.find((x) => x.n === n);
  if (e && !e.ecarte) e.ecarte = motif;
  return e;
}

/** Tire une ligne dans n'importe quelle table et l'inscrit au journal. */
export function tirerEtNoter(ctx, table, { cible = null, valeur = null, contexte = '' } = {}) {
  const t = M.tirerTable(table, { valeur });
  if (valeur === null) vibrer();
  return M.journaliser(ctx.partie, {
    type: 'tirage', table: table.id, titre: table.titre, valeur: t.valeur, plage: t.ligne.plage,
    texte: t.ligne.texte, autres: t.ligne.autres || null, cible, contexte, manuel: valeur !== null,
  });
}

// --- Chocs et folie (univers avec options.chocs, ex. horreur) ------------------------------------

/**
 * Ajoute n points de choc à un PJ. À 5 (ou plus), alerte « 5 chocs = 1 point de folie »
 * avec la possibilité de convertir tout de suite.
 */
export async function donnerChocs(ctx, idPJ, n, { motif = '' } = {}) {
  const o = M.optionsUnivers(ctx.univ).chocs;
  const pj = ctx.partie.pjs.find((x) => x.id === idPJ);
  const r = M.ajouterChocs(ctx.univ, ctx.partie, idPJ, n, { motif });
  vibrer();
  ctx.enregistrer();
  annoncer(`${pj.nom} : ${r.chocs} point${r.chocs > 1 ? 's' : ''} de choc.`);
  if (n > 0 && r.alerte) {
    const des = saisieDes(ctx, 1, 'Ton d20 de folie');
    let valeurs = null;
    const choix = await ouvrirDialogue({
      titre: o.alerte,
      contenu: [
        h('p', {}, `${pj.nom} a ${r.chocs} points de choc. ${o.seuil} points de choc = 1 point de folie + un jet sur la table de folie.`),
        des.el,
      ],
      actions: [{ id: 'plus-tard', texte: 'Plus tard' }, { id: 'convertir', texte: `Convertir ${o.seuil} chocs en 1 point de folie`, classe: 'bouton-accent' }],
      avantFermeture: (id, _dlg, afficherErreur) => {
        if (id !== 'convertir') return true;
        try { valeurs = des.lire(); return true; } catch (e) { afficherErreur(e.message); return false; }
      },
    });
    if (choix === 'convertir') convertirEnFolie(ctx, idPJ, { des: valeurs?.[0] ?? null });
  }
}

/** Convertit 5 chocs en 1 point de folie, lance le jet de folie et montre le résultat dans la fiche. */
export function convertirEnFolie(ctx, idPJ, { des = null } = {}) {
  const p = ctx.partie;
  const e = essayer(() => M.convertirFolie(ctx.cat, ctx.univ.id, p, idPJ, { aggravation: !!p.folieAggravee, des }));
  if (!e) return null;
  const pj = p.pjs.find((x) => x.id === idPJ);
  pj.derniereFolie = e.n;
  vibrer(60);
  ctx.demandeFiche = 'chocs';
  ctx.enregistrer();
  ctx.annoncerResultat(`${pj.nom} gagne 1 point de folie : ${texteBrut(e.nom)}.`);
  ctx.aller('fiche');
  return e;
}

// --- Fin de scène ---------------------------------------------------------------------------------

export async function dialogueFinScene(ctx) {
  const p = ctx.partie;
  const C = ctx.commun;
  const resume = champ('Ce qui s\'est passé (journal de scènes, facultatif)', { type: 'textarea', rows: 2, valeur: p.scene.prevue });
  let contenu;
  let issue = 'neutre';
  if (p.scene.soupape) {
    contenu = [h('p', {}, `Soupape : la Pression redescend à ${C.pression.soupape.retour}, quelle que soit l'issue de la scène.`), resume];
  } else if (p.scene.pressionBougee) {
    contenu = [h('p', {}, `La Pression a déjà bougé pendant cette scène (elle est à ${p.pression}) : elle ne bouge qu'une fois par scène, elle reste donc à ${p.pression}.`), resume];
  } else {
    const fleche = (iss) => { const r = M.proposerFinScene(C, p, iss); return `Pression ${r.avant} → ${r.apres}`; };
    const q = choix('Comment s\'est passée la scène pour le PJ ?', 'issue-scene', [
      { valeur: 'main', texte: `Le PJ avait la main (+1)`, detail: `But atteint sans complication notable. ${fleche('main')}` },
      { valeur: 'subi', texte: `Le PJ a subi (−1)`, detail: `Échec critique, blessure de 3 PV ou plus, « Non, et… », complication majeure. ${fleche('subi')}` },
      { valeur: 'neutre', texte: 'Ni l\'un ni l\'autre', detail: fleche('neutre') },
    ], 'neutre', { classe: 'choix-colonne', onchange: (v) => { issue = v; } });
    contenu = [q, resume];
  }
  const r = await ouvrirDialogue({
    titre: `Fin de la scène ${p.scene.numero}`,
    contenu,
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: 'Terminer la scène', classe: 'bouton-accent' }],
  });
  if (r !== 'oui') return;
  const res = M.terminerScene(C, p, issue, { resume: resume.saisie.value.trim(), univers: ctx.univ });
  ctx.enregistrer();
  annoncer(`Scène suivante : n° ${p.scene.numero}. Pression ${res.avant} → ${res.apres}.`);
  ctx.signaler(res.evenements);
}

// --- Description d'un jet ------------------------------------------------------------------------

const signe = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);

/** « d20 avec avantage : 4 et 17 → 17 + 3 = 20 » */
export function decrireJet(jet) {
  let t = jet.mode === 'avantage' ? `d20 avec avantage : ${jet.des.join(' et ')} → ${jet.naturel}`
    : jet.mode === 'desavantage' ? `d20 avec désavantage : ${jet.des.join(' et ')} → ${jet.naturel}`
    : `d20 : ${jet.naturel}`;
  if (jet.modificateur) t += ` ${signe(jet.modificateur)} = ${jet.total}`;
  return t;
}
