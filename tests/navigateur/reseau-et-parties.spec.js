// Aucune requête ne doit partir vers un autre site, et les parties s'exportent / s'importent.
import fs from 'node:fs';
import { test, expect, creerPartie, onglet, surveillerReseau, surveillerErreurs } from './outils.js';

test('aucune requête réseau vers un autre site, dans tous les onglets', async ({ page, serveur }) => {
  const externes = surveillerReseau(page, serveur.url);
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Space opéra', mode: 'Duo', pjs: ['Ysa', 'Tarn'] });
  await page.getByRole('button', { name: 'Lancer le d20 de scène' }).click();
  await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
  await page.getByRole('button', { name: 'Lancer le d20' }).click();
  for (const nom of ['Mission', 'PNJ', 'Intentions', 'Vaisseaux', 'Fiche', 'Tables', 'Journal']) {
    await onglet(page, nom);
  }
  await onglet(page, 'Mission');
  await page.getByRole('button', { name: 'Tirer toute la mission' }).click();
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'À propos' }).click();
  await page.keyboard.press('Escape');
  expect(externes).toEqual([]);
  expect(erreurs).toEqual([]);
});

test('export puis import d\'une partie (fiche de suivi incluse)', async ({ page, serveur }, info) => {
  await page.goto(serveur.url);
  await creerPartie(page, { mission: 'Partie à exporter' });
  await onglet(page, 'Fiche');
  await page.getByRole('button', { name: '+ Ajouter un fil' }).click();
  await page.keyboard.type('Qui a payé le fixeur ?');
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter la partie' }).click();
  const fichier = await telechargement;
  const chemin = info.outputPath('partie.json');
  await fichier.saveAs(chemin);
  const contenu = JSON.parse(fs.readFileSync(chemin, 'utf8'));
  expect(contenu.application).toBe('Omni-Oracle');
  expect(contenu.partie.fiche.fils[0].texte).toBe('Qui a payé le fixeur ?');

  // Retour à l'accueil et import : la partie existe déjà → « Garder les deux ».
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await page.locator('#fichier-import').setInputFiles(chemin);
  await page.getByRole('button', { name: 'Garder les deux' }).click();
  await expect(page.locator('.liste-parties li')).toHaveCount(2);
  await expect(page.getByText('Partie à exporter (copie)')).toBeVisible();
});

test('un fichier qui n\'est pas une partie est refusé avec un message clair', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await expect(page.locator('#titre-parties')).toBeVisible();
  // Fichier fourni directement en mémoire (un chemin avec accents est mal transmis par l'outil de test).
  await page.locator('#fichier-import').setInputFiles({
    name: 'faux.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ application: 'Autre chose' })),
  });
  await expect(page.getByText('Ce fichier ne vient pas d\'Omni-Oracle.')).toBeVisible();
});
