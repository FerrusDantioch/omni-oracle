// L'application doit fonctionner sans internet après la première visite.
import { test, expect, creerPartie, onglet, attendreHorsLigne, surveillerErreurs } from './outils.js';
import { demarrerServeur } from '../serveur.mjs';

test('hors ligne : tout fonctionne une fois le serveur coupé', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const contexte = await browser.newContext();
  const page = await contexte.newPage();
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await attendreHorsLigne(page);

  // On coupe tout : le serveur ET le réseau du navigateur.
  await serveur.fermer();
  await contexte.setOffline(true);
  await page.reload();

  await expect(page.locator('#titre-nouvelle')).toBeVisible();
  await creerPartie(page, { univers: 'Space opéra', mode: 'Duo', pjs: ['Ysa', 'Tarn'] });
  await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
  await expect(page.locator('.resultat-titre').first()).toBeVisible();
  // Les tables des deux univers sont disponibles hors ligne.
  await onglet(page, 'Vaisseaux');
  await page.getByRole('button', { name: 'Nouvelle rencontre' }).click();
  await expect(page.getByText(/D1 — Type de vaisseau \(d20/)).toBeVisible();
  await onglet(page, 'PNJ');
  await page.getByRole('button', { name: 'Tirer les trois' }).click();
  await expect(page.locator('.tirage-texte')).toHaveCount(3);
  // Logo de l'À propos (image) disponible aussi.
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'À propos' }).click();
  const logoCharge = await page.locator('.apropos-logo').evaluate((img) => img.complete && img.naturalWidth > 0);
  expect(logoCharge).toBe(true);
  // Le livret aussi est disponible hors ligne.
  await page.goto(`${serveur.url}livret.html?univers=space-opera`);
  await expect(page.locator('h1')).toHaveText('Oracle Omni-système — Space opéra');
  await expect(page.locator('.table-donnees').first()).toBeVisible();
  expect(erreurs).toEqual([]);
  await contexte.close();
});

test('hors ligne : la partie en cours est retrouvée après rechargement', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const contexte = await browser.newContext();
  const page = await contexte.newPage();
  await page.goto(serveur.url);
  await attendreHorsLigne(page);
  await creerPartie(page, { mission: 'Nuit blanche' });
  await serveur.fermer();
  await contexte.setOffline(true);
  await page.reload();
  await expect(page.locator('#titre-app')).toHaveText('Nuit blanche');
  await contexte.close();
});
