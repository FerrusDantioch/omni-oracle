// Rappel de sauvegarde : après 5 scènes sans export, un bandeau discret propose d'exporter.
import { test, expect, creerPartie, onglet } from './outils.js';

async function finirScenes(page, n) {
  for (let i = 0; i < n; i++) {
    await page.locator('.vue-jouer [data-cle="scene-terminer"]').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Terminer la scène' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
}

test('bandeau après 5 scènes ; « Plus tard » ; l\'export le fait disparaître et date la partie', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { mission: 'À sauvegarder' });
  await finirScenes(page, 4);
  await expect(page.locator('.rappel-sauvegarde')).toHaveCount(0);
  await finirScenes(page, 1);
  await expect(page.locator('.rappel-sauvegarde')).toContainText('5 scènes jouées depuis ta dernière sauvegarde.');
  // Bandeau discret : pas de fenêtre qui bloque.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('[data-cle="rappel-plus-tard"]').click();
  await expect(page.locator('.rappel-sauvegarde')).toHaveCount(0);
  await finirScenes(page, 5);
  await expect(page.locator('.rappel-sauvegarde')).toContainText('10 scènes jouées');
  const telechargement = page.waitForEvent('download');
  await page.locator('[data-cle="rappel-exporter"]').click();
  await telechargement;
  await expect(page.locator('.rappel-sauvegarde')).toHaveCount(0);
  // « Mes parties » : date de l'export.
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await expect(page.locator('.liste-parties li')).toContainText(/Exportée le \d/);
});

test('« Jamais exportée », et le réglage coupe le rappel', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { mission: 'Sans rappel' });
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  const rappel = page.getByRole('dialog').getByLabel('Rappel de sauvegarde (après 5 scènes sans export)');
  await expect(rappel).toBeChecked();
  await expect(page.locator('[data-cle="etat-stockage"]')).toContainText('Protection des données :');
  await expect(page.locator('[data-cle="etat-stockage"]')).not.toContainText('vérification');
  await rappel.uncheck();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await finirScenes(page, 5);
  await expect(page.locator('.rappel-sauvegarde')).toHaveCount(0);
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await expect(page.locator('.liste-parties li')).toContainText('Jamais exportée');
});

test('exporter depuis la fiche remet aussi le compte à zéro', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page);
  await finirScenes(page, 5);
  await expect(page.locator('.rappel-sauvegarde')).toBeVisible();
  await onglet(page, 'Fiche');
  const telechargement = page.waitForEvent('download');
  await page.locator('[data-cle="fiche-exporter"]').click();
  await telechargement;
  await onglet(page, 'Jouer');
  await expect(page.locator('.rappel-sauvegarde')).toHaveCount(0);
});
