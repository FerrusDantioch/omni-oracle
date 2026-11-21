// Onglet « Jouer » : la scène en cours, l'oracle de question et le lanceur de dé.

import * as M from './moteur.js';
import { h, remplacer, riche, champ, choix, caseACocher, annoncer, vibrer, animerResultat } from './ui.js';
import { texteBrut } from './texte.js';
import {
  saisieDes, essayer, dialogueFinScene, tirerComplication, dialogueContester,
  transformerOuiMais, contestataire, decrireJet, ecarter,
} from './actions.js';
import { actionsSuggestion } from './composants.js';

const CONSEILS = {
  'oui-mais': 'Une complication mineure : tire dans la table Complications, ou invente-la.',
  'non-et': 'Une complication majeure : tire dans la même table, ou invente plus dur.',
  'non-mais': 'Le joueur invente l\'élément favorable.',
  'oui-et': 'Le joueur invente l\'élément favorable.',
};

export function creerVueJouer(ctx) {
  // État de l'écran (ce qui est en cours de saisie), gardé entre deux affichages.
  const ecran = {
    prevue: '',
    question: '',
    vraisemblance: ctx.commun.oracle.vraisemblanceParDefaut,
    joueur: ctx.partie.pjs[0].id,
    mode: 'normal',
    modificateur: 0,
    raison: '',
    dernierOracle: null, // n° de l'entrée du journal
    dernierJet: null,
    animer: null,        // quel résultat animer au prochain affichage
  };
  const el = h('div', { class: 'vue-jouer' });

  // --- Scène -----------------------------------------------------------------------
  /**
   * Le MJ relance ou ignore la complication de début de scène. Seule la complication
   * change : le d20 d'altération (la règle) reste tel quel. L'ancienne complication
   * est gardée, barrée, dans l'entrée « début de scène » du journal.
   */
  function changerComplication(motif) {
    const p = ctx.partie;
    const a = p.scene.alteration;
    const debut = [...p.journal].reverse().find((x) => M.typeEntree(x) === 'scene-debut' && x.scene === p.scene.numero && x.mission === p.mission.numero);
    if (a.complication) {
      const ancienne = { ...a.complication, ecarte: motif };
      a.ecartees = [...(a.ecartees || []), ancienne];
      if (debut) debut.ecartees = [...(debut.ecartees || []), ancienne];
    }
    a.complication = motif === 'relance' ? M.tirerTable(ctx.cat.table(ctx.univ.id, ctx.univ.roles.complications)) : null;
    a.complicationIgnoree = motif === 'ignore';
    if (debut) debut.complication = a.complication;
    ecran.animer = 'scene';
    if (motif === 'relance') vibrer();
    ctx.enregistrer();
    if (motif === 'relance') ctx.annoncerResultat(`Nouvelle complication : ${texteBrut(a.complication.ligne.texte)}`);
    else annoncer('Complication ignorée : invente l\'élément, ou relance.');
  }

  function carteScene() {
    const p = ctx.partie;
    const C = ctx.commun;
    const pal = M.palier(C, p.pression);
    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-scene' },
      h('div', { class: 'carte-entete' },
        h('h2', { id: 'titre-scene' }, `Scène ${p.scene.numero}`),
        h('span', { class: 'discret' }, `Pression ${p.pression} · ${pal.nom} · ${pal.chance} % d'altération`)),
      h('details', { class: 'petit' },
        h('summary', {}, `Ce que ça implique (${pal.nom})`),
        h('p', {}, pal.autres[1]),
        p.pression >= C.pression.etau && h('p', {}, 'Les ennemis ont −2 à leur jet d\'intention.')));

    if (p.scene.etat !== 'en-cours') {
      if (p.pression >= C.pression.soupape.niveau) {
        carte.append(h('p', { class: 'complication' }, h('strong', {}, 'Soupape : '),
          `la Pression est à ${C.pression.soupape.niveau}. Cette scène est automatiquement altérée : le d20 dit si elle est modifiée (pair) ou interrompue (impair). À la fin de la scène, la Pression redescend à ${C.pression.soupape.retour}.`));
      }
      const prevue = champ('Scène prévue (une phrase)', {
        type: 'text', valeur: ecran.prevue, 'data-cle': 'scene-prevue',
        placeholder: 'Ex. : je retrouve mon contact au marché de nuit',
      });
      prevue.saisie.addEventListener('input', (e) => { ecran.prevue = e.target.value; });
      const des = saisieDes(ctx, 1, 'Ton d20 de scène');
      carte.append(prevue, des.el, h('div', { class: 'rangee' },
        h('button', {
          type: 'button', class: 'bouton bouton-accent', 'data-cle': 'scene-lancer',
          onclick: () => essayer(() => {
            const valeurs = des.lire();
            M.debuterScene(C, p, {
              prevue: ecran.prevue.trim(),
              complications: ctx.cat.table(ctx.univ.id, ctx.univ.roles.complications),
              des: valeurs ? valeurs[0] : null,
            });
            ecran.prevue = '';
            ecran.animer = 'scene';
            vibrer();
            ctx.enregistrer();
            const a = p.scene.alteration;
            ctx.annoncerResultat(a.alteree ? `Scène ${a.type === 'modifiee' ? 'modifiée' : 'interrompue'}.` : 'La scène se joue comme prévu.');
          }),
        }, 'Lancer le d20 de scène'),
        h('button', { type: 'button', class: 'bouton', 'data-cle': 'scene-terminer', onclick: () => dialogueFinScene(ctx) }, 'Terminer la scène')));
      return carte;
    }

    const a = p.scene.alteration;
    if (p.scene.prevue) carte.append(h('p', {}, h('strong', {}, 'Prévue : '), p.scene.prevue));
    const res = h('div', { class: 'resultat', 'aria-live': 'polite' });
    if (!a.alteree) {
      res.append(h('p', { class: 'resultat-titre' }, 'Comme prévu'),
        h('p', { class: 'resultat-detail' }, `d20 = ${a.de}, plus grand que la Pression (${a.pression}) : la scène se joue comme prévu.`));
    } else {
      const parite = a.de % 2 === 0 ? 'pair' : 'impair';
      res.append(
        h('p', { class: 'resultat-titre' }, a.type === 'modifiee' ? 'Scène modifiée' : 'Scène interrompue'),
        h('p', { class: 'resultat-detail' }, p.scene.soupape
          ? `Soupape (Pression ${a.pression}) : scène automatiquement altérée. d20 = ${a.de} (${parite}).`
          : `d20 = ${a.de} (${parite}), inférieur ou égal à la Pression (${a.pression}).`),
        h('p', {}, a.type === 'modifiee'
          ? 'Ajoute cet élément à ta scène prévue :'
          : 'C\'est cet événement qui se joue à la place :'),
        a.complication && h('div', { class: 'complication' }, h('strong', {}, `${a.complication.titre} (${a.complication.valeur}) : `), riche(a.complication.ligne.texte)),
        !a.complication && a.complicationIgnoree && h('p', { class: 'complication' }, 'Complication ignorée par le MJ : invente l\'élément, ou relance.'),
        h('p', { class: 'petit discret' }, `Adapte la gravité de la complication au palier de Pression (${M.palier(ctx.commun, a.pression).nom}).`));
    }
    if (ecran.animer === 'scene') animerResultat(res);
    const cleScene = `scene-${p.mission.numero}-${p.scene.numero}-${(a.ecartees || []).length}`;
    carte.append(ctx.resultat(res, { cle: cleScene }),
      a.alteree && actionsSuggestion({
        cle: 'scene-complication',
        relancer: () => changerComplication('relance'),
        ignorer: a.complication && (() => changerComplication('ignore')),
        afficher: a.complication && { titre: a.complication.titre, texte: a.complication.ligne.texte },
      }),
      h('div', { class: 'rangee' },
      h('button', { type: 'button', class: 'bouton bouton-accent', 'data-cle': 'scene-terminer', onclick: () => dialogueFinScene(ctx) }, 'Terminer la scène')));
    return carte;
  }

  // --- Oracle de question -------------------------------------------------------------
  function carteOracle() {
    const p = ctx.partie;
    const C = ctx.commun;
    const question = champ('Ta question (oui ou non, facultative)', {
      type: 'text', valeur: ecran.question, 'data-cle': 'oracle-question', placeholder: 'Ex. : le garde est-il seul ?',
    });
    question.saisie.addEventListener('input', (e) => { ecran.question = e.target.value; });
    const vrais = choix('Vraisemblance', 'vraisemblance',
      M.vraisemblances(C).map((v) => ({ valeur: v.id, texte: v.texte, detail: v.autres[0] })),
      ecran.vraisemblance,
      { onchange: (v) => { ecran.vraisemblance = v; rendre(); } });
    const v = M.vraisemblance(C, ecran.vraisemblance);
    const des = saisieDes(ctx, v.jet.mode === 'normal' ? 1 : 2);
    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-oracle' },
      h('h2', { id: 'titre-oracle' }, 'Oracle de question'),
      question, vrais,
      p.mode === 'duo' && choix('Qui pose la question ?', 'joueur',
        p.pjs.map((pj) => ({ valeur: pj.id, texte: pj.nom })), ecran.joueur,
        { onchange: (j) => { ecran.joueur = j; } }),
      des.el,
      h('div', { class: 'rangee' }, h('button', {
        type: 'button', class: 'bouton bouton-accent bouton-large', 'data-cle': 'oracle-interroger',
        onclick: () => essayer(() => {
          const e = M.poserQuestion(C, p, {
            question: ecran.question.trim(),
            vraisemblance: ecran.vraisemblance,
            joueur: p.mode === 'duo' ? ecran.joueur : null,
            des: des.lire(),
          });
          ecran.dernierOracle = e.n;
          ecran.question = '';
          ecran.animer = 'oracle';
          vibrer();
          ctx.enregistrer();
          ctx.annoncerResultat(`L'oracle répond : ${e.libelle}`);
        }),
      }, 'Interroger l\'oracle')));
    const e = p.journal.find((x) => x.n === ecran.dernierOracle);
    if (e) carte.append(...resultatOracle(e).flat(Infinity).filter(Boolean));
    return carte;
  }

  function resultatOracle(e) {
    const p = ctx.partie;
    const C = ctx.commun;
    const rep = M.reponses(C).find((r) => r.id === e.reponse);
    const nomPJ = (id) => p.pjs.find((x) => x.id === id)?.nom || '';
    const v = M.vraisemblance(C, e.vraisemblance);
    const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
      e.question && h('p', { class: 'discret' }, `« ${e.question} »`),
      h('p', { class: 'resultat-titre' }, e.libelle),
      h('p', { class: 'resultat-detail' }, texteBrut(rep.texte).replace(e.libelle, '').trim()),
      h('p', { class: 'resultat-detail' }, `${v.texte} · ${decrireJet(e.jet)}`,
        e.naturel && ` · ${e.jet.naturel} naturel : toujours « ${e.libelle} »`),
      e.transformeeParOracle && h('p', { class: 'petit' }, 'L\'Oracle a transformé « Oui » en « Oui, mais… ».'),
      (e.historique || []).filter((x) => x.par === 'contestation').map((x) => h('p', { class: 'petit' },
        `Contestée par ${nomPJ(e.contestePar)} : l'ancienne réponse « ${x.libelle} » est remplacée (définitif).`)),
      p.mode === 'duo' && e.joueur && h('p', { class: 'petit' }, `Question de ${nomPJ(e.joueur)} : c'est à ${nomPJ(e.joueur)} d'interpréter.`),
      CONSEILS[e.reponse] && h('p', {}, CONSEILS[e.reponse]));

    const boutons = h('div', { class: 'rangee' });
    if (e.complication) {
      boutons.append(h('button', {
        type: 'button', class: 'bouton', 'data-cle': 'oracle-complication',
        onclick: () => { tirerComplication(ctx, { cible: e.n }); ecran.animer = 'oracle'; ctx.enregistrer(); },
      }, `Tirer une complication (${e.complication})`));
    }
    const pj = contestataire(p, e);
    if (pj) {
      boutons.append(h('button', {
        type: 'button', class: 'bouton', 'data-cle': 'oracle-contester', disabled: pj.omni <= 0,
        onclick: () => { ecran.animer = 'oracle'; dialogueContester(ctx, e); },
      }, `Contester (${pj.nom}, 1 omni-point)`));
    }
    if (e.reponse === 'oui' && p.oracle.omni > 0) {
      boutons.append(h('button', {
        type: 'button', class: 'bouton', 'data-cle': 'oracle-ouimais',
        onclick: () => transformerOuiMais(ctx, e),
      }, 'L\'Oracle en fait « Oui, mais… » (1 omni-point)'));
    }
    if (boutons.childElementCount) res.append(boutons);
    if (ecran.animer === 'oracle') animerResultat(res);
    // Complications tirées pour cette réponse : chacune est une suggestion du MJ.
    const complications = p.journal.filter((x) => x.type === 'tirage' && x.cible === e.n && !x.ecarte).map((t) => [
      ctx.resultat(h('div', { class: 'complication' }, h('strong', {}, `Complication (${t.valeur}) : `), riche(t.texte)), { cle: `j-${t.n}` }),
      actionsSuggestion({
        cle: `oracle-complication-${t.n}`,
        relancer: () => { ecarter(ctx, t, 'relance'); tirerComplication(ctx, { cible: e.n }); vibrer(); ecran.animer = 'oracle'; ctx.enregistrer(); },
        ignorer: () => { ecarter(ctx, t, 'ignore'); ctx.enregistrer(); annoncer('Complication ignorée.'); },
        afficher: { titre: t.titre, texte: t.texte },
      }),
    ]);
    return [ctx.resultat(res, { cle: `j-${e.n}` }), complications];
  }

  // --- Lanceur de dé ----------------------------------------------------------------------
  function carteDe() {
    const modes = choix('Type de jet', 'mode-de', [
      { valeur: 'normal', texte: 'Normal' },
      { valeur: 'avantage', texte: 'Avantage', detail: '2 dés, le meilleur' },
      { valeur: 'desavantage', texte: 'Désavantage', detail: '2 dés, le pire' },
    ], ecran.mode, { onchange: (m) => { ecran.mode = m; rendre(); } });
    const mod = h('input', {
      type: 'number', id: 'modificateur', inputmode: 'numeric', step: 1, value: ecran.modificateur, 'data-cle': 'de-mod',
      oninput: (e) => { ecran.modificateur = Number.parseInt(e.target.value, 10) || 0; },
    });
    const changerMod = (d) => { ecran.modificateur += d; mod.value = ecran.modificateur; };
    const raison = champ('Pour quoi ? (facultatif)', { type: 'text', valeur: ecran.raison, 'data-cle': 'de-raison', placeholder: 'Ex. : piratage du terminal' });
    raison.saisie.addEventListener('input', (e) => { ecran.raison = e.target.value; });
    const des = saisieDes(ctx, ecran.mode === 'normal' ? 1 : 2);
    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-de' },
      h('h2', { id: 'titre-de' }, 'Lancer de dé'),
      modes,
      h('div', { class: 'champ' },
        h('label', { for: 'modificateur' }, 'Modificateur'),
        h('div', { class: 'compteur' },
          h('button', { type: 'button', class: 'bouton', 'aria-label': 'Modificateur moins 1', 'data-cle': 'de-mod-moins', onclick: () => changerMod(-1) }, '−'),
          mod,
          h('button', { type: 'button', class: 'bouton', 'aria-label': 'Modificateur plus 1', 'data-cle': 'de-mod-plus', onclick: () => changerMod(+1) }, '+'))),
      raison,
      des.el,
      h('div', { class: 'rangee' }, h('button', {
        type: 'button', class: 'bouton bouton-accent bouton-large', 'data-cle': 'de-lancer',
        onclick: () => essayer(() => {
          const jet = M.lancerD20({ mode: ecran.mode, modificateur: ecran.modificateur, des: des.lire() });
          const e = M.journaliser(ctx.partie, { type: 'jet', jet, raison: ecran.raison.trim() });
          ecran.dernierJet = e.n;
          ecran.animer = 'de';
          vibrer();
          ctx.enregistrer();
          ctx.annoncerResultat(`Résultat : ${jet.total}`);
        }),
      }, 'Lancer le d20')));
    const e = ctx.partie.journal.find((x) => x.n === ecran.dernierJet);
    if (e) {
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
        e.raison && h('p', { class: 'discret' }, e.raison),
        h('p', { class: 'resultat-titre' }, String(e.jet.total)),
        h('p', { class: 'resultat-detail' }, decrireJet(e.jet),
          e.jet.naturel === 20 && ' · 20 naturel', e.jet.naturel === 1 && ' · 1 naturel'));
      if (ecran.animer === 'de') animerResultat(res);
      carte.append(ctx.resultat(res, { cle: `j-${e.n}` }));
    }
    return carte;
  }

  function rendre() {
    // Question préparée par un autre onglet (réaction d'un PNJ ou d'un vaisseau).
    const demande = ctx.demandeOracle;
    if (demande) {
      ctx.demandeOracle = null;
      ecran.question = demande.question || '';
      ecran.vraisemblance = demande.vraisemblance || ecran.vraisemblance;
    }
    remplacer(el,
      h('div', { class: 'rangee option-de' }, caseACocher('J\'utilise mon vrai dé (je saisis le résultat)', {
        coche: ctx.reglages.dePhysique, 'data-cle': 'de-physique',
        onchange: (v) => { ctx.reglages.dePhysique = v; ctx.sauverReglages(); rendre(); },
      })),
      h('div', { class: 'grille' }, carteScene(), carteOracle(), carteDe()));
    ecran.animer = null;
    if (demande) {
      requestAnimationFrame(() => {
        const q = el.querySelector('[data-cle="oracle-question"]');
        q?.scrollIntoView({ block: 'center' });
        q?.focus({ preventScroll: true });
      });
      annoncer('Oracle prêt : vraisemblance choisie d\'après l\'attitude.');
    }
  }

  return { el, actualiser: rendre };
}
