// Livret imprimable : construit depuis les mêmes JSON, complet, fidèle, imprimable en noir et blanc.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, surveillerReseau, surveillerErreurs, TELEPHONE } from './outils.js';
import { racine } from '../serveur.mjs';

const lire = (f) => JSON.parse(fs.readFileSync(path.join(racine, f), 'utf8'));
const index = lire('data/univers.json');
const commun = lire(index.commun);
const univers = index.univers.map(lire);
const brut = (t) => String(t).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
const espaces = (t) => t.replace(/\s+/g, ' ').trim();

for (const u of univers) {
  test(`livret ${u.nom} : toutes les tables, toutes les lignes, texte identique aux données`, async ({ page, serveur }) => {
    const externes = surveillerReseau(page, serveur.url);
    const erreurs = surveillerErreurs(page);
    await page.goto(`${serveur.url}livret.html?univers=${u.id}`);
    await expect(page.locator('body')).toHaveAttribute('data-pret', 'oui');
    await expect(page.locator('h1')).toHaveText(`Oracle Omni-système — ${u.nom}`);
    await expect(page.locator('h1')).toHaveCount(1);

    // Les tables attendues : celles du tronc commun, puis celles de l'univers (renvois résolus).
    const tables = [...commun.tables, ...u.tables.map((t) => (t.reference
      ? univers.find((x) => x.id === t.reference.univers).tables.find((x) => x.id === t.reference.table)
      : t))];
    const html = await page.locator('.table-donnees').evaluateAll((ts) => ts.map((t) => [...t.tBodies[0].rows].map((r) => [...r.cells].map((c) => c.textContent))));
    expect(html.length).toBe(tables.length);
    tables.forEach((t, i) => {
      expect(html[i].length, t.titre).toBe(t.lignes.length);
      t.lignes.forEach((l, j) => {
        const attendu = (t.de && t.type !== 'grille' ? [l.plage, l.texte] : [l.texte]).concat(l.autres || []).map((x) => espaces(brut(x)));
        expect(html[i][j].map(espaces), `${t.titre}, ligne ${j + 1}`).toEqual(attendu);
      });
    });
    // Les règles du tronc commun et la fiche de suivi sont présentes, les « Notes de test » non.
    for (const s of commun.sections.filter((x) => x.titre)) await expect(page.getByRole('heading', { name: s.titre, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fiche de suivi (à copier)', exact: true })).toBeVisible();
    await expect(page.getByText('Notes de test')).toHaveCount(0);
    expect(externes).toEqual([]);
    expect(erreurs).toEqual([]);
  });
}

test('livret : changer d\'univers met à jour le livret et l\'adresse', async ({ page, serveur }) => {
  await page.goto(`${serveur.url}livret.html`);
  await expect(page.locator('h1')).toHaveText('Oracle Omni-système — Cyberpunk');
  await page.getByLabel('Univers').selectOption('space-opera');
  await expect(page.locator('h1')).toHaveText('Oracle Omni-système — Space opéra');
  expect(page.url()).toContain('univers=space-opera');
});

test('livret à l\'impression : barre d\'outils cachée, uniquement du noir, du blanc et du gris', async ({ page, serveur }) => {
  await page.goto(`${serveur.url}livret.html?univers=space-opera`);
  await expect(page.locator('body')).toHaveAttribute('data-pret', 'oui');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.outils')).toBeHidden();
  const couleurs = await page.evaluate(() => {
    const res = new Set();
    for (const el of document.querySelectorAll('body, body *')) {
      if (el.getClientRects().length === 0) continue; // élément non imprimé (caché)
      const s = getComputedStyle(el);
      for (const c of [s.color, s.backgroundColor, s.borderTopColor]) {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        if (a === 0) continue;
        if (!(r === g && g === b) && Math.max(r, g, b) - Math.min(r, g, b) > 40) res.add(c);
      }
    }
    return [...res];
  });
  expect(couleurs, 'couleurs non grises à l\'impression').toEqual([]);
  const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(fond).toBe('rgb(255, 255, 255)');
});

test('livret en PDF : format A4, numéros de page', async ({ page, serveur }) => {
  await page.goto(`${serveur.url}livret.html?univers=cyberpunk`);
  await expect(page.locator('body')).toHaveAttribute('data-pret', 'oui');
  const pdf = await page.pdf({ preferCSSPageSize: true });
  const texte = pdf.toString('latin1');
  const pages = (texte.match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(pages).toBeGreaterThan(5);
  expect(texte).toMatch(/\/MediaBox\s*\[\s*0 0 59[45](\.\d+)? 84[12](\.\d+)?\s*\]/); // A4 : 595 × 842 points
});

test('livret sur téléphone : pas de débordement, boutons de 44 px', async ({ browser, serveur }) => {
  const page = await browser.newPage({ viewport: TELEPHONE });
  await page.goto(`${serveur.url}livret.html?univers=space-opera`);
  await expect(page.locator('body')).toHaveAttribute('data-pret', 'oui');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  for (const b of await page.locator('.outils .bouton, .outils select').all()) {
    const r = await b.boundingBox();
    expect(r.height).toBeGreaterThanOrEqual(44);
  }
  await page.close();
});

test('le menu de l\'application ouvre le livret de l\'univers de la partie', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await page.getByText('Space opéra', { exact: true }).click();
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Livret imprimable' }).click();
  await expect(page.locator('h1')).toHaveText('Oracle Omni-système — Space opéra');
});
