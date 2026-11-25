// Tests de non-régression pour les correctifs PWA, accessibilité, sécurité et règles.
import { test, expect, creerPartie, onglet, attendreHorsLigne, surveillerErreurs } from './outils.js';
import { demarrerServeur } from '../serveur.mjs';

test('fiche PNJ : changer le profil active « Intention » sans perdre le focus sur le select', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page);
  await onglet(page, 'Fiche');

  await page.locator('[data-cle="fiche-pnjs-ajout"]').click();
  const selectProfil = page.locator('[data-cle="fiche-pnjs-0-profil"]');
  const boutonIntention = page.locator('[data-cle="fiche-pnjs-0-intention"]');

  await expect(boutonIntention).toBeDisabled();
  await selectProfil.focus();
  await expect(selectProfil).toBeFocused();

  await selectProfil.selectOption('brute');
  await expect(boutonIntention).toBeEnabled();
  await expect(selectProfil).toBeFocused();
});

test('validation dans un <dialog> : erreur dans .dialogue-erreur[role="alert"] et retour du focus à la fermeture', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { mode: 'Duo', pjs: ['Ada', 'Bo'] });

  // Donne 1 omni-point à l'Oracle (2 dépenses PJ).
  for (const cle of ['tdb-omni-pj1', 'tdb-omni-pj2']) {
    await page.locator(`[data-cle="${cle}"]`).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dépenser 1 omni-point' }).click();
  }
  await page.locator('.dialogue-actions').getByRole('button', { name: 'Fermer' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Cas 1 : dialogue Omni-Oracle sur « Oui, mais… » sans réponse « Oui » à transformer.
  const declencheurOracle = page.locator('[data-cle="tdb-omni-oracle"]');
  await declencheurOracle.click();
  const dlgOracle = page.getByRole('dialog');
  await expect(dlgOracle).toBeVisible();
  await dlgOracle.getByText('Transformer « Oui » en « Oui, mais… »').click();
  await dlgOracle.getByRole('button', { name: 'Dépenser 1 omni-point' }).click();

  const erreurOracle = dlgOracle.locator('.dialogue-erreur[role="alert"]');
  await expect(erreurOracle).toBeVisible();
  await expect(erreurOracle).toContainText('Il n\'y a pas de réponse « Oui » à transformer.');

  await dlgOracle.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(declencheurOracle).toBeFocused();

  // Cas 2 : contestation en mode vrai dé avec saisie invalide.
  await page.locator('[data-cle="de-physique"]').check();
  const carteOracle = page.locator('section[aria-labelledby="titre-oracle"]');
  await carteOracle.getByLabel('Ton d20').fill('16');
  await page.locator('[data-cle="oracle-interroger"]').click();

  const declencheurContester = page.locator('[data-cle="oracle-contester"]');
  await declencheurContester.click();
  const dlgContester = page.getByRole('dialog');
  await expect(dlgContester).toBeVisible();
  await dlgContester.getByLabel('Ton d20').fill('25');
  await dlgContester.getByRole('button', { name: 'Contester (1 omni-point)' }).click();

  const erreurContester = dlgContester.locator('.dialogue-erreur[role="alert"]');
  await expect(erreurContester).toBeVisible();
  await expect(erreurContester).toContainText('1 à 20');

  await dlgContester.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(declencheurContester).toBeFocused();
});

test('import JSON corrompu rejeté (JSON invalide, pression hors bornes, pjs vide, id __proto__)', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await expect(page.locator('#titre-parties')).toBeVisible();

  const partieValide = () => ({
    format: 1,
    id: 'partie-test-import',
    univers: 'cyberpunk',
    mode: 'solo',
    pression: 3,
    mission: { numero: 1, nom: 'Test' },
    scene: { numero: 1, etat: 'preparation', prevue: '', alteration: null },
    pjs: [{ id: 'pj1', nom: 'Kei', omni: 3 }],
    oracle: { omni: 0, utilisationsJoueurs: 0 },
    journal: [],
    fiche: { fils: [], pnjs: [], menaces: [], lieux: [], scenes: [] },
  });

  const enveloppe = (partie) => JSON.stringify({
    application: 'Omni-Oracle',
    type: 'partie',
    version: '0.3.5',
    partie,
  });

  const pPression = partieValide();
  pPression.pression = 11;

  const pPjsVide = partieValide();
  pPjsVide.pjs = [];

  const protoJson = '{"application":"Omni-Oracle","type":"partie","version":"0.3.5","partie":{"format":1,"id":"__proto__","univers":"cyberpunk","mode":"solo","pression":3,"mission":{"numero":1,"nom":"Test"},"scene":{"numero":1,"etat":"preparation","prevue":"","alteration":null},"pjs":[{"id":"pj1","nom":"Kei","omni":3}],"oracle":{"omni":0,"utilisationsJoueurs":0},"journal":[],"fiche":{"fils":[],"pnjs":[],"menaces":[],"lieux":[],"scenes":[]}}}';

  const cas = [
    { nom: 'invalide.json', contenu: '{ pas du json', message: 'Ce fichier n\'est pas un fichier JSON lisible.' },
    { nom: 'pression.json', contenu: enveloppe(pPression), message: 'pression invalide' },
    { nom: 'pjs-vide.json', contenu: enveloppe(pPjsVide), message: 'liste des PJ abîmée' },
    { nom: 'proto.json', contenu: protoJson, message: 'identifiant ou contenu invalide' },
  ];

  for (const c of cas) {
    await page.locator('#fichier-import').setInputFiles({
      name: c.nom,
      mimeType: 'application/json',
      buffer: Buffer.from(c.contenu, 'utf8'),
    });
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('Import impossible');
    await expect(dlg).toContainText(c.message);
    await dlg.locator('.dialogue-actions').getByRole('button', { name: 'Fermer' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  await expect(page.getByText('Aucune partie enregistrée sur cet appareil.')).toBeVisible();
});

test('hors ligne : ouverture directe de guide.html dans un contexte neuf', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const contexte = await browser.newContext();
  try {
    const page = await contexte.newPage();
    const erreurs = surveillerErreurs(page);
    await page.goto(`${serveur.url}guide.html`);
    await attendreHorsLigne(page);

    await serveur.fermer();
    await contexte.setOffline(true);
    await page.reload();

    await expect(page.locator('h1')).toContainText('Guide d\'utilisation');
    await expect(page.locator('#sommaire')).toBeVisible();
    expect(erreurs).toEqual([]);
  } finally {
    await contexte.close();
    await serveur.fermer().catch(() => {});
  }
});

test('hors ligne : ouverture directe de livret.html dans un contexte neuf', async ({ browser }) => {
  const serveur = await demarrerServeur();
  const contexte = await browser.newContext();
  try {
    const page = await contexte.newPage();
    const erreurs = surveillerErreurs(page);
    await page.goto(`${serveur.url}livret.html?univers=cyberpunk`);
    await attendreHorsLigne(page);

    await serveur.fermer();
    await contexte.setOffline(true);
    await page.reload();

    await expect(page.locator('h1')).toHaveText('Oracle Omni-système — Cyberpunk');
    await expect(page.locator('.table-donnees').first()).toBeVisible();
    expect(erreurs).toEqual([]);
  } finally {
    await contexte.close();
    await serveur.fermer().catch(() => {});
  }
});

test('journal : double modification (« Oui » → « Oui, mais… » puis contestation) affiche les deux étapes distinctes', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { mode: 'Duo', pjs: ['Ada', 'Bo'] });

  // Donne 1 omni-point à l'Oracle (1 dépense de chaque PJ).
  for (const cle of ['tdb-omni-pj1', 'tdb-omni-pj2']) {
    await page.locator(`[data-cle="${cle}"]`).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dépenser 1 omni-point' }).click();
  }
  await page.locator('.dialogue-actions').getByRole('button', { name: 'Fermer' }).click();

  // Mode vrai dé pour obtenir « Oui » (16 sur incertain).
  await page.locator('[data-cle="de-physique"]').check();
  const carteOracle = page.locator('section[aria-labelledby="titre-oracle"]');
  await carteOracle.getByLabel('Ton d20').fill('16');
  await page.locator('[data-cle="oracle-interroger"]').click();
  await expect(carteOracle.locator('.resultat-titre')).toHaveText('Oui');

  // Étape 1 : l'Oracle transforme « Oui » en « Oui, mais… ».
  await page.locator('[data-cle="oracle-ouimais"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Transformer' }).click();
  await expect(carteOracle.locator('.resultat-titre')).toHaveText('Oui, mais…');

  // Étape 2 : Bo conteste et obtient « Non » (3 sur incertain).
  await page.locator('[data-cle="oracle-contester"]').click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Ton d20').fill('3');
  await dlg.getByRole('button', { name: 'Contester (1 omni-point)' }).click();
  await expect(carteOracle.locator('.resultat-titre')).toHaveText('Non');
  await expect(carteOracle).not.toContainText('L\'Oracle a transformé « Oui » en « Oui, mais… ».');

  // Vérification dans le journal des deux étapes distinctes.
  await onglet(page, 'Journal');
  const entreeOracle = page.locator('.journal li').filter({ hasText: 'Oracle :' });
  await expect(entreeOracle).toContainText('Oracle : Non');
  await expect(entreeOracle).toContainText('Transformée par l\'Oracle : Oui → Oui, mais…');
  await expect(entreeOracle).toContainText('Contestée par Bo : Oui, mais… → Non');
});
