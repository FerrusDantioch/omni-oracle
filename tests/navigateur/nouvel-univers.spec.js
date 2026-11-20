// Ajouter un univers = ajouter un fichier JSON (et une ligne dans data/univers.json),
// sans toucher au code. Ce test sert un univers fictif à côté des vrais et vérifie
// que l'application et le livret le prennent en compte.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, onglet, surveillerErreurs } from './outils.js';
import { demarrerServeur, racine } from '../serveur.mjs';

test('un nouvel univers (fichier JSON seul) apparaît dans l\'application et le livret', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const index = JSON.parse(fs.readFileSync(path.join(racine, 'data/univers.json'), 'utf8'));
  const modele = JSON.parse(fs.readFileSync(path.join(racine, 'data/cyberpunk.json'), 'utf8'));
  const essai = { ...modele, id: 'essai', nom: 'Univers d\'essai', ordre: 3 };
  delete essai.source; // pas de fichier source pour cet univers fictif
  serveur.remplacer('data/essai.json', JSON.stringify(essai));
  serveur.remplacer('data/univers.json', JSON.stringify({ ...index, univers: [...index.univers, 'data/essai.json'] }));

  const page = await (await browser.newContext()).newPage();
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await page.getByText('Univers d\'essai', { exact: true }).click();
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await expect(page.locator('#titre-scene')).toBeVisible();
  await onglet(page, 'Mission');
  await page.getByRole('button', { name: 'Tirer toute la mission' }).click();
  await expect(page.locator('.tirage-texte')).toHaveCount(6);
  await expect(page.locator('#onglets').getByRole('button', { name: 'Vaisseaux' })).toHaveCount(0);

  await page.goto(`${serveur.url}livret.html?univers=essai`);
  await expect(page.locator('h1')).toHaveText('Oracle Omni-système — Univers d\'essai');
  await expect(page.getByLabel('Univers').locator('option')).toHaveCount(3);
  expect(erreurs).toEqual([]);
  await serveur.fermer();
});
