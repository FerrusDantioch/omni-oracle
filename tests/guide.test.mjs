// Guide d'utilisation : guide.html doit être fidèle à sources/08-guide-utilisation.md.
// Lancement : node --test tests/guide.test.mjs
//
// - la page est à jour (refaite avec « npm run guide » après chaque changement du Markdown) ;
// - mêmes titres, dans le même ordre et au même niveau ;
// - mêmes tableaux, cellule par cellule ;
// - même texte, mot pour mot (vérification indépendante du script qui fabrique la page :
//   une erreur de ce script serait donc repérée aussi).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { genererGuide, SOURCE, PAGE } from '../outils/generer-guide.mjs';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdown = fs.readFileSync(path.join(racine, SOURCE), 'utf8').replace(/\r\n?/g, '\n');
const html = fs.readFileSync(path.join(racine, PAGE), 'utf8');

// --- Côté Markdown : texte sans mise en forme -------------------------------------------------
const nettoyerMd = (s) => s
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // lien → son texte
  .replace(/\*\*|`/g, '')                         // gras, code
  .replace(/(^|[^\\*])\*([^*]+)\*/g, '$1$2')      // italique
  .replace(/\\(.)/g, '$1')                        // caractère échappé
  .trim();
const lignesMd = markdown.split('\n');
const titresMd = lignesMd.filter((l) => /^#{1,6} /.test(l)).map((l) => {
  const [, dieses, texte] = l.match(/^(#+) +(.*)$/);
  return `${dieses.length} ${nettoyerMd(texte)}`;
});
const tableauxMd = [];
for (let i = 0; i < lignesMd.length; i++) {
  if (!/^\s*\|/.test(lignesMd[i]) || /^\s*\|/.test(lignesMd[i - 1] || '')) continue;
  const t = [];
  while (/^\s*\|/.test(lignesMd[i] || '')) t.push(lignesMd[i++]);
  tableauxMd.push(t.filter((l) => !/^\s*\|\s*:?-{3,}/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => nettoyerMd(c))));
}
const motsMd = lignesMd
  .map((l) => (/^#+ /.test(l) ? l.replace(/^#+ /, '') : l.replace(/^\s*\|\s*:?-{3,}.*$/, '').replace(/^\s*([-*]|\d+\.) /, '').replace(/\|/g, ' ')))
  .map(nettoyerMd).join(' ').split(/\s+/).filter(Boolean);

// --- Côté HTML : texte du guide, sans le sommaire ni les liens « Retour au sommaire » ---------
const decoder = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// Balises dans la ligne (gras, italique, code, lien) : retirées sans espace ; les autres séparent les mots.
const sansBalises = (s) => decoder(s.replace(/<\/?(strong|em|code|a)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const contenu = html.match(/<main[^>]*>([\s\S]*)<\/main>/)[1]
  .replace(/<nav[\s\S]*?<\/nav>/, '')
  .replace(/<p class="retour-sommaire">[\s\S]*?<\/p>/g, '');
const titresHTML = [...contenu.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => `${m[1]} ${sansBalises(m[2])}`);
const tableauxHTML = [...contenu.matchAll(/<table>([\s\S]*?)<\/table>/g)].map((t) => [...t[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
  .map((r) => [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => sansBalises(c[1]))));
const motsHTML = sansBalises(contenu).split(' ').filter(Boolean);

test('guide.html est à jour (sinon : npm run guide)', () => {
  assert.ok(genererGuide(markdown) === html,
    `${PAGE} ne correspond plus à ${SOURCE}. Lance « npm run guide » pour refaire la page.`);
});

test('guide : mêmes titres que le Markdown, dans le même ordre', () => {
  assert.deepEqual(titresHTML, titresMd);
  assert.equal(titresHTML.filter((t) => t.startsWith('1 ')).length, 1, 'un seul titre de niveau 1');
});

test('guide : mêmes tableaux que le Markdown, cellule par cellule', () => {
  assert.ok(tableauxMd.length > 0);
  assert.deepEqual(tableauxHTML, tableauxMd);
});

test('guide : même texte que le Markdown, mot pour mot', () => {
  const n = Math.max(motsMd.length, motsHTML.length);
  for (let i = 0; i < n; i++) {
    if (motsMd[i] !== motsHTML[i]) {
      assert.fail(`Différence au mot ${i} :\n  Markdown : … ${motsMd.slice(Math.max(0, i - 6), i + 6).join(' ')}\n  HTML     : … ${motsHTML.slice(Math.max(0, i - 6), i + 6).join(' ')}`);
    }
  }
});

test('guide : chaque tableau a des en-têtes avec scope, chaque lien du sommaire a sa cible', () => {
  for (const t of html.matchAll(/<th(?=[\s>])(?![^>]*scope="(col|row)")[^>]*>/g)) assert.fail(`<th> sans scope : ${t[0]}`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const liens = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  assert.ok(liens.length > 20);
  for (const l of liens) assert.ok(ids.has(l), `lien vers #${l}, ancre absente`);
  assert.equal(ids.size, [...html.matchAll(/\sid="/g)].length, 'deux éléments ont le même id');
});
