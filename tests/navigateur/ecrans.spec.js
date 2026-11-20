// Tablette (~800 px) et téléphone (~400 px) : pas de défilement horizontal,
// cibles tactiles de 44 px minimum, tableau de bord toujours visible.
import { test, expect, creerPartie, onglet, TABLETTE, TELEPHONE } from './outils.js';

const ECRANS = { tablette: TABLETTE, telephone: TELEPHONE, 'petit téléphone': { width: 360, height: 740 } };
const ONGLETS = ['Jouer', 'Mission', 'PNJ', 'Intentions', 'Vaisseaux', 'Fiche', 'Tables', 'Journal'];

async function controler(page, ou) {
  const pb = await page.evaluate(() => {
    const res = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) res.push(`déborde (${document.documentElement.scrollWidth}px)`);
    const cibles = document.querySelectorAll('button, select, summary, a, input[type=text], input[type=search], input[type=number], textarea, .choix-option label, .case');
    for (const el of cibles) {
      if (!el.offsetParent || el.closest('[hidden]')) continue;
      const r = el.getBoundingClientRect();
      // Liens au milieu d'une phrase : la norme (WCAG 2.5.8) les dispense de la taille minimale.
      const p = el.tagName === 'A' && el.closest('p');
      if (p && p.textContent.trim() !== el.textContent.trim()) continue;
      if (r.height < 43.5 || r.width < 43.5) res.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return res;
  });
  expect(pb, ou).toEqual([]);
}

for (const [nom, taille] of Object.entries(ECRANS)) {
  test(`${nom} : tous les onglets sans débordement et avec des cibles de 44 px`, async ({ browser, serveur }) => {
    const page = await browser.newPage({ viewport: taille });
    await page.goto(serveur.url);
    await controler(page, 'accueil');
    await creerPartie(page, { univers: 'Space opéra', mode: 'Duo', pjs: ['Ysabelle', 'Tarnovski'] });
    await page.getByRole('button', { name: 'Lancer le d20 de scène' }).click();
    await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
    for (const o of ONGLETS) {
      await onglet(page, o);
      if (o === 'Mission') await page.getByRole('button', { name: 'Tirer toute la mission' }).click();
      if (o === 'Vaisseaux') await page.getByRole('button', { name: 'Nouvelle rencontre' }).click();
      if (o === 'Tables') await page.locator('summary', { hasText: 'D1' }).click();
      await controler(page, o);
    }
    // Fenêtres
    await page.getByRole('button', { name: /Menu/ }).click();
    await controler(page, 'menu');
    await page.getByRole('button', { name: 'À propos' }).click();
    await controler(page, 'à propos');
    await page.close();
  });

  test(`${nom} : le tableau de bord reste visible en faisant défiler`, async ({ browser, serveur }) => {
    const page = await browser.newPage({ viewport: taille });
    await page.goto(serveur.url);
    await creerPartie(page);
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(200);
    const boite = await page.locator('#tableau-de-bord').boundingBox();
    expect(boite.y).toBeGreaterThanOrEqual(-1);
    expect(boite.y + boite.height).toBeLessThanOrEqual(taille.height);
    await page.close();
  });
}
