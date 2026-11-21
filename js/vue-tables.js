// Onglet « Tables » : consulter toutes les tables de l'univers, chercher un mot,
// tirer un d20 sur une table ou prendre une ligne précise.

import { h, remplacer, riche, animerResultat, annoncer } from './ui.js';
import { texteBrut } from './texte.js';
import { autresColonnes } from './composants.js';
import { tirerEtNoter, ecarter } from './actions.js';
import { actionsSuggestion, boutonsChocs } from './composants.js';
import * as M from './moteur.js';

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

  /**
   * Ce que l'univers propose en plus après un tirage sur cette table :
   * - table des chocs (ex. C1) : rappel « 1 point de choc (2 si… atroce) » et boutons +1 / +2 ;
   * - table liée à une rubrique de la fiche (ex. I1 → indices) : « Noter dans … ».
   */
  function suites(table, e) {
    const o = M.optionsUnivers(ctx.univ);
    const rubrique = o.fiche.find((r) => r.table === table.id);
    return [
      o.chocs && o.chocs.table === table.id && [
        h('p', { class: 'petit rappel-choc' }, h('strong', {}, 'Rappel : '), o.chocs.rappel, '.'),
        boutonsChocs(ctx, { cle: `tables-${table.id}`, nombres: [1, 2], motif: table.titre }),
      ],
      rubrique && h('div', { class: 'rangee' }, h('button', {
        type: 'button', class: 'bouton', 'data-cle': `tables-${table.id}-noter`,
        onclick: () => {
          ctx.partie.fiche[rubrique.id] ||= [];
          ctx.partie.fiche[rubrique.id].push(Object.fromEntries(rubrique.champs.map((c, i) => [c.cle, i === 0 ? texteBrut(e.texte) : ''])));
          ctx.enregistrer();
          annoncer(`Noté dans « ${rubrique.titre} » (fiche de suivi).`);
        },
      }, `Noter dans « ${rubrique.titre} »`)),
    ];
  }

  /** Lignes de la table, avec leurs intertitres (ex. groupes de la table de folie). */
  function lignesAvecIntertitres(table, lignes, motif, ligneHTML) {
    const out = [];
    for (const l of lignes) {
      const g = !motif && (table.groupes || []).find((x) => x.avant === l.plage);
      if (g) out.push(h('li', { class: 'intertitre' }, riche(g.texte)));
      out.push(ligneHTML(l));
    }
    return out;
  }

  function blocTable(table, motif) {
    const lignes = table.lignes.filter((l) => !motif || simplifier([l.plage, l.texte, ...(l.autres || [])].join(' ')).includes(motif));
    if (motif && !lignes.length && !simplifier(table.titre).includes(motif)) return null;
    const e = ctx.partie.journal.find((x) => x.n === ecran.derniers[table.id]);
    const ouverte = !!motif || ecran.ouvertes.has(table.id);
    const details = h('details', { class: 'carte table-consultation', open: ouverte, 'data-table': table.id },
      h('summary', {}, h('span', { class: 'table-titre' }, table.titre), ' ',
        h('span', { class: 'discret petit' }, motif ? `${lignes.length} ligne${lignes.length > 1 ? 's' : ''} trouvée${lignes.length > 1 ? 's' : ''}` : `${table.lignes.length} lignes`)),
      table.reference && h('p', { class: 'petit discret' }, `Reprend la table ${table.reference.table} ${ctx.cat.origine(table.reference)}.`),
      h('div', { class: 'rangee' }, h('button', {
        type: 'button', class: 'bouton bouton-accent', 'data-cle': `tables-${table.id}-tirer`,
        onclick: () => noter(table, null),
      }, 'Tirer un d20')));
    if (e) {
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
        h('p', { class: 'resultat-detail' }, e.manuel ? `Ligne choisie : ${e.plage}` : `d20 : ${e.valeur}`),
        table.groupes && h('p', { class: 'petit' }, riche(M.groupeDe(table, { plage: e.plage })?.texte || '')),
        h('p', {}, riche(e.texte)),
        e.autres && autresColonnes(table, { autres: e.autres }));
      if (ecran.animer === table.id) animerResultat(res);
      details.append(ctx.resultat(res, { cle: `j-${e.n}` }), actionsSuggestion({
        cle: `tables-${table.id}`,
        relancer: () => { ecarter(ctx, e, 'relance'); noter(table, null); },
        ignorer: () => {
          ecarter(ctx, e, 'ignore');
          delete ecran.derniers[table.id];
          ctx.enregistrer();
          annoncer('Résultat ignoré.');
        },
        afficher: { titre: table.titre, texte: e.texte },
      }), ...suites(table, e).flat(Infinity).filter(Boolean));
    }
    // Résultat masqué (écran visible des joueurs) : on ne montre pas quelle ligne est sortie
    // tant qu'il n'a pas été révélé.
    const marquer = e && (!ctx.reglages.secret || ctx.reveles.has(`j-${e.n}`));
    details.append(h('ol', { class: 'lignes-table' }, lignesAvecIntertitres(table, lignes, motif, (l) => h('li', { class: marquer && e.plage === l.plage ? 'obtenue' : '' },
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
    // Tables à tirer au d20. Les grilles de profils (F4, M1) se jouent dans « Intentions » et
    // les paliers de Pression dans « Jouer » : elles n'ont pas de ligne à tirer ici.
    const tables = ctx.univ.tables.map((t) => ctx.cat.table(ctx.univ.id, t.id)).filter((t) => t.de === 'd20' && t.type !== 'grille');
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
