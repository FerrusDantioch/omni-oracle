// Onglet « Journal » : l'historique de la partie (jets, questions, scènes, omni-points…),
// du plus récent au plus ancien.

import * as M from './moteur.js';
import { h, remplacer, riche, heure, choix } from './ui.js';
import { decrireJet, contestataire, dialogueContester, transformerOuiMais } from './actions.js';

const ISSUES = { main: 'le PJ avait la main', subi: 'le PJ a subi', neutre: 'ni l\'un ni l\'autre', soupape: 'soupape', 'deja-bougee': 'déjà bougé pendant la scène' };

const FILTRES = [
  { valeur: 'tout', texte: 'Tout' },
  { valeur: 'oracle', texte: 'Oracle' },
  { valeur: 'jet', texte: 'Dés et tirages' },
  { valeur: 'scene', texte: 'Scènes' },
  { valeur: 'omni', texte: 'Omni-points' },
];
const CORRESPONDANCE = {
  oracle: ['oracle'],
  jet: ['jet', 'intention', 'intention-vaisseau', 'vaisseau', 'tirage'],
  scene: ['scene-debut', 'scene-fin', 'pression', 'mission'],
  omni: ['omni-pj', 'omni-oracle'],
};

/** Suggestion écartée par le MJ (« Relancer » ou « Ignorer ») : elle reste lisible, barrée. */
const ECARTS = { relance: 'relancé par le MJ', ignore: 'ignoré par le MJ' };

/** Description lisible d'une entrée du journal. */
export function decrireEntree(ctx, e) {
  const p = ctx.partie;
  const nomPJ = (id) => p.pjs.find((x) => x.id === id)?.nom || '?';
  switch (M.typeEntree(e)) {
    case 'jet':
      return [h('span', { class: 'journal-type' }, 'Jet : '), `${e.jet.total}`, e.raison && ` (${e.raison})`, h('br'),
        h('span', { class: 'petit discret' }, decrireJet(e.jet))];
    case 'oracle': {
      const v = M.vraisemblance(ctx.commun, e.vraisemblance);
      return [
        h('span', { class: 'journal-type' }, 'Oracle : '),
        h('strong', {}, e.libelle),
        e.question && ` à « ${e.question} »`,
        p.mode === 'duo' && e.joueur && ` (question de ${nomPJ(e.joueur)})`,
        h('br'),
        h('span', { class: 'petit discret' }, `${v.texte} · ${decrireJet(e.jet)}`),
        (e.historique || []).map((x) => [h('br'), h('span', { class: 'petit' },
          x.par === 'contestation' ? `Contestée par ${nomPJ(e.contestePar)} : ` : 'Transformée par l\'Oracle : ',
          h('span', { class: 'ancien' }, x.libelle), ` → ${e.libelle}`)]),
      ];
    }
    case 'scene-debut': {
      const parts = [h('span', { class: 'journal-type' }, `Début de la scène ${e.scene}`), e.prevue && ` : ${e.prevue}`, h('br')];
      if (!e.alteree) parts.push(h('span', { class: 'petit discret' }, `d20 = ${e.de}, Pression ${e.pression} : comme prévu.`));
      else {
        parts.push(h('span', { class: 'petit' }, `${e.soupape ? 'Soupape, ' : ''}d20 = ${e.de}, Pression ${e.pression} : scène ${M.alterationEntree(e) === 'modifiee' ? 'modifiée' : 'interrompue'}.`));
        for (const x of e.ecartees || []) {
          parts.push(h('br'), h('span', { class: 'ancien' }, riche(x.ligne.texte)), ` (${ECARTS[x.ecarte]})`);
        }
        if (e.complication) parts.push(h('br'), riche(e.complication.ligne.texte));
        else if (e.ecartees?.length) parts.push(h('br'), h('span', { class: 'petit discret' }, 'Complication ignorée par le MJ.'));
      }
      return parts;
    }
    case 'scene-fin':
      return [h('span', { class: 'journal-type' }, `Fin de la scène ${e.scene}`), ` : Pression ${e.avant} → ${e.apres} (${ISSUES[e.raison] || e.raison})`,
        e.resume && [h('br'), h('span', { class: 'petit' }, e.resume)]];
    case 'pression':
      return [h('span', { class: 'journal-type' }, 'Pression : '), `${e.avant} → ${e.apres}`, e.manuel && ' (à la main)'];
    case 'omni-pj':
      return [h('span', { class: 'journal-type' }, `${nomPJ(e.pj)} dépense un omni-point`), e.motif === 'contestation' && ' pour contester',
        e.replique && [' : ', h('em', {}, `« ${e.replique} »`)]];
    case 'omni-oracle':
      return [h('span', { class: 'journal-type' }, 'L\'Oracle dépense un omni-point : '), M.ACTIONS_ORACLE[e.action].toLowerCase(), e.detail && ` (${e.detail})`];
    case 'tirage':
      return [h('span', { class: 'journal-type' }, `${e.titre} (${e.valeur}) : `), riche(e.texte),
        e.autres && e.autres.length > 0 && [h('br'), h('span', { class: 'petit discret' }, e.autres.join(' · '))]];
    case 'intention': {
      const prof = M.trouverProfil(ctx.cat, ctx.univ.id, e.profil)?.ligne;
      return [h('span', { class: 'journal-type' }, `Intention${e.nom ? ` de ${e.nom}` : ''} (${prof ? prof.nom : e.profil}) : `), riche(e.action),
        e.relance && ' (relancé par l\'Oracle)', h('br'),
        h('span', { class: 'petit discret' }, `d20 : ${e.de}${e.modificateur ? `, total ${e.total}` : ''} → ${e.plage}`)];
    }
    case 'intention-vaisseau':
      return [h('span', { class: 'journal-type' }, 'Vaisseau ennemi : '), riche(e.action), e.relance && ' (relancé par l\'Oracle)', h('br'),
        h('span', { class: 'petit discret' }, `d20 : ${e.de}${e.modificateur ? `, total ${e.total}` : ''} → ${e.plage}`)];
    case 'vaisseau': {
      const r = e.rencontre;
      return [h('span', { class: 'journal-type' }, 'Rencontre de vaisseau : '), riche(r.type.ligne.texte),
        r.escadrille && ` (${r.escadrille.total} chasseurs)`,
        r.escorte && (r.escorte.deploie ? `, escorte de ${r.escorte.escadrille.total} chasseurs` : ', sans escorte'),
        h('br'), riche(r.attitude.ligne.texte)];
    }
    case 'mission':
      return [h('span', { class: 'journal-type' }, `Nouvelle mission (n° ${e.mission})`), e.nom && ` : ${e.nom}`];
    case 'note':
      return [h('span', { class: 'journal-type' }, 'Note : '), e.texte];
    default:
      return [h('span', { class: 'journal-type' }, e.titre || e.type), e.texte && ` : ${e.texte}`];
  }
}

export function creerVueJournal(ctx) {
  const el = h('div', { class: 'vue-journal' });
  let filtre = 'tout';

  function rendre() {
    const p = ctx.partie;
    const types = CORRESPONDANCE[filtre];
    const entrees = p.journal.filter((e) => !types || types.includes(M.typeEntree(e))).slice().reverse();
    const liste = h('ol', { class: 'journal', reversed: true });
    for (const e of entrees) {
      const actions = [];
      const pj = contestataire(p, e, ctx.univ);
      if (pj) {
        actions.push(h('button', { type: 'button', class: 'bouton', 'data-cle': `j-contester-${e.n}`, disabled: pj.omni <= 0, onclick: () => dialogueContester(ctx, e) },
          `Contester (${pj.nom})`));
      }
      if (e.type === 'oracle' && e.reponse === 'oui' && p.oracle.omni > 0) {
        actions.push(h('button', { type: 'button', class: 'bouton', 'data-cle': `j-ouimais-${e.n}`, onclick: () => transformerOuiMais(ctx, e) }, '« Oui, mais… » (Oracle)'));
      }
      liste.append(h('li', { class: e.ecarte ? 'ecarte' : null },
        h('div', { class: 'journal-meta' }, `Mission ${e.mission} · scène ${e.scene} · ${heure(e.quand)}`,
          e.ecarte && h('span', { class: 'etiquette' }, ECARTS[e.ecarte])),
        h('div', {}, ctx.resultat(h('span', { class: e.ecarte ? 'texte-ecarte' : null }, decrireEntree(ctx, e)), { cle: `j-${e.n}` })),
        actions.length > 0 && h('div', { class: 'rangee' }, actions)));
    }
    remplacer(el, h('section', { class: 'carte', 'aria-labelledby': 'titre-journal' },
      h('div', { class: 'carte-entete' },
        h('h2', { id: 'titre-journal' }, 'Journal'),
        h('span', { class: 'discret' }, `${p.journal.length} entrée${p.journal.length > 1 ? 's' : ''}`)),
      choix('Afficher', 'filtre-journal', FILTRES, filtre, { onchange: (v) => { filtre = v; rendre(); } }),
      entrees.length ? liste : h('p', { class: 'discret' }, 'Rien pour l\'instant. Les jets, les questions à l\'oracle et les scènes s\'inscriront ici.')));
  }

  return { el, actualiser: rendre };
}
