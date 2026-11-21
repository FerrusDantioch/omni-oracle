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
  await page.getByLabel(/^Nom (de la|du) \S+ \(facultatif\)$/).fill(mission);
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

// --- Thèmes et contrastes (partagés par themes.spec.js et guide.spec.js) -------------------

/** Calcule, dans la page, les rapports de contraste (formule WCAG). */
export const OUTILS_CONTRASTE = () => {
  const vers = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // Fond réellement visible derrière un élément (on remonte jusqu'à un fond opaque).
  const fond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = vers(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0.5) return c;
    }
    return vers(getComputedStyle(document.body).backgroundColor);
  };
  return { vers, ratio, fond };
};

export async function choisirTheme(page, theme) {
  await page.addInitScript((t) => {
    localStorage.setItem('oracle-reglages', JSON.stringify({ theme: t }));
  }, theme);
  // Outils de calcul injectés dans la page (la CSP de l'application interdit eval).
  await page.addInitScript(`window.__contraste = (${OUTILS_CONTRASTE.toString()})();`);
}

/** Textes affichés dont le contraste est sous 4,5:1 (formule WCAG), préfixés par `ou`. */
export async function fautesDeContraste(page, ou) {
  const f = await page.evaluate(() => {
    const { vers, ratio, fond } = window.__contraste;
    const res = [];
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (marcheur.nextNode()) {
      const n = marcheur.currentNode;
      const el = n.parentElement;
      if (!n.textContent.trim() || !el || el.closest('[hidden], [aria-hidden="true"], .annonce, option')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      if (el.closest('button:disabled, input:disabled')) continue; // éléments désactivés : hors norme
      const rapport = ratio(vers(getComputedStyle(el).color), fond(el));
      if (rapport < 4.5) res.push(`« ${n.textContent.trim().slice(0, 40)} » : ${rapport.toFixed(2)}`);
    }
    return res;
  });
  return f.map((x) => `${ou} ${x}`);
}
