// =============================================================================
// Fabrique guide.html à partir de sources/08-guide-utilisation.md.
//
// Lancement (après avoir remplacé le fichier Markdown) :   npm run guide
//
// Ce n'est PAS une étape de build du site : guide.html est un fichier ordinaire,
// enregistré dans le dépôt et servi tel quel. Ce script ne sert qu'à le refaire
// quand le texte du guide change, sans recopie à la main (donc sans faute de
// recopie). Le test tests/guide.test.mjs vérifie que guide.html est à jour et
// fidèle mot pour mot au Markdown.
//
// Le Markdown reconnu est celui qu'utilise le guide : titres # ## ###, paragraphes,
// **gras**, *italique*, `code`, listes à puces, listes numérotées (avec sous-listes
// indentées), tableaux, liens [texte](adresse) et caractères échappés (\[).
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = 'sources/08-guide-utilisation.md';
export const PAGE = 'guide.html';

// --- Petits outils ------------------------------------------------------------------

const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ancre d'un titre : minuscules, sans accents, mots reliés par des tirets. */
function ancre(texte, dejaPrises) {
  const base = texte
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
  let id = base;
  for (let i = 2; dejaPrises.has(id); i++) id = `${base}-${i}`;
  dejaPrises.add(id);
  return id;
}

/** Mise en forme dans une ligne : échappements, `code`, liens, **gras**, *italique*. */
function enLigne(texte) {
  const reserve = [];
  const garder = (html) => `\u0000${reserve.push(html) - 1}\u0000`;
  let s = texte
    .replace(/\\([\\`*_[\]()#+\-.!|])/g, (_, c) => garder(echapper(c)))
    .replace(/`([^`]+)`/g, (_, c) => garder(`<code>${echapper(c)}</code>`));
  s = echapper(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => {
      const externe = /^https?:\/\//.test(url);
      return garder(`<a href="${url}"${externe ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`);
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Les morceaux gardés de côté peuvent en contenir d'autres (lien avec texte échappé).
  for (let i = 0; i < 3 && s.includes('\u0000'); i++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => reserve[n]);
  return s;
}

/** Texte brut d'une ligne Markdown (pour les ancres et les étiquettes). */
const texteBrut = (s) => enLigne(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

const cellules = (ligne) => ligne.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// --- Lecture des blocs -----------------------------------------------------------------

const RE_LISTE = /^( *)([-*]|\d+\.) +(.*)$/;

/** Découpe le Markdown en blocs : titre, paragraphe, liste, tableau. */
function lireBlocs(markdown) {
  const lignes = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocs = [];
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) { i++; continue; }
    const titre = l.match(/^(#{1,6}) +(.*?) *#*$/);
    if (titre) { blocs.push({ type: 'titre', niveau: titre[1].length, texte: titre[2] }); i++; continue; }
    if (/^\s*\|/.test(l)) {
      const t = [];
      while (i < lignes.length && /^\s*\|/.test(lignes[i])) t.push(lignes[i++]);
      const [entete, separateur, ...corps] = t;
      if (!separateur || !/^\s*\|?\s*:?-{3,}/.test(separateur)) throw new Error(`Tableau mal formé : ${entete}`);
      blocs.push({ type: 'tableau', entete: cellules(entete), lignes: corps.map(cellules) });
      continue;
    }
    if (RE_LISTE.test(l)) {
      const items = [];
      while (i < lignes.length && lignes[i].trim()) {
        const m = lignes[i].match(RE_LISTE);
        if (m) items.push({ retrait: m[1].length, ordonnee: /\d/.test(m[2]), numero: parseInt(m[2], 10), texte: m[3] });
        else if (items.length) items[items.length - 1].texte += ` ${lignes[i].trim()}`; // suite de la ligne
        i++;
      }
      blocs.push({ type: 'liste', items });
      continue;
    }
    const p = [];
    while (i < lignes.length && lignes[i].trim() && !/^(#{1,6} |\s*\|)/.test(lignes[i]) && !RE_LISTE.test(lignes[i])) p.push(lignes[i++].trim());
    blocs.push({ type: 'paragraphe', texte: p.join(' ') });
  }
  return blocs;
}

// --- Écriture du HTML -------------------------------------------------------------------

/** Liste (avec sous-listes) : les éléments plus en retrait appartiennent au précédent. */
function listeHTML(items, marge) {
  const retrait = items[0].retrait;
  const balise = items[0].ordonnee ? 'ol' : 'ul';
  const debut = items[0].ordonnee && items[0].numero !== 1 ? ` start="${items[0].numero}"` : '';
  let html = `${marge}<${balise}${debut}>\n`;
  for (let i = 0; i < items.length;) {
    const it = items[i++];
    const enfants = [];
    while (i < items.length && items[i].retrait > retrait) enfants.push(items[i++]);
    html += enfants.length
      ? `${marge}  <li>${enLigne(it.texte)}\n${listeHTML(enfants, `${marge}    `)}${marge}  </li>\n`
      : `${marge}  <li>${enLigne(it.texte)}</li>\n`;
  }
  return `${html}${marge}</${balise}>\n`;
}

function tableauHTML(t, etiquette, marge) {
  const m = marge;
  return `${m}<div class="bloc-table" role="region" tabindex="0" aria-labelledby="${etiquette}">\n`
    + `${m}  <table>\n`
    + `${m}    <thead>\n${m}      <tr>${t.entete.map((c) => `<th scope="col">${enLigne(c)}</th>`).join('')}</tr>\n${m}    </thead>\n`
    + `${m}    <tbody>\n`
    + t.lignes.map(([premiere, ...autres]) => `${m}      <tr><th scope="row">${enLigne(premiere)}</th>${autres.map((c) => `<td>${enLigne(c)}</td>`).join('')}</tr>\n`).join('')
    + `${m}    </tbody>\n${m}  </table>\n${m}</div>\n`;
}

/** Transforme le Markdown du guide en page HTML complète. */
export function genererGuide(markdown) {
  const blocs = lireBlocs(markdown);
  const ids = new Set(['contenu', 'sommaire']);
  for (const b of blocs) if (b.type === 'titre') b.id = ancre(texteBrut(b.texte), ids);

  const h1 = blocs.filter((b) => b.type === 'titre' && b.niveau === 1);
  if (h1.length !== 1 || blocs[0] !== h1[0]) throw new Error('Le guide doit commencer par un seul titre « # ».');
  if (blocs.some((b) => b.type === 'titre' && b.niveau > 3)) throw new Error('Titres reconnus : #, ## et ### seulement.');

  // Sommaire : les titres ## et, en dessous, leurs ###.
  const entrees = [];
  for (const b of blocs) {
    if (b.type !== 'titre') continue;
    if (b.niveau === 2) entrees.push({ b, enfants: [] });
    else if (b.niveau === 3 && entrees.length) entrees[entrees.length - 1].enfants.push(b);
  }
  const lien = (b) => `<a href="#${b.id}">${enLigne(b.texte)}</a>`;
  const sommaire = '    <nav id="sommaire" class="sommaire" aria-labelledby="titre-sommaire">\n'
    + '      <h2 id="titre-sommaire">Sommaire</h2>\n'
    + '      <ol>\n'
    + entrees.map(({ b, enfants }) => (enfants.length
      ? `        <li>${lien(b)}\n          <ol>\n${enfants.map((e) => `            <li>${lien(e)}</li>\n`).join('')}          </ol>\n        </li>\n`
      : `        <li>${lien(b)}</li>\n`)).join('')
    + '      </ol>\n'
    + '    </nav>\n';

  // Corps : chaque ## ouvre une <section> ; le texte avant le premier ## sert d'introduction.
  let corps = '';
  let dansSection = false;
  let titreCourant = h1[0].id;
  let premierParagraphe = true;
  const fermer = () => {
    if (!dansSection) return '';
    dansSection = false;
    return '      <p class="retour-sommaire"><a href="#sommaire">↑ Retour au sommaire</a></p>\n    </section>\n';
  };
  for (const b of blocs) {
    const m = dansSection ? '      ' : '    ';
    if (b.type === 'titre' && b.niveau === 1) {
      corps += `    <h1 id="${b.id}">${enLigne(b.texte)}</h1>\n`;
    } else if (b.type === 'titre' && b.niveau === 2) {
      if (!dansSection && !corps.includes('id="sommaire"')) corps += sommaire;
      corps += fermer();
      corps += `    <section aria-labelledby="${b.id}">\n      <h2 id="${b.id}">${enLigne(b.texte)}</h2>\n`;
      dansSection = true;
      titreCourant = b.id;
    } else if (b.type === 'titre') {
      corps += `${m}<h3 id="${b.id}">${enLigne(b.texte)}</h3>\n`;
      titreCourant = b.id;
    } else if (b.type === 'paragraphe') {
      // La ligne juste sous le titre (date, auteur) est présentée en plus discret.
      const classe = premierParagraphe && !dansSection ? ' class="sous-titre"' : '';
      corps += `${m}<p${classe}>${enLigne(b.texte)}</p>\n`;
    } else if (b.type === 'liste') {
      corps += listeHTML(b.items, m);
    } else if (b.type === 'tableau') {
      corps += tableauHTML(b, titreCourant, m);
    }
    if (b.type !== 'titre') premierParagraphe = false;
  }
  corps += fermer();

  const titre = texteBrut(h1[0].texte);
  return `<!doctype html>
<!-- Page fabriquée par outils/generer-guide.mjs à partir de ${SOURCE}.
     Ne pas la modifier à la main : changer le Markdown, puis lancer « npm run guide ». -->
<html lang="fr" data-theme="omni">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'">
  <meta name="referrer" content="no-referrer">
  <title>${echapper(titre)}</title>
  <meta name="description" content="Le guide d'utilisation de l'Omni-Oracle : prendre l'application en main dès sa première partie.">
  <meta name="theme-color" content="#1d1929">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icons/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="stylesheet" href="css/themes.css">
  <link rel="stylesheet" href="css/guide.css">
  <script src="js/config.js"></script>
  <!-- Applique le thème avant l'affichage (à l'impression, la page est toujours blanche) -->
  <script src="js/theme.js"></script>
  <script type="module" src="js/guide.js"></script>
</head>
<body>
  <a class="lien-evitement" href="#contenu">Aller au contenu</a>

  <!-- Barre d'outils : visible à l'écran seulement, jamais imprimée -->
  <div class="outils" role="region" aria-label="Navigation">
    <a class="bouton" href="./">← Retour à l'application</a>
    <a class="bouton" href="#sommaire">Sommaire</a>
    <button type="button" id="bouton-imprimer" class="bouton" hidden>Imprimer</button>
  </div>

  <main id="contenu" class="guide" tabindex="-1">
${corps}  </main>
</body>
</html>
`;
}

// Lancé directement (npm run guide) : écrit guide.html.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = genererGuide(fs.readFileSync(path.join(racine, SOURCE), 'utf8'));
  fs.writeFileSync(path.join(racine, PAGE), html);
  console.log(`✓ ${PAGE} refait à partir de ${SOURCE}.`);
}
