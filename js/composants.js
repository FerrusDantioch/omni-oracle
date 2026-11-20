// Composants réutilisés par plusieurs onglets.

import * as M from './moteur.js';
import { h, riche } from './ui.js';
import { texteBrut } from './texte.js';

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
 */
export function tirageVerrouillable(ctx, { table, etat, cle, surTirage, surVerrou, niveau = 'h3' }) {
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
    ligne ? ctx.resultat(contenu) : contenu,
    h('div', { class: 'rangee' },
      h('button', {
        type: 'button', class: 'bouton', disabled: etat.verrou, 'data-cle': `${cle}-tirer`,
        onclick: () => surTirage(null, false),
      }, ligne ? 'Relancer' : 'Tirer'),
      h('button', {
        type: 'button', class: 'bouton', 'aria-pressed': etat.verrou ? 'true' : 'false', disabled: !ligne, 'data-cle': `${cle}-verrou`,
        onclick: () => { etat.verrou = !etat.verrou; surVerrou(); },
      }, etat.verrou ? 'Déverrouiller' : 'Verrouiller'),
      select));
}
