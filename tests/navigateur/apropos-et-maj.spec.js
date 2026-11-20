// « À propos » (contenu, ordre, valeurs venant de config.js), aide à l'installation,
// et bouton « Mettre à jour » qui n'apparaît que lorsqu'une mise à jour est prête.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, attendreHorsLigne } from './outils.js';
import { demarrerServeur, racine } from '../serveur.mjs';

test('À propos : tout le contenu, dans l\'ordre demandé', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  const config = await page.evaluate(() => ({ ...self.CONFIG_APP }));
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'À propos' }).click();
  const zone = page.locator('.apropos');
  await expect(zone.locator('img.apropos-logo')).toBeVisible();
  const textes = await zone.locator(':scope > *').evaluateAll((els) => els.map((e) => e.tagName === 'IMG' ? '[logo]' : e.textContent.trim()));
  expect(textes).toEqual([
    '[logo]',
    config.nom,
    `Version ${config.version}`,
    `Application réalisée par ${config.auteur}, avec l'aide de l'intelligence artificielle.`,
    `© 2026 ${config.auteur} — Creative Commons BY-NC-ND 4.0 : partage autorisé en citant l'auteur, sans usage commercial ni modification.`,
    'Cette licence couvre le code de l\'application. Les règles, les tables et les textes de l\'Omni-système restent tous droits réservés.',
    'Tes parties restent sur cet appareil. Aucun compte, aucune donnée envoyée.',
    `Une idée, une remarque, un souci ? Tes retours sont les bienvenus : ${config.contact}`,
    'Découvrir l\'Omni-système',
  ]);
  await expect(zone.getByRole('link', { name: 'Creative Commons BY-NC-ND 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr');
  await expect(zone.getByRole('link', { name: config.contact })).toHaveAttribute('href', `mailto:${config.contact}`);
  await expect(zone.getByRole('link', { name: 'Découvrir l\'Omni-système' })).toHaveAttribute('href', config.siteOmni);
  // Valeurs attendues du kit
  expect(config.auteur).toBe('Ferrus Dantioch');
  expect(config.contact).toBe('omni-systeme.choking513@passmail.net');
  expect(config.siteOmni).toBe('https://ferrusdantioch.github.io/omni-systeme/');
  expect(config.idStockage).toBe('oracle');
});

test('aide à l\'installation : Chrome Android et Brave sont mentionnés', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Installer l\'application' }).click();
  await expect(page.getByText(/sur Chrome Android, une seule application de ce site peut s'installer/)).toBeVisible();
  await expect(page.getByText(/Brave : il installe chaque application indépendamment/)).toBeVisible();
});

test('« Mettre à jour » : caché, puis visible quand une nouvelle version est publiée', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const contexte = await browser.newContext();
  const page = await contexte.newPage();
  await page.goto(serveur.url);
  await attendreHorsLigne(page);
  const bouton = page.locator('#bouton-maj');
  await expect(bouton).toBeHidden();

  // On « publie » une nouvelle version : seule la version de config.js change.
  const config = fs.readFileSync(path.join(racine, 'js/config.js'), 'utf8');
  serveur.remplacer('js/config.js', config.replace(/version: '[^']+'/, "version: '99.0.0'"));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await expect(bouton).toBeVisible({ timeout: 15_000 });
  // Tant qu'on ne touche pas le bouton, rien ne change.
  expect(await page.evaluate(() => self.CONFIG_APP.version)).not.toBe('99.0.0');

  await Promise.all([page.waitForEvent('load'), bouton.click()]);
  expect(await page.evaluate(() => self.CONFIG_APP.version)).toBe('99.0.0');
  await expect(page.locator('#bouton-maj')).toBeHidden();
  // Seule la nouvelle copie de l'application reste (préfixe propre à l'Oracle).
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['oracle-v99.0.0']);
  await contexte.close();
  await serveur.fermer();
});
