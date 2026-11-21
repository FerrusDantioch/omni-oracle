// Étape 3 : interface des nouveaux univers. Vocabulaire (« Quête », « Mystère »), onglet
// « Rencontres » (fantasy), fiche d'horreur (indices, suspects, chronologie), chocs et folie.
import { test, expect, creerPartie, onglet, surveillerErreurs, TELEPHONE } from './outils.js';

const ongletsVisibles = (page) => page.locator('#onglets .onglet').allTextContents();

async function vraiDe(page) {
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  await page.getByRole('dialog').getByLabel('J\'utilise mon vrai dé (je saisis le résultat)').check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#annonce')).toHaveText('Réglages enregistrés.');
}

const chocsDe = (page, pj) => page.locator(`[data-cle="fiche-${pj}-chocs-valeur"]`);
const folieDe = (page, pj) => page.locator(`[data-cle="fiche-${pj}-folie-valeur"]`);

test('vocabulaire : « Quête » en fantasy, « Mystère » en horreur, « Mission » ailleurs', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await page.getByText('Horreur / enquête', { exact: true }).click();
  await expect(page.getByLabel('Nom du mystère (facultatif)')).toBeVisible();
  await page.getByText('Fantasy', { exact: true }).click();
  await expect(page.getByLabel('Nom de la quête (facultatif)')).toBeVisible();
  await creerPartie(page, { univers: 'Fantasy', mission: '' });
  await expect(page.locator('#titre-app')).toHaveText('Quête sans nom');
  expect(await ongletsVisibles(page)).toEqual(['Jouer', 'Quête', 'PNJ', 'Intentions', 'Rencontres', 'Fiche', 'Tables', 'Journal']);
  await onglet(page, 'Quête');
  await expect(page.getByRole('heading', { name: 'Générer la quête' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tirer toute la quête' })).toBeVisible();
  await expect(page.getByRole('button', { name: '« La quête est-elle un succès ? »' })).toBeVisible();
  await page.getByRole('button', { name: 'Quête suivante' }).click();
  await expect(page.getByRole('dialog')).toContainText('Nom de la nouvelle quête (facultatif)');
  await page.getByRole('button', { name: 'Commencer la quête suivante' }).click();
  await expect(page.locator('#titre-app')).toHaveText('Quête sans nom (quête 2)');

  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'Mes parties' }).click();
  await creerPartie(page, { univers: 'Horreur / enquête', mission: 'La maison close' });
  expect(await ongletsVisibles(page)).toEqual(['Jouer', 'Mystère', 'PNJ', 'Intentions', 'Fiche', 'Tables', 'Journal']);
  await onglet(page, 'Mystère');
  await expect(page.getByRole('button', { name: 'Tirer tout le mystère' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mystère suivant' })).toBeVisible();
  await expect(page.getByRole('button', { name: '« L\'affaire est-elle résolue ? »' })).toBeVisible();
});

test('fantasy : onglet « Rencontres » (F1, F2), bande de brigands de 1d4+1', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Fantasy' });
  await onglet(page, 'Rencontres');
  await expect(page.getByRole('heading', { name: 'Rencontre', exact: true })).toBeVisible();
  await page.locator('[data-cle="vaisseau-type"]').selectOption('4');
  await expect(page.locator('.vue-vaisseaux .resultat')).toContainText('Brigands (bande de 1d4+1)');
  await expect(page.locator('.vue-vaisseaux .resultat')).toContainText(/Nombre : 1d4\+1 = [2-5]/);
  await page.locator('[data-cle="vaisseau-reaction"]').click();
  await expect(page.locator('[data-cle="oracle-question"]')).toHaveValue('Le groupe rencontré accepte la proposition ?');
  await onglet(page, 'Journal');
  await expect(page.locator('.journal li').first()).toContainText('Rencontre : Brigands');
  // Tables : F3 (salles de donjon) consultable et tirable ; F4 se joue dans « Intentions ».
  await onglet(page, 'Tables');
  await expect(page.locator('[data-table="F3"]')).toHaveCount(1);
  await expect(page.locator('[data-table="F4"]')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('horreur : rubriques de la fiche, indice noté depuis I1, intertitres de la table de folie', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Horreur / enquête', pjs: ['Ada'] });
  await onglet(page, 'Fiche');
  for (const titre of ['Indices trouvés', 'Suspects et témoins', 'Chronologie', 'Chocs et folie']) {
    await expect(page.getByRole('heading', { name: new RegExp(`^${titre}`) })).toBeVisible();
  }
  await page.getByRole('button', { name: '+ Ajouter un suspect ou un témoin' }).click();
  await expect(page.locator('[data-cle="fiche-suspects-0-attitude"]')).toHaveValue('neutre');
  await page.locator('[data-cle="fiche-suspects-0-cache"]').fill('Il était là cette nuit-là.');

  await onglet(page, 'Tables');
  await page.locator('[data-table="I1"] summary').click();
  await page.locator('[data-cle="tables-I1-tirer"]').click();
  const indice = (await page.locator('[data-table="I1"] .resultat p').nth(1).textContent()).trim();
  await page.locator('[data-cle="tables-I1-noter"]').click();
  await expect(page.locator('#annonce')).toHaveText('Noté dans « Indices trouvés » (fiche de suivi).');
  await page.locator('[data-table="folie"] summary').click();
  await expect(page.locator('[data-table="folie"] li.intertitre')).toHaveText([
    'CHOC IMMÉDIAT — 1-7 · dure jusqu\'à la fin de la scène sauf indication',
    'TRAUMATISME MARQUANT — 8-14 · dure jusqu\'à la fin de la session sauf indication',
    'FRACTURE MENTALE — 15-20 · conséquences durables, à discuter avec le MJ',
  ]);
  await expect(page.locator('[data-table="folie"] li:not(.intertitre)')).toHaveCount(20);

  await onglet(page, 'Fiche');
  await expect(page.locator('[data-cle="fiche-indices-0-texte"]')).toHaveValue(indice);
  await expect(page.locator('[data-cle="fiche-suspects-0-cache"]')).toHaveValue('Il était là cette nuit-là.');
  expect(erreurs).toEqual([]);
});

test('horreur : C1 donne des chocs, alerte à 5, conversion en point de folie avec le jet', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Horreur / enquête', pjs: ['Ada'] });
  await onglet(page, 'Tables');
  await page.locator('[data-table="C1"] summary').click();
  await page.locator('[data-cle="tables-C1-tirer"]').click();
  await expect(page.locator('[data-table="C1"] .rappel-choc')).toHaveText('Rappel : 1 point de choc (2 si l\'événement est particulièrement atroce).');
  await page.locator('[data-cle="tables-C1-choc-pj1-2"]').click();
  await page.locator('[data-cle="tables-C1-choc-pj1-2"]').click();
  await expect(page.locator('[data-cle="tdb-chocs-pj1"]')).toContainText('4 chocs');
  await page.locator('[data-cle="tables-C1-choc-pj1-1"]').click();
  // Alerte « 5 chocs = 1 point de folie ».
  const alerte = page.getByRole('dialog');
  await expect(alerte.getByRole('heading')).toHaveText('5 chocs = 1 point de folie');
  await alerte.getByRole('button', { name: 'Plus tard' }).click();
  await expect(page.locator('[data-cle="tdb-chocs-pj1"]')).toHaveClass(/alerte/);
  await page.locator('[data-cle="tdb-chocs-pj1"]').click();
  await expect(page.locator('#fiche-chocs')).toBeVisible();
  await expect(chocsDe(page, 'pj1')).toHaveText('5');
  await page.locator('[data-cle="fiche-pj1-convertir"]').click();
  await expect(chocsDe(page, 'pj1')).toHaveText('0');
  await expect(folieDe(page, 'pj1')).toHaveText('1');
  const effet = page.locator('#fiche-chocs .resultat');
  await expect(effet).toContainText('Effets de folie · d20 :');
  await expect(effet.locator('.resultat-titre')).not.toBeEmpty();
  await page.locator('[data-cle="folie-pj1-sequelle"]').click();
  await expect(page.locator('[data-cle="fiche-pj1-sequelles"]')).not.toHaveValue('');
  await onglet(page, 'Journal');
  await expect(page.locator('.journal li').first()).toContainText('Ada gagne 1 point de folie · Effets de folie');
  expect(erreurs).toEqual([]);
});

test('horreur, vrai dé : effet 11 (+1 choc à l\'allié) et option « la folie s\'aggrave »', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Horreur / enquête', mode: 'Duo', pjs: ['Ada', 'Bo'] });
  await vraiDe(page);
  await onglet(page, 'Fiche');
  for (let i = 0; i < 5; i++) await page.locator('[data-cle="fiche-pj1-chocs-plus"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Plus tard' }).click();
  await page.getByLabel('Ton d20 de folie (Ada)').fill('11');
  await page.locator('[data-cle="fiche-pj1-convertir"]').click();
  await expect(page.locator('#fiche-chocs .resultat-titre')).toHaveText('Transfert de peur');
  await expect(page.locator('#fiche-chocs .resultat')).toContainText('TRAUMATISME MARQUANT — 8-14');
  await expect(page.locator('[data-cle="folie-pj1-allie-choc-pj1-1"]')).toHaveCount(0);
  await page.locator('[data-cle="folie-pj1-allie-choc-pj2-1"]').click();
  await expect(chocsDe(page, 'pj2')).toHaveText('1');

  // Option décochée par défaut ; cochée : 1d20 + points de folie (Bo en a 1 → 20 + 1 = 21).
  const option = page.locator('[data-cle="folie-aggravation"]');
  await expect(option).not.toBeChecked();
  await option.check();
  await page.locator('[data-cle="fiche-pj2-folie-plus"]').click();
  await expect(folieDe(page, 'pj2')).toHaveText('1');
  for (let i = 0; i < 4; i++) await page.locator('[data-cle="fiche-pj2-chocs-plus"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Plus tard' }).click();
  await page.getByLabel('Ton d20 de folie (Bo)').fill('19');
  await page.locator('[data-cle="fiche-pj2-convertir"]').click();
  await expect(folieDe(page, 'pj2')).toHaveText('2');
  const effetBo = page.locator('.ligne-chocs').filter({ has: page.getByRole('heading', { name: 'Bo', exact: true }) }).locator('.resultat');
  await expect(effetBo).toContainText('d20 : 19 + 2 (points de folie) = 21');
  await expect(effetBo.locator('.resultat-titre')).toHaveText('Crise de folie passagère');
});

test('horreur : M1 « Terrorise » propose +1 choc', async ({ page, serveur }) => {
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Horreur / enquête', pjs: ['Ada'] });
  await vraiDe(page);
  await onglet(page, 'Intentions');
  await page.getByText('Prédateur', { exact: true }).click();
  await page.getByLabel('Ton d20').fill('14');
  await page.locator('[data-cle="intention-jouer"]').click();
  await expect(page.locator('.vue-intentions .resultat-titre')).toHaveText('Terrorise : 1 point de choc à une cible, sans attaque');
  await page.locator('[data-cle="intention-choc-pj1-1"]').click();
  await expect(page.locator('[data-cle="tdb-chocs-pj1"]')).toContainText('1 choc');
  await page.getByLabel('Ton d20').fill('2');
  await page.locator('[data-cle="intention-jouer"]').click();
  await expect(page.locator('[data-cle="intention-choc-pj1-1"]')).toHaveCount(0);
});

test('horreur sur téléphone : fiche et chocs sans débordement, cibles de 44 px', async ({ page, serveur }) => {
  await page.setViewportSize(TELEPHONE);
  await page.goto(serveur.url);
  await creerPartie(page, { univers: 'Horreur / enquête', mode: 'Duo', pjs: ['Ada', 'Bo'] });
  await onglet(page, 'Fiche');
  for (let i = 0; i < 5; i++) await page.locator('[data-cle="fiche-pj1-chocs-plus"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Plus tard' }).click();
  await page.locator('[data-cle="fiche-pj1-convertir"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const petits = await page.locator('#contenu button:visible, #tableau-de-bord button:visible').evaluateAll((bs) => bs
    .map((b) => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width }))
    .filter((b) => b.h < 44 || b.w < 44));
  expect(petits).toEqual([]);
});
