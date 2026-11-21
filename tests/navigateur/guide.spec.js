// Guide d'utilisation (guide.html) : ouverture, sommaire, hors ligne, aucune requête externe,
// liens depuis l'application, écrans tablette et téléphone, thèmes et contrastes, impression.
import {
  test, expect, creerPartie, attendreHorsLigne, surveillerReseau, surveillerErreurs,
  choisirTheme, fautesDeContraste, TABLETTE, TELEPHONE,
} from './outils.js';
import { demarrerServeur } from '../serveur.mjs';

const THEMES = ['omni', 'sombre', 'clair'];

/** Éléments visibles de la page trop petits pour le doigt (moins de 44 px de haut). */
const ciblesTropPetites = (page) => page.evaluate(() => [...document.querySelectorAll('a, button, [tabindex="0"]')]
  .filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width && r.height && getComputedStyle(el).visibility !== 'hidden' && r.top > -100;
  })
  .filter((el) => el.getBoundingClientRect().height < 44 || el.getBoundingClientRect().width < 44)
  .map((el) => `« ${el.textContent.trim().slice(0, 40)} » (${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)})`));

test('guide : s\'ouvre, un seul h1, titres en ordre, chaque lien du sommaire a son ancre', async ({ page, serveur }) => {
  const externes = surveillerReseau(page, serveur.url);
  const erreurs = surveillerErreurs(page);
  await page.goto(`${serveur.url}guide.html`);
  await expect(page).toHaveTitle('Guide d\'utilisation — Omni-Oracle');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Guide d\'utilisation — Omni-Oracle');

  // Hiérarchie : jamais de saut de niveau (h1 → h2 → h3).
  const niveaux = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((t) => t.map((x) => Number(x.tagName[1])));
  niveaux.forEach((n, i) => { if (i) expect(n, `titre n° ${i + 1}`).toBeLessThanOrEqual(niveaux[i - 1] + 1); });

  // Sommaire : dans un <nav> nommé, chaque lien vise une ancre qui existe.
  const sommaire = page.getByRole('navigation', { name: 'Sommaire du guide' });
  await expect(sommaire).toBeVisible();
  const cibles = await sommaire.locator('a').evaluateAll((liens) => liens.map((a) => a.getAttribute('href')));
  expect(cibles.length).toBeGreaterThan(20);
  for (const c of cibles) {
    expect(c).toMatch(/^#/);
    expect(await page.evaluate((id) => document.querySelectorAll(`[id="${id}"]`).length, c.slice(1)), `ancre ${c}`).toBe(1);
  }
  // Un toucher sur une entrée amène à sa section.
  await sommaire.getByRole('link', { name: 'Chocs et folie (Horreur / enquête)' }).click();
  await expect(page).toHaveURL(/#chocs-et-folie-horreur-enquete$/);
  await expect(page.locator('#chocs-et-folie-horreur-enquete')).toBeInViewport();

  // Tableaux : en-têtes de colonnes et de lignes.
  const sansScope = await page.locator('th:not([scope="col"]):not([scope="row"])').count();
  expect(sansScope).toBe(0);
  // Lien d'évitement (premier arrêt de Tab en haut de page), avec un contour de focus visible.
  await page.goto(`${serveur.url}guide.html`);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
  const contour = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { style: s.outlineStyle, largeur: parseFloat(s.outlineWidth) };
  });
  expect(contour.style).not.toBe('none');
  expect(contour.largeur).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#bouton-imprimer')).toBeVisible();

  expect(externes).toEqual([]);
  expect(erreurs).toEqual([]); // aucune violation de la CSP
});

test('guide : aucune requête vers un autre site, même en suivant les liens internes', async ({ page, serveur }) => {
  const externes = surveillerReseau(page, serveur.url);
  await page.emulateMedia({ reducedMotion: 'reduce' }); // défilement immédiat entre deux clics
  await page.goto(`${serveur.url}guide.html`);
  for (const lien of await page.locator('nav a').all()) await lien.click();
  await page.getByRole('link', { name: '← Retour à l\'application' }).click();
  await expect(page.locator('#titre-nouvelle')).toBeVisible();
  expect(externes).toEqual([]);
});

test('guide : lisible hors ligne après une première visite', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const contexte = await browser.newContext();
  const page = await contexte.newPage();
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await attendreHorsLigne(page);
  await serveur.fermer();
  await contexte.setOffline(true);
  await page.goto(`${serveur.url}guide.html`);
  await expect(page.locator('h1')).toHaveText('Guide d\'utilisation — Omni-Oracle');
  // La feuille de style et le script sont là aussi (boutons à 44 px, bouton Imprimer affiché).
  expect(await page.locator('.outils .bouton').first().evaluate((b) => b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#bouton-imprimer')).toBeVisible();
  // Et le retour à l'application marche aussi hors ligne.
  await page.getByRole('link', { name: '← Retour à l\'application' }).click();
  await expect(page.locator('#titre-nouvelle')).toBeVisible();
  expect(erreurs).toEqual([]);
  await contexte.close();
});

test('menu « Guide d\'utilisation » (avant « Livret imprimable »), puis retour sans perdre la partie', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { mission: 'Nuit blanche' });
  await page.getByRole('button', { name: /Menu/ }).click();
  const entrees = await page.getByRole('dialog').getByRole('button').allTextContents();
  const i = entrees.indexOf('Guide d\'utilisation');
  expect(i).toBeGreaterThan(-1);
  expect(entrees[i + 1]).toBe('Livret imprimable');
  await page.getByRole('dialog').getByRole('button', { name: 'Guide d\'utilisation' }).click();
  await expect(page).toHaveURL(/guide\.html$/);
  await expect(page.locator('h1')).toHaveText('Guide d\'utilisation — Omni-Oracle');
  await page.getByRole('link', { name: '← Retour à l\'application' }).click();
  await expect(page.locator('#titre-app')).toHaveText('Nuit blanche');
  await expect(page.locator('#tableau-de-bord')).toBeVisible();
});

test('accueil : lien « Première fois ? » en vue sans partie, discret en bas avec des parties', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  const lien = page.getByRole('link', { name: 'Première fois ? Lis le guide d\'utilisation' });
  await expect(lien).toHaveCount(1);
  await expect(page.locator('.accueil-logo .lien-guide')).toBeVisible();
  expect(await lien.evaluate((a) => a.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await lien.click();
  await expect(page).toHaveURL(/guide\.html$/);
  await page.getByRole('link', { name: '← Retour à l\'application' }).click();

  await creerPartie(page);
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await expect(lien).toHaveCount(1);
  await expect(page.locator('.accueil-logo .lien-guide')).toHaveCount(0);
  await expect(page.locator('.accueil-guide-bas .lien-guide')).toBeVisible();
  await lien.click();
  await expect(page).toHaveURL(/guide\.html$/);
});

for (const [nomEcran, ecran] of [['tablette', TABLETTE], ['téléphone', TELEPHONE], ['petit téléphone', { width: 360, height: 740 }]]) {
  for (const theme of THEMES) {
    test(`guide, ${nomEcran}, thème ${theme} : pas de défilement horizontal, contrastes ≥ 4,5:1, cibles ≥ 44 px`, async ({ page, serveur }) => {
      await page.setViewportSize(ecran);
      await choisirTheme(page, theme);
      await page.goto(`${serveur.url}guide.html`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // La page entière ne défile pas sur le côté (seuls les tableaux larges défilent, dans leur cadre).
      const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(largeur).toBeLessThanOrEqual(ecran.width + 1);
      const tableauxDebordants = await page.locator('.bloc-table').evaluateAll((b) => b.filter((x) => x.getBoundingClientRect().right > window.innerWidth + 1).length);
      expect(tableauxDebordants).toBe(0);
      expect(await fautesDeContraste(page, nomEcran)).toEqual([]);
      expect(await ciblesTropPetites(page)).toEqual([]);
    });
  }
}

test('guide : impression A4 noir sur blanc, sans la barre d\'outils', async ({ page, serveur }) => {
  await choisirTheme(page, 'omni');
  await page.goto(`${serveur.url}guide.html`);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.outils')).toBeHidden();
  await expect(page.locator('.retour-sommaire').first()).toBeHidden();
  const couleurs = await page.evaluate(() => ({
    fond: getComputedStyle(document.body).backgroundColor,
    texte: getComputedStyle(document.body).color,
    lien: getComputedStyle(document.querySelector('.guide p a')).color,
    souligne: getComputedStyle(document.querySelector('.guide p a')).textDecorationLine,
  }));
  expect(couleurs.fond).toBe('rgb(255, 255, 255)');
  expect(couleurs.texte).toBe('rgb(0, 0, 0)');
  expect(couleurs.lien).toBe('rgb(0, 0, 0)');      // pas d'information portée par la couleur…
  expect(couleurs.souligne).toContain('underline'); // … le lien reste reconnaissable
  // Le PDF se fabrique sans erreur (format A4).
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true });
  expect(pdf.length).toBeGreaterThan(10_000);
});

test('guide : « réduire les animations » coupe le défilement animé', async ({ page, serveur }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${serveur.url}guide.html`);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('smooth');
});
