// Tests de sécurité et de livraison (sans navigateur).
// Lancement : node --test tests/securite.test.mjs
//
// - CSP stricte dans chaque page HTML ; chaque script écrit dans la page (s'il y en a)
//   doit être autorisé par son empreinte sha256 : si on le retouche sans recalculer
//   l'empreinte, ce test échoue et donne la bonne empreinte.
// - Aucun fichier chargé depuis un autre site (pas de CDN).
// - Tous les fichiers de l'application sont dans la liste du service worker.
// - Aucune couleur hors de css/themes.css.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => fs.readFileSync(path.join(racine, f), 'utf8');
const lister = (dossier) => fs.readdirSync(path.join(racine, dossier)).map((f) => `${dossier}/${f}`);
const pagesHTML = fs.readdirSync(racine).filter((f) => f.endsWith('.html'));

function csp(html) {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  if (!m) return null;
  return Object.fromEntries(m[1].split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([n, ...v]) => [n, v]));
}

test('chaque page HTML a une CSP stricte', () => {
  assert.ok(pagesHTML.includes('index.html'));
  for (const page of pagesHTML) {
    const c = csp(lire(page));
    assert.ok(c, `${page} : pas de CSP`);
    assert.deepEqual(c['default-src'], ["'none'"], `${page} : default-src`);
    assert.deepEqual(c['connect-src'], ["'self'"], `${page} : connect-src (aucun autre site contacté)`);
    assert.deepEqual(c['object-src'], ["'none'"], `${page} : object-src`);
    assert.deepEqual(c['base-uri'], ["'none'"], `${page} : base-uri`);
    for (const [nom, valeurs] of Object.entries(c)) {
      assert.ok(!valeurs.includes("'unsafe-inline'"), `${page} : ${nom} autorise 'unsafe-inline'`);
      assert.ok(!valeurs.includes("'unsafe-eval'"), `${page} : ${nom} autorise 'unsafe-eval'`);
      assert.ok(!valeurs.some((v) => /^https?:|^\*$|^\w+\.\w+/.test(v)), `${page} : ${nom} autorise un autre site`);
    }
  }
});

test('chaque script écrit dans une page est autorisé par son empreinte (sha256)', () => {
  for (const page of pagesHTML) {
    const html = lire(page);
    const c = csp(html);
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const s of scripts) {
      const empreinte = `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;
      assert.ok(c['script-src'].includes(empreinte),
        `${page} : un script écrit dans la page n'est pas autorisé. Ajoute ${empreinte} à script-src (ou recalcule l'empreinte après une retouche).`);
    }
  }
});

test('aucun attribut style= dans les pages (bloqué par la CSP)', () => {
  for (const page of pagesHTML) assert.ok(!/\sstyle=/.test(lire(page)), `${page} contient style=`);
});

test('aucun fichier chargé depuis un autre site (pas de CDN)', () => {
  const fichiers = [...pagesHTML, 'manifest.webmanifest', 'sw.js', ...lister('css'), ...lister('js')];
  for (const f of fichiers) {
    const t = lire(f);
    assert.ok(!/<(script|link|img|iframe)[^>]+(src|href)="(https?:)?\/\//i.test(t), `${f} charge un fichier externe`);
    assert.ok(!/@import\s+(url\()?["']?(https?:)?\/\//i.test(t), `${f} importe une feuille externe`);
    assert.ok(!/url\(\s*["']?(https?:)?\/\//i.test(t), `${f} utilise une ressource externe dans le CSS`);
    assert.ok(!/(fetch|importScripts|import)\s*\(\s*["'`](https?:)?\/\//.test(t), `${f} contacte un autre site`);
    assert.ok(!/from\s+["'](https?:)?\/\//.test(t), `${f} importe un module externe`);
  }
});

test('tous les fichiers de l\'application sont dans la liste du service worker', () => {
  const sw = lire('sw.js');
  const liste = [...sw.match(/const FICHIERS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const attendus = [
    ...pagesHTML, 'manifest.webmanifest',
    ...lister('css'), ...lister('js'), ...lister('assets'), ...lister('icons'),
    'data/univers.json',
  ];
  for (const f of attendus) assert.ok(liste.includes(f), `${f} manque dans la liste du service worker (sw.js)`);
  for (const f of liste.filter((x) => x !== './')) assert.ok(fs.existsSync(path.join(racine, f)), `${f} est dans sw.js mais n'existe pas`);
  // Les données : couvertes par data/univers.json (lu par le service worker à l'installation).
  const index = JSON.parse(lire('data/univers.json'));
  const donnees = [index.commun, ...index.univers];
  for (const f of donnees) assert.ok(fs.existsSync(path.join(racine, f)), `${f} est listé dans data/univers.json mais n'existe pas`);
  for (const f of lister('data').filter((x) => x !== 'data/univers.json')) {
    assert.ok(donnees.includes(f), `${f} n'est pas listé dans data/univers.json (il ne serait ni chargé ni disponible hors ligne)`);
  }
});

test('le service worker n\'efface que ses propres copies (préfixe de l\'application)', () => {
  const sw = lire('sw.js');
  assert.match(sw, /const PREFIXE = `\$\{CONFIG\.idStockage\}-`/);
  assert.match(sw, /nom\.startsWith\(PREFIXE\) && nom !== CACHE/);
  assert.match(lire('js/config.js'), /idStockage: 'oracle'/);
});

test('aucune couleur écrite en dur hors de css/themes.css', () => {
  const fichiers = [...lister('css').filter((f) => f !== 'css/themes.css'), ...lister('js'), ...pagesHTML];
  for (const f of fichiers) {
    const t = lire(f).replace(/<meta name="theme-color" content="#[0-9a-f]+">/i, '');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab|color-mix|hwb|lab|lch)\(/i.test(t.replace(/href="#\w+"/g, '').replace(/'#\w[\w-]*'/g, '')), `${f} contient une couleur écrite en dur`);
  }
});

test('le manifeste pointe vers des icônes existantes', () => {
  const m = JSON.parse(lire('manifest.webmanifest'));
  assert.equal(m.name, 'Omni-Oracle');
  // L'identité (id) est lue depuis la RACINE du site : « ./ » voudrait dire
  // « ferrusdantioch.github.io/ », la même identité que toute autre application qui
  // ferait pareil (conflit vécu avec omni-time dans Brave). Elle doit être le nom du dossier.
  assert.equal(m.id, '/omni-oracle/', 'id du manifeste : doit être « /omni-oracle/ »');
  assert.equal(m.scope, './');
  assert.equal(m.start_url, './');
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(racine, i.src)), `${i.src} introuvable`);
});

test('le fichier LICENSE est celui du kit, sans modification', () => {
  // Empreinte du fichier LICENSE fourni dans le kit (identique dans tous les dépôts de Ferrus).
  const empreinte = crypto.createHash('sha256').update(fs.readFileSync(path.join(racine, 'LICENSE'))).digest('hex');
  assert.equal(empreinte, '0483fae80ead6506beafd3258fea07f5ff23bb81e2fbd41daf137d58798a14fb', 'LICENSE a été modifié : il doit rester identique à celui du kit');
});

test('le code ne teste jamais le nom d\'un univers (les différences sont dans les données)', () => {
  const index = JSON.parse(lire('data/univers.json'));
  const ids = index.univers.map((f) => JSON.parse(lire(f)).id);
  for (const f of [...lister('js'), 'sw.js']) {
    const code = lire(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // sans les commentaires
    for (const id of ids) {
      assert.ok(!new RegExp(`['"\`]${id}['"\`]`).test(code), `${f} cite l'univers « ${id} » : mets cette différence dans les options de son JSON`);
    }
  }
});
