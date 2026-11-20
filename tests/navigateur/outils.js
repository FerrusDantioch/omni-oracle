// Outils communs aux tests dans le navigateur.
import { test as base, expect } from '@playwright/test';
import { demarrerServeur } from '../serveur.mjs';

export const TABLETTE = { width: 800, height: 1280 };
export const TELEPHONE = { width: 400, height: 850 };

/** `serveur` : un petit serveur local par processus de test. */
export const test = base.extend({
  serveur: [async ({}, use) => { // eslint-disable-line no-empty-pattern
    const s = await demarrerServeur();
    await use(s);
    await s.fermer();
  }, { scope: 'worker' }],
});
export { expect };

/** Note toutes les requêtes qui partent vers un autre site que l'application. */
export function surveillerReseau(page, url) {
  const externes = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(url) && !/^(blob|data):/.test(u)) externes.push(u);
  });
  return externes;
}

/** Note les erreurs JavaScript de la page. */
export function surveillerErreurs(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  return erreurs;
}

/** Crée une partie depuis l'accueil. */
export async function creerPartie(page, { univers = 'Cyberpunk', mode = 'Solo', mission = 'Mission test', pjs = ['Kei'] } = {}) {
  await page.getByText(univers, { exact: true }).click();
  await page.getByText(mode, { exact: true }).click();
  await page.getByLabel('Nom de la mission').fill(mission);
  if (mode === 'Duo') {
    await page.getByLabel('Nom du premier PJ').fill(pjs[0]);
    await page.getByLabel('Nom du second PJ').fill(pjs[1]);
  } else {
    await page.getByLabel('Nom du PJ').fill(pjs[0]);
  }
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await expect(page.locator('#titre-scene')).toBeVisible();
}

export const onglet = (page, nom) => page.locator('#onglets').getByRole('button', { name: nom, exact: true }).click();

/** Attend que le service worker contrôle la page (application copiée sur l'appareil). */
export async function attendreHorsLigne(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);
}
