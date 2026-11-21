// Composants réutilisés par plusieurs onglets.

import * as M from './moteur.js';
import { h, riche, afficherAuxJoueurs } from './ui.js';
import { texteBrut } from './texte.js';
import { donnerChocs } from './actions.js';

/** Première valeur d'une plage (« 5-8 » → 5), pour choisir une ligne à la main. */
export function valeurDePlage(plage) {
  const r = M.lirePlage(plage);
  return Math.max(1, r.min);
}

/** Texte court pour une liste déroulante. */
function resume(texte, n = 70) {
  const t = texteBrut(texte);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/**
 * Boutons sous un résultat de table : le résultat est une suggestion, le MJ a le
 * dernier mot. Chaque bouton n'apparaît que si son action est fournie.
 * - relancer() : nouveau tirage (l'ancien reste barré dans le journal) ;
 * - ignorer() : écarter le résultat (il reste barré dans le journal) ;
 * - afficher : { titre, texte } pour « Afficher aux joueurs » (plein écran).
 */
export function actionsSuggestion({ cle, relancer = null, ignorer = null, afficher = null }) {
  return h('div', { class: 'rangee actions-suggestion' },
    relancer && h('button', { type: 'button', class: 'bouton', 'data-cle': `${cle}-relancer`, onclick: relancer }, 'Relancer'),
    ignorer && h('button', { type: 'button', class: 'bouton', 'data-cle': `${cle}-ignorer`, onclick: ignorer }, 'Ignorer'),
    afficher && h('button', { type: 'button', class: 'bouton', 'data-cle': `${cle}-afficher`, onclick: () => afficherAuxJoueurs(afficher) }, 'Afficher aux joueurs'));
}

/**
 * Boutons « +1 choc à Ada », « +2 chocs à Ada »… pour chaque PJ (univers avec chocs).
 * - nombres : ex. [1, 2] pour C1 (1 point de choc, 2 si l'événement est atroce)
 * - pour : liste d'id de PJ (par défaut tous)
 */
export function boutonsChocs(ctx, { cle, nombres = [1], pour = null, motif = '' }) {
  const pjs = ctx.partie.pjs.filter((pj) => !pour || pour.includes(pj.id));
  if (!pjs.length) return null;
  return h('div', { class: 'rangee boutons-chocs' }, pjs.flatMap((pj) => nombres.map((n) => h('button', {
    type: 'button', class: 'bouton', 'data-cle': `${cle}-choc-${pj.id}-${n}`,
    onclick: () => donnerChocs(ctx, pj.id, n, { motif }),
  }, `+${n} choc${n > 1 ? 's' : ''} à ${pj.nom}`))));
}

/** Colonnes supplémentaires d'une ligne (ex. statistiques d'un vaisseau), avec leur titre. */
export function autresColonnes(table, ligne) {
  if (!ligne.autres || !ligne.autres.length) return null;
  const titres = table.colonnes.slice(table.de && table.type !== 'grille' ? 2 : 1);
  return h('dl', { class: 'autres' }, ligne.autres.map((v, i) => [h('dt', {}, titres[i] || ''), h('dd', {}, riche(v))]));
}

/**
 * Une table que l'on peut tirer, verrouiller, ou dont on choisit la ligne à la main.
 * - etat : { valeur: nombre | null, verrou: booléen }  (modifié sur place)
 * - surTirage(valeur | null, manuel) : appelé quand la valeur change (null = relancer au hasard)
 * - surVerrou() : appelé quand on verrouille / déverrouille
 * - surIgnorer() : appelé quand le MJ écarte le résultat (« Ignorer »)
 * Un résultat verrouillé est gardé : ni « Relancer » ni « Ignorer » tant qu'il l'est.
 */
export function tirageVerrouillable(ctx, { table, etat, cle, surTirage, surVerrou, surIgnorer, niveau = 'h3' }) {
  const ligne = etat.valeur ? M.ligneParValeur(table, etat.valeur) : null;
  const idTitre = `titre-${cle}`;
  const select = h('select', {
    'aria-label': `Choisir à la main une ligne de ${table.titre}`, 'data-cle': `${cle}-choisir`,
    onchange: (e) => { if (e.target.value) surTirage(Number(e.target.value), true); },
  },
  h('option', { value: '' }, 'Choisir une ligne…'),
  table.lignes.map((l) => h('option', { value: valeurDePlage(l.plage), selected: ligne === l }, `${l.plage} — ${resume(l.texte)}`)));
  const contenu = ligne
    ? h('div', {}, h('p', { class: 'tirage-texte' }, riche(ligne.texte)), autresColonnes(table, ligne))
    : h('p', { class: 'discret' }, 'Pas encore tiré.');
  return h('section', { class: `tirage${etat.verrou ? ' verrouille' : ''}`, 'aria-labelledby': idTitre },
    h('div', { class: 'tirage-entete' },
      h(niveau, { id: idTitre }, table.titre),
      ligne && h('span', { class: 'plage' }, `d20 : ${etat.valeur}${ligne.plage !== String(etat.valeur) ? ` (${ligne.plage})` : ''}`),
      etat.verrou && h('span', { class: 'etiquette' }, 'Verrouillé')),
    ligne ? ctx.resultat(contenu, { cle: `${cle}-${etat.n ?? etat.valeur}` }) : contenu,
    ligne && actionsSuggestion({
      cle,
      relancer: !etat.verrou && (() => surTirage(null, false)),
      ignorer: !etat.verrou && surIgnorer,
      afficher: { titre: table.titre, texte: ligne.texte },
    }),
    h('div', { class: 'rangee' },
      !ligne && h('button', {
        type: 'button', class: 'bouton', 'data-cle': `${cle}-tirer`,
        onclick: () => surTirage(null, false),
      }, 'Tirer'),
      h('button', {
        type: 'button', class: 'bouton', 'aria-pressed': etat.verrou ? 'true' : 'false', disabled: !ligne, 'data-cle': `${cle}-verrou`,
        onclick: () => { etat.verrou = !etat.verrou; surVerrou(); },
      }, etat.verrou ? 'Déverrouiller' : 'Verrouiller'),
      select));
}
