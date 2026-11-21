// Thèmes (Omni, Sombre, Clair, Auto), contrastes 4,5:1, focus visible, animations réduites.
import { test, expect, creerPartie, onglet } from './outils.js';

const THEMES = ['omni', 'sombre', 'clair'];

/** Calcule, dans la page, les rapports de contraste (formule WCAG). */
const OUTILS_CONTRASTE = () => {
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

async function choisirTheme(page, theme) {
  await page.addInitScript((t) => {
    localStorage.setItem('oracle-reglages', JSON.stringify({ theme: t }));
  }, theme);
  // Outils de calcul injectés dans la page (la CSP de l'application interdit eval).
  await page.addInitScript(`window.__contraste = (${OUTILS_CONTRASTE.toString()})();`);
}

/** Textes affichés dont le contraste est sous 4,5:1 (formule WCAG), préfixés par `ou`. */
async function fautesDeContraste(page, ou) {
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

for (const theme of THEMES) {
  test(`thème ${theme} : appliqué avant l'affichage`, async ({ page, serveur }) => {
    await choisirTheme(page, theme);
    // On regarde l'attribut dès que le HTML est lu, avant le script de l'application.
    await page.route('**/js/app.js', (route) => route.abort());
    await page.goto(serveur.url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const fondBody = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const fondTheme = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.backgroundColor = 'var(--fond)';
      document.body.append(d);
      return getComputedStyle(d).backgroundColor;
    });
    expect(fondBody).toBe(fondTheme);
  });

  test(`thème ${theme} : couples de couleurs ≥ 4,5:1`, async ({ page, serveur }) => {
    await choisirTheme(page, theme);
    await page.goto(serveur.url);
    const resultats = await page.evaluate(() => {
      const { vers, ratio } = window.__contraste;
      const v = (nom) => {
        const d = document.createElement('div');
        d.style.color = `var(--${nom})`;
        document.body.append(d);
        const c = vers(getComputedStyle(d).color);
        d.remove();
        return c;
      };
      const paires = [
        ['texte', 'fond'], ['texte', 'surface'], ['discret', 'fond'], ['discret', 'surface'],
        ['accent-texte', 'accent'], ['danger-texte', 'danger'], ['halo', 'surface'], ['halo', 'fond'],
        ['texte', 'accent-doux'], ['texte', 'survol'], ['discret', 'survol'], ['fond', 'texte'],
      ];
      return paires.map(([a, b]) => ({ paire: `${a}/${b}`, ratio: ratio(v(a), v(b)) }));
    });
    for (const r of resultats) expect.soft(r.ratio, r.paire).toBeGreaterThanOrEqual(4.5);
  });

  test(`thème ${theme} : tout texte affiché a un contraste ≥ 4,5:1`, async ({ page, serveur }) => {
    await choisirTheme(page, theme);
    await page.goto(serveur.url);
    await creerPartie(page, { univers: 'Space opéra', mode: 'Duo', pjs: ['Ysa', 'Tarn'] });
    await page.getByRole('button', { name: 'Lancer le d20 de scène' }).click();
    await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
    const fautes = [];
    const verifier = async (ou) => { fautes.push(...await fautesDeContraste(page, ou)); };
    await verifier('Jouer');
    for (const nom of ['Mission', 'Vaisseaux', 'Tables', 'Journal']) {
      await onglet(page, nom);
      if (nom === 'Mission') await page.getByRole('button', { name: 'Tirer toute la mission' }).click();
      if (nom === 'Vaisseaux') await page.getByRole('button', { name: 'Nouvelle rencontre' }).click();
      if (nom === 'Tables') { await page.locator('summary').first().click(); await page.locator('[data-cle="tables-T1-tirer"]').click(); }
      await verifier(nom);
      if (nom === 'Tables') {
        await page.locator('[data-cle="tables-T1-afficher"]').click();
        await verifier('Afficher aux joueurs');
        await page.keyboard.press('Escape');
      }
    }
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('button', { name: /Réglages/ }).click();
    await verifier('Réglages');
    // Résultat masqué : l'étiquette « toucher pour révéler » reste lisible sur le flou.
    await page.getByRole('dialog').getByLabel('Masquer les résultats (écran visible des joueurs)').check();
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await onglet(page, 'Tables');
    await page.locator('[data-cle="tables-T1-tirer"]').click();
    await expect(page.locator('.masque')).toHaveCount(1);
    await verifier('Résultat masqué');
    expect(fautes).toEqual([]);
  });
}

test('thème Auto : suit le réglage de l\'appareil (sombre → Omni, clair → Clair)', async ({ page, serveur }) => {
  await choisirTheme(page, 'auto');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(serveur.url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'omni');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'clair');
});

test('changer de thème dans les réglages, puis recharger', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'omni'); // par défaut
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  await page.locator('.choix-texte', { hasText: 'Clair' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'clair'); // aperçu immédiat
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Réglages enregistrés.')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'clair');
});

test('contour de focus visible au clavier', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await page.keyboard.press('Tab'); // lien d'évitement
  await page.keyboard.press('Tab');
  const contour = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return { style: s.outlineStyle, largeur: parseFloat(s.outlineWidth) };
  });
  expect(contour.style).not.toBe('none');
  expect(contour.largeur).toBeGreaterThanOrEqual(2);
});

test('« réduire les animations » est respecté', async ({ page, serveur }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(serveur.url);
  await creerPartie(page);
  await page.getByRole('button', { name: 'Interroger l\'oracle' }).click();
  const duree = await page.locator('.resultat').first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(duree).toBeLessThan(0.01);
});

test('luminosité : appliquée à la page et aux fenêtres, gardée après rechargement, jamais à l\'impression', async ({ page, serveur }) => {
  const erreurs = [];
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.goto(serveur.url);
  // Par défaut : 100 %, aucun filtre.
  await expect(page.locator('html')).not.toHaveAttribute('data-luminosite', /.*/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).filter)).toBe('none');
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  await page.getByLabel(/Luminosité de l'écran/).fill('60');
  await expect(page.locator('#valeur-lum')).toHaveText('60 %');
  await expect(page.locator('html')).toHaveAttribute('data-luminosite', '60');
  expect(await page.locator('dialog').evaluate((d) => getComputedStyle(d).filter)).toBe('brightness(0.6)');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Réglages enregistrés.')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-luminosite', '60');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).filter)).toBe('brightness(0.6)');
  await page.emulateMedia({ media: 'print' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).filter)).toBe('none');
  expect(erreurs).toEqual([]); // aucune violation de la CSP
});

test('luminosité : « Annuler » rétablit la luminosité précédente', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  await page.getByLabel(/Luminosité de l'écran/).fill('50');
  await expect(page.locator('html')).toHaveAttribute('data-luminosite', '50');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-luminosite', /.*/);
});

for (const theme of THEMES) {
  test(`thème ${theme} : contrastes des écrans de l'horreur (chocs, folie) et de la fantasy`, async ({ page, serveur }) => {
    await choisirTheme(page, theme);
    await page.goto(serveur.url);
    await creerPartie(page, { univers: 'Horreur / enquête', mode: 'Duo', pjs: ['Ada', 'Bo'] });
    const fautes = [];
    // Rappel de sauvegarde (bandeau après 5 scènes sans export).
    for (let i = 0; i < 5; i++) {
      await page.locator('.vue-jouer [data-cle="scene-terminer"]').first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Terminer la scène' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(page.locator('.rappel-sauvegarde')).toBeVisible();
    fautes.push(...await fautesDeContraste(page, 'Rappel de sauvegarde'));
    await onglet(page, 'Fiche');
    for (let i = 0; i < 5; i++) await page.locator('[data-cle="fiche-pj1-chocs-plus"]').click();
    fautes.push(...await fautesDeContraste(page, 'Alerte'));
    await page.getByRole('dialog').getByRole('button', { name: 'Plus tard' }).click();
    fautes.push(...await fautesDeContraste(page, 'Fiche (alerte)'));
    await page.locator('[data-cle="fiche-pj1-convertir"]').click();
    fautes.push(...await fautesDeContraste(page, 'Fiche (folie)'));
    await onglet(page, 'Tables');
    await page.locator('[data-table="folie"] summary').click();
    await page.locator('[data-table="C1"] summary').click();
    await page.locator('[data-cle="tables-C1-tirer"]').click();
    await page.locator('[data-table="M1"] summary').click();
    fautes.push(...await fautesDeContraste(page, 'Tables'));
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('button', { name: 'Mes parties' }).click();
    await creerPartie(page, { univers: 'Fantasy' });
    await onglet(page, 'Rencontres');
    await page.getByRole('button', { name: 'Nouvelle rencontre' }).click();
    fautes.push(...await fautesDeContraste(page, 'Rencontres'));
    expect(fautes).toEqual([]);
  });
}
