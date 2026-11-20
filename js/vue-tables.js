// Onglet « Tables » : consulter toutes les tables de l'univers, chercher un mot,
// tirer un d20 sur une table ou prendre une ligne précise.

import { h, remplacer, riche, animerResultat } from './ui.js';
import { texteBrut } from './texte.js';
import { autresColonnes } from './composants.js';
import { tirerEtNoter } from './actions.js';

/** Texte sans accents ni majuscules, pour une recherche tolérante (« evenement » trouve « événement »). */
const simplifier = (t) => texteBrut(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function creerVueTables(ctx) {
  const el = h('div', { class: 'vue-tables' });
  const ecran = { recherche: '', ouvertes: new Set(), derniers: {}, animer: null };

  function noter(table, valeur) {
    const e = tirerEtNoter(ctx, table, { valeur, contexte: 'tables' });
    ecran.derniers[table.id] = e.n;
    ecran.ouvertes.add(table.id);
    ecran.animer = table.id;
    ctx.enregistrer();
    ctx.annoncerResultat(`${table.titre} (${e.valeur}) : ${texteBrut(e.texte)}`);
  }

  function blocTable(table, motif) {
    const lignes = table.lignes.filter((l) => !motif || simplifier([l.plage, l.texte, ...(l.autres || [])].join(' ')).includes(motif));
    if (motif && !lignes.length && !simplifier(table.titre).includes(motif)) return null;
    const e = ctx.partie.journal.find((x) => x.n === ecran.derniers[table.id]);
    const ouverte = !!motif || ecran.ouvertes.has(table.id);
    const details = h('details', { class: 'carte table-consultation', open: ouverte, 'data-table': table.id },
      h('summary', {}, h('span', { class: 'table-titre' }, table.titre), ' ',
        h('span', { class: 'discret petit' }, motif ? `${lignes.length} ligne${lignes.length > 1 ? 's' : ''} trouvée${lignes.length > 1 ? 's' : ''}` : `${table.lignes.length} lignes`)),
      table.reference && h('p', { class: 'petit discret' }, `Reprend la table ${table.reference.table} de l'univers « ${ctx.cat.univ(table.reference.univers).nom} ».`),
      h('div', { class: 'rangee' }, h('button', {
        type: 'button', class: 'bouton bouton-accent', 'data-cle': `tables-${table.id}-tirer`,
        onclick: () => noter(table, null),
      }, 'Tirer un d20')));
    if (e) {
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
        h('p', { class: 'resultat-detail' }, e.manuel ? `Ligne choisie : ${e.plage}` : `d20 : ${e.valeur}`),
        h('p', {}, riche(e.texte)),
        e.autres && autresColonnes(table, { autres: e.autres }));
      if (ecran.animer === table.id) animerResultat(res);
      details.append(ctx.resultat(res));
    }
    const marquer = e && !ctx.reglages.secret; // en mode MJ, on ne montre pas quelle ligne est sortie
    details.append(h('ol', { class: 'lignes-table' }, lignes.map((l) => h('li', { class: marquer && e.plage === l.plage ? 'obtenue' : '' },
      h('span', { class: 'plage' }, l.plage),
      h('div', { class: 'ligne-texte' },
        h('p', {}, riche(l.texte), marquer && e.plage === l.plage && h('strong', {}, ' ◀ tiré')),
        autresColonnes(table, l)),
      h('button', {
        type: 'button', class: 'bouton bouton-discret petit', 'data-cle': `tables-${table.id}-${l.plage}`,
        'aria-label': `Prendre la ligne ${l.plage} de ${table.titre}`,
        onclick: () => noter(table, Number(String(l.plage).split('-')[0])),
      }, 'Prendre')))));
    details.addEventListener('toggle', () => {
      if (details.open) ecran.ouvertes.add(table.id); else ecran.ouvertes.delete(table.id);
    });
    return details;
  }

  function rendreListe(zone) {
    const motif = simplifier(ecran.recherche.trim());
    const tables = ctx.univ.tables.map((t) => ctx.cat.table(ctx.univ.id, t.id));
    const blocs = tables.map((t) => blocTable(t, motif)).filter(Boolean);
    remplacer(zone, blocs.length ? blocs : h('p', { class: 'carte discret' }, `Aucune ligne ne contient « ${ecran.recherche.trim()} ».`));
  }

  function rendre() {
    const zone = h('div', { class: 'liste-tables' });
    const recherche = h('input', {
      type: 'search', id: 'recherche-tables', value: ecran.recherche, 'data-cle': 'tables-recherche',
      placeholder: 'Ex. : drone, piège, psyker…', autocomplete: 'off',
      oninput: (e) => { ecran.recherche = e.target.value; rendreListe(zone); },
    });
    remplacer(el,
      h('div', { class: 'carte' },
        h('h2', {}, `Tables : ${ctx.univ.nom}`),
        h('div', { class: 'champ' }, h('label', { for: 'recherche-tables' }, 'Rechercher dans les tables'), recherche),
        h('p', { class: 'petit discret' }, 'Ouvre une table pour la lire. « Tirer un d20 » lance le dé ; « Prendre » choisit une ligne précise (par exemple le résultat de ton vrai dé). Tout est noté dans le journal.')),
      zone);
    rendreListe(zone);
    ecran.animer = null;
  }

  return { el, actualiser: rendre };
}
