// Options d'univers lues dans les données : univers sans omni-points (horreur), paliers de
// Pression propres à l'univers, profils d'intention en plus (fantasy, horreur), et parties
// enregistrées avec la version 0.2.1 toujours lisibles.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, creerPartie, onglet, surveillerErreurs } from './outils.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const ANCIENNES = fs.readFileSync(path.join(ici, 'donnees/parties-0.2.1.json'));

test('horreur : ni compteur d\'omni-points ni contestation, paliers d\'horreur, seuil de rupture sans gain', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Horreur / enquête', mode: 'Duo', pjs: ['Ada', 'Bo'] });
  await expect(page.locator('.tdb-omni')).toHaveCount(0);
  await expect(page.locator('[data-cle="tdb-seuil"]')).toHaveCount(0);
  await expect(page.locator('.tdb-palier')).toContainText('Malaise');
  await expect(page.locator('.vue-jouer')).toContainText('Pression 3 · Malaise · 15 %');

  // Question en duo : pas de bouton « Contester », ni dans Jouer, ni dans le journal.
  await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
  await expect(page.locator('.vue-jouer .resultat-titre').first()).toBeVisible();
  await expect(page.locator('[data-cle="oracle-contester"]')).toHaveCount(0);
  await onglet(page, 'Journal');
  await expect(page.locator('[data-cle^="j-contester"]')).toHaveCount(0);

  // Pression à 9 : un petit message, sans gain.
  for (let i = 0; i < 6; i++) {
    await page.locator('[data-cle="tdb-plus"]').click();
    if (i === 3) await page.locator('.dialogue-actions').getByRole('button', { name: 'Fermer' }).click(); // étau à 7
  }
  await expect(page.getByRole('dialog')).toContainText('Sans omni-points dans cet univers, il ne rapporte rien à l\'Oracle.');
  await page.locator('.dialogue-actions').getByRole('button', { name: 'Fermer' }).click();
  await expect(page.locator('.tdb-palier')).toContainText('Rupture');

  // Fiche et « Modifier la partie » : pas d'omni-points.
  await onglet(page, 'Fiche');
  await expect(page.locator('.vue-fiche')).not.toContainText('omni-points');
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Modifier la partie' }).click();
  await expect(page.getByRole('dialog').getByText(/Omni-points/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Annuler' }).click();

  // Intentions : profils M1, case « affaiblie », pas de relance de l'Oracle.
  await onglet(page, 'Intentions');
  await page.getByText('Prédateur', { exact: true }).click();
  await expect(page.getByText('+4 : la menace est affaiblie (rituel perturbé, symbole effacé, objet détruit)')).toBeVisible();
  await page.locator('[data-cle="intention-blesse"]').check();
  await page.locator('[data-cle="intention-jouer"]').click();
  await expect(page.locator('.vue-intentions .resultat .discret').first()).toContainText('Prédateur');
  await expect(page.locator('.vue-intentions .resultat-detail')).toContainText('+ 4');
  await expect(page.locator('.vue-intentions .resultat-detail')).toContainText('− 2'); // Pression ≥ 7
  await expect(page.locator('[data-cle="intention-relance"]')).toHaveCount(0);
  await expect(page.locator('.vue-intentions .regles h3')).toHaveText('M1 — Intentions d\'une menace surnaturelle');
  expect(erreurs).toEqual([]);
});

test('fantasy : omni-points avec le rappel du sort, profils F4 en plus du tronc commun', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Fantasy', pjs: ['Elric'] });
  await expect(page.locator('.tdb-palier')).toContainText('Vigilance');
  await page.locator('[data-cle="tdb-omni-pj1"]').click();
  await expect(page.getByRole('dialog')).toContainText('Rappel : Un omni-point permet aussi de récupérer une utilisation de sort pour un magicien.');
  await page.getByRole('button', { name: 'Annuler' }).click();

  await onglet(page, 'Intentions');
  for (const nom of ['Brute', 'Compagnon loyal', 'Bête sauvage', 'Lanceur de sorts', 'Chef de guerre']) {
    await expect(page.locator('.vue-intentions .choix-texte', { hasText: nom })).toHaveCount(1);
  }
  await page.getByText('Lanceur de sorts', { exact: true }).click();
  await expect(page.getByText('+4 : l\'adversaire a perdu la moitié de ses PV ou plus', { exact: true })).toBeVisible();
  await page.locator('[data-cle="intention-jouer"]').click();
  await expect(page.locator('.vue-intentions .resultat .discret').first()).toContainText('Lanceur de sorts');
  await expect(page.locator('.vue-intentions .colonnes-intention li')).toHaveCount(5);
  await page.locator('[data-cle="intention-relancer"]').click();
  await expect(page.locator('.vue-intentions .resultat .discret').first()).toContainText('Lanceur de sorts');
  await onglet(page, 'Journal');
  await expect(page.locator('.journal li').first()).toContainText('(Lanceur de sorts)');

  // Le profil se choisit aussi pour un PNJ de la fiche.
  await onglet(page, 'PNJ');
  await expect(page.locator('[data-cle="pnj-profil"] option', { hasText: 'Chef de guerre' })).toHaveCount(1);
  expect(erreurs).toEqual([]);
});

test('cyberpunk : rien ne change (omni-points, paliers et profils du tronc commun)', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Cyberpunk', mode: 'Duo', pjs: ['Kei', 'Rho'] });
  await expect(page.locator('.tdb-omni button')).toHaveCount(3);
  await expect(page.locator('.tdb-palier')).toContainText('Vigilance');
  await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
  await expect(page.locator('[data-cle="oracle-contester"]')).toBeVisible();
  await onglet(page, 'Intentions');
  await expect(page.locator('.vue-intentions .choix-texte', { hasText: 'Bête sauvage' })).toHaveCount(0);
  await expect(page.locator('.vue-intentions .choix-texte', { hasText: 'Prédateur' })).toHaveCount(0);
});

test('parties enregistrées avec la version 0.2.1 : import, reprise et journal lisibles', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await expect(page.locator('#titre-parties')).toBeVisible();
  await page.locator('#fichier-import').setInputFiles({ name: 'parties-0.2.1.json', mimeType: 'application/json', buffer: ANCIENNES });
  await expect(page.locator('.liste-parties li')).toHaveCount(2);

  await page.locator('.liste-parties li', { hasText: 'Ancienne mission' }).getByRole('button', { name: 'Reprendre' }).click();
  await expect(page.locator('#titre-scene')).toHaveText('Scène 2');
  await expect(page.locator('.tdb-omni button')).toHaveCount(3);
  for (const nom of ['Mission', 'PNJ', 'Intentions', 'Fiche', 'Tables', 'Journal']) await onglet(page, nom);
  // Les débuts de scène (mal enregistrés par la version 0.2.1) sont bien relus.
  await expect(page.locator('.journal li', { hasText: 'Début de la scène 1' })).toHaveCount(1);
  await expect(page.locator('.journal li', { hasText: 'Début de la scène 2' })).toHaveCount(1);
  await expect(page.locator('.journal li', { hasText: 'Intention de Vex (Brute)' })).toHaveCount(1);
  await onglet(page, 'Fiche');
  await expect(page.locator('[data-cle="fiche-fils-0-texte"]')).toHaveValue('Qui a trahi ?');

  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await page.locator('.liste-parties li', { hasText: 'Patrouille' }).getByRole('button', { name: 'Reprendre' }).click();
  for (const nom of ['Vaisseaux', 'Intentions', 'Journal']) await onglet(page, nom);
  await expect(page.locator('.journal li', { hasText: 'Rencontre de vaisseau' })).toHaveCount(1);
  expect(erreurs).toEqual([]);
});
