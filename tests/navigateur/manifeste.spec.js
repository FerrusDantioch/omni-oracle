// Identité de l'application installable, telle que Chromium (donc Brave, Chrome, Edge) la calcule.
// On imite l'adresse réelle : l'Oracle servi dans le sous-dossier /omni-oracle/ d'un site
// qui héberge d'autres applications (comme ferrusdantioch.github.io).
import { test, expect } from './outils.js';

test('identité et portée propres au dossier /omni-oracle/, application installable', async ({ browser, serveur }) => {
  const contexte = await browser.newContext();
  await contexte.route('http://site.test/**', async (route) => {
    const chemin = new URL(route.request().url()).pathname.replace(/^\/omni-oracle\//, '/');
    const r = await fetch(serveur.url.replace(/\/$/, '') + chemin);
    await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
  });
  const page = await contexte.newPage();
  await page.goto('http://site.test/omni-oracle/');
  await expect(page.locator('#titre-nouvelle')).toBeVisible();
  const cdp = await contexte.newCDPSession(page);
  const { manifest, errors } = await cdp.send('Page.getAppManifest');
  expect(errors).toEqual([]);
  // Si l'id valait « ./ », Chromium calculerait « http://site.test/ » : la même identité que
  // toute autre application du site qui ferait pareil (conflit vécu avec omni-time dans Brave).
  expect(manifest.id).toBe('http://site.test/omni-oracle/');
  expect(manifest.scope).toBe('http://site.test/omni-oracle/');
  expect(manifest.startUrl).toBe('http://site.test/omni-oracle/');
  await contexte.close();
});

test('aucune erreur d\'installation (critères de Chromium)', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
});
