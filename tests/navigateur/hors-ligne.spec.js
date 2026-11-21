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
  await page.keyboard.press('Escape');
  // Les nouveaux univers aussi : fantasy (rencontres) et horreur (chocs, folie).
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await creerPartie(page, { univers: 'Fantasy', pjs: ['Elric'] });
  await onglet(page, 'Rencontres');
  await page.getByRole('button', { name: 'Nouvelle rencontre' }).click();
  await expect(page.getByText(/F1 — Type de rencontre \(d20/)).toBeVisible();
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await creerPartie(page, { univers: 'Horreur / enquête', pjs: ['Ada'] });
  await onglet(page, 'Fiche');
  for (let i = 0; i < 5; i++) await page.locator('[data-cle="fiche-pj1-chocs-plus"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Convertir 5 chocs en 1 point de folie' }).click();
  await expect(page.locator('#fiche-chocs .resultat-titre')).not.toBeEmpty();
  // Les livrets aussi sont disponibles hors ligne, pour les quatre univers.
  for (const [id, nom] of [['cyberpunk', 'Cyberpunk'], ['space-opera', 'Space opéra'], ['fantasy', 'Fantasy'], ['horreur-enquete', 'Horreur / enquête']]) {
    await page.goto(`${serveur.url}livret.html?univers=${id}`);
    await expect(page.locator('h1')).toHaveText(`Oracle Omni-système — ${nom}`);
    await expect(page.locator('.table-donnees').first()).toBeVisible();
  }
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
