// =============================================================================
// Livret imprimable : construit dans le navigateur à partir des MÊMES fichiers
// JSON que l'application (data/*.json). Aucun outil de build.
//
// Contenu : règles du tronc commun, puis tables de l'univers choisi (une table
// par bloc), puis la fiche de suivi à copier. Un nouvel univers (fichier JSON
// listé dans data/univers.json) apparaît automatiquement dans le sélecteur.
// =============================================================================

import { chargerDonnees } from './donnees.js';
import { rendreBloc, formaterEnLigne } from './texte.js';
import { optionsUnivers, vocabulaire } from './moteur.js';

const CONFIG = globalThis.CONFIG_APP;
const $ = (id) => document.getElementById(id);

/** Petit créateur d'éléments (le texte est toujours inséré comme texte). */
function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of enfants.flat(Infinity)) {
    if (c === false || c === null || c === undefined) continue;
    e.append(c instanceof Node ? c : String(c));
  }
  return e;
}

/** Une table de données → tableau HTML (en-têtes de la source, lignes dans l'ordre). */
function tableHTML(table, { titreVisible = false } = {}) {
  const premiereColonnePlage = table.de && table.type !== 'grille';
  const t = el('table', { class: `table-donnees table-${table.colonnes.length}-col${table.type === 'grille' ? ' grille' : ''}` },
    titreVisible && el('caption', {}, table.titre),
    el('thead', {}, el('tr', {}, table.colonnes.map((c) => el('th', { scope: 'col' }, formaterEnLigne(c))))),
    el('tbody', {}, table.lignes.map((l) => {
      const cellules = premiereColonnePlage ? [l.plage, l.texte, ...(l.autres || [])] : [l.texte, ...(l.autres || [])];
      // Intertitre placé avant cette ligne (ex. « CHOC IMMÉDIAT — 1-7 · … » dans la table de folie).
      const intertitres = (table.groupes || []).filter((g) => g.avant === l.plage).map((g) => el('tr', { class: 'intertitre' },
        el('th', { colspan: String(table.colonnes.length), scope: 'colgroup' }, formaterEnLigne(g.texte))));
      return [intertitres, el('tr', {}, cellules.map((c, i) => (i === 0
        ? el('th', { scope: 'row' }, formaterEnLigne(c))
        : el('td', {}, formaterEnLigne(c)))))];
    })));
  return el('div', { class: 'bloc-table' }, t);
}

/**
 * Une section de règles. Les sections qui ne contiennent qu'une table (T1, N2, D1…)
 * forment un seul bloc qui ne sera pas coupé entre deux pages.
 */
function section(doc, s, cat, niveauBase) {
  const rendreTable = (id) => {
    const t = cat.table(doc.id, id);
    const bloc = tableHTML(t);
    if (t.reference) {
      bloc.prepend(el('p', { class: 'renvoi' }, `(Table ${t.reference.table} ${cat.origine(t.reference)}, reproduite ici.)`));
    }
    return bloc;
  };
  // Section courte contenant une table (T1, D1, E…) : gardée d'un seul bloc à l'impression.
  const estTable = (l) => /^\{\{table .+\}\}$/.test(l);
  const seuleTable = s.texte.some(estTable) && s.texte.filter((l) => !estTable(l)).length <= 6;
  const titre = s.titre && el(`h${Math.min(6, niveauBase + s.niveau - 1)}`, {}, formaterEnLigne(s.titre));
  return el('section', { class: `section niveau-${s.niveau}${seuleTable ? ' bloc-insecable' : ''}`, 'data-section': s.id },
    titre, rendreBloc(s.texte, rendreTable));
}

/**
 * Fiche de suivi à copier (tronc commun, section 7), mise en forme pour être remplie à la main.
 * Elle suit les options de l'univers : mot « mission » (« quête », « mystère »), ligne des
 * omni-points seulement s'il y en a, rubriques en plus (ex. indices) et chocs et folie.
 */
function ficheDeSuivi(u) {
  const o = optionsUnivers(u);
  const voc = vocabulaire(u);
  const lignesVides = (n, colonnes) => el('tbody', {}, Array.from({ length: n }, () => el('tr', {}, colonnes.map(() => el('td', {}, ' ')))));
  const tableau = (titre, colonnes, n) => el('div', { class: 'fiche-bloc' },
    el('h3', {}, titre),
    el('table', { class: 'fiche-table' },
      el('thead', {}, el('tr', {}, colonnes.map((c) => el('th', { scope: 'col' }, c)))),
      lignesVides(n, colonnes)));
  const cases = (n) => el('span', { class: 'cases' }, Array.from({ length: n }, () => el('span', { class: 'case-vide' }, ' ')));
  const etiquette = (c) => (c.type === 'attitude' ? `${c.etiquette} (hostile / neutre / amical)` : c.etiquette);
  const chocs = o.chocs && el('div', { class: 'fiche-bloc' },
    el('h3', {}, `Chocs et folie (${o.chocs.alerte} + un jet sur la table de folie)`),
    el('table', { class: 'fiche-table fiche-chocs' },
      el('thead', {}, el('tr', {}, ['PJ', 'Points de choc', 'Points de folie', 'Séquelles en cours'].map((c) => el('th', { scope: 'col' }, c)))),
      el('tbody', {}, [1, 2, 3].map(() => el('tr', {}, el('td', {}, ' '), el('td', {}, cases(o.chocs.seuil)), el('td', {}, ' '), el('td', {}, ' '))))));
  return el('section', { class: 'fiche', 'aria-labelledby': 'titre-fiche' },
    el('h2', { id: 'titre-fiche' }, 'Fiche de suivi (à copier)'),
    el('div', { class: 'fiche-entete' },
      el('p', {}, `${voc.Nom} : `, el('span', { class: 'ligne-a-remplir longue' }, ' ')),
      el('p', {}, 'Scène n° : ', el('span', { class: 'ligne-a-remplir' }, ' '), '  Pression : ', el('span', { class: 'ligne-a-remplir' }, ' '), ' /10'),
      el('p', { class: 'pression-piste' }, 'Pression : ',
        Array.from({ length: 11 }, (_, i) => el('span', { class: 'case-pression' }, String(i)))),
      o.omniPoints && el('p', {}, 'Omni-points PJ : ', cases(u.omniPointsPJ), '  PJ 2 : ', cases(u.omniPointsPJ), '  Oracle : ', el('span', { class: 'ligne-a-remplir' }, ' ')),
      el('p', {}, 'Seuil de rupture (9) déjà atteint : ', el('span', { class: 'case-vide' }, ' '))),
    tableau('Fils ouverts (une ligne par intrigue en cours)', ['Intrigue'], 6),
    tableau('PNJ', ['Nom', 'Rôle', 'Attitude (hostile / neutre / amical)', 'Profil', 'Notes'], 8),
    tableau('Menaces', ['Qui', 'Quoi', 'Ce qui arrive si on ne fait rien'], 5),
    tableau('Lieux', ['Nom', 'Détail marquant'], 5),
    o.fiche.map((r) => tableau(r.aide ? `${r.titre} (${r.aide.replace(/\.$/, '').toLowerCase()})` : r.titre, r.champs.map(etiquette), 6)),
    chocs,
    tableau('Journal (une ligne par scène)', ['Scène', 'Ce qui s\'est passé'], 12));
}

function construire(cat, universId) {
  const C = cat.commun;
  const u = cat.univ(universId);
  const titre = `Oracle Omni-système — ${u.nom}`;
  document.title = `Livret ${u.nom} · ${CONFIG.nom}`;

  // En-tête de chaque page imprimée (nom de l'univers), si le navigateur le permet.
  try {
    const feuille = new CSSStyleSheet();
    feuille.replaceSync(`@page { @top-right { content: ${JSON.stringify(titre)}; } }`);
    document.adoptedStyleSheets = [feuille];
  } catch { /* navigateur ancien : pas d'en-tête de page, sans gravité */ }

  const presentation = C.sections.filter((s) => !s.titre);
  const regles = C.sections.filter((s) => s.titre);
  const presentationUnivers = u.sections.filter((s) => !s.titre);
  const contenuUnivers = u.sections.filter((s) => s.titre);

  const livret = $('livret');
  livret.replaceChildren(
    el('header', { class: 'couverture' },
      el('h1', {}, titre),
      el('div', { class: 'presentation' }, presentation.map((s) => rendreBloc(s.texte))),
      el('p', { class: 'mentions' }, `Règles et tables de l'Omni-système : © 2026 ${CONFIG.auteur}, tous droits réservés.`)),
    el('section', { class: 'partie', 'aria-labelledby': 'partie-commun' },
      el('h2', { id: 'partie-commun' }, `Partie 1 — ${C.nom}`),
      regles.map((s) => section(C, s, cat, 3))),
    el('section', { class: 'partie partie-univers', 'aria-labelledby': 'partie-univers' },
      el('h2', { id: 'partie-univers' }, `Partie 2 — ${u.nom}`),
      presentationUnivers.map((s) => el('div', { class: 'presentation' }, rendreBloc(s.texte))),
      contenuUnivers.map((s) => section(u, s, cat, 3))),
    ficheDeSuivi(u));
}

async function demarrer() {
  let cat;
  try {
    cat = await chargerDonnees();
  } catch (e) {
    $('livret').replaceChildren(el('p', {}, 'Impossible de charger les tables. Ouvre d\'abord l\'application une fois avec internet.'), el('p', {}, e.message));
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const demande = params.get('univers');
  const choix = $('choix-univers');
  for (const u of cat.univers) choix.append(el('option', { value: u.id }, u.nom));
  choix.value = cat.parId[demande] ? demande : cat.univers[0].id;
  choix.addEventListener('change', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('univers', choix.value);
    history.replaceState(null, '', url);
    construire(cat, choix.value);
  });
  $('bouton-imprimer').addEventListener('click', () => window.print());
  construire(cat, choix.value);
  document.body.dataset.pret = 'oui'; // repère pour les tests
}

demarrer();
