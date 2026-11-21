// Résultats de table = suggestions : « Relancer », « Ignorer », « Afficher aux joueurs ».
// Réglage « Masquer les résultats (écran visible des joueurs) » : flou, révélé au toucher.
import { test, expect, creerPartie, onglet, surveillerErreurs, TELEPHONE } from './outils.js';

async function nouvellePartie(page, serveur) {
  await page.goto(serveur.url);
  await creerPartie(page);
}

async function reglages(page, cases) {
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  for (const [nom, coche] of Object.entries(cases)) await page.getByRole('dialog').getByLabel(nom).setChecked(coche);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('#annonce')).toHaveText('Réglages enregistrés.');
}

test('par défaut, les résultats s\'affichent normalement et le masquage est un simple réglage', async ({ page, serveur }) => {
  const erreurs = surveillerErreurs(page);
  await nouvellePartie(page, serveur);
  await page.getByRole('button', { name: /Menu/ }).click();
  await expect(page.getByRole('button', { name: /Mode assistant/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Réglages/ }).click();
  await expect(page.getByLabel('Masquer les résultats (écran visible des joueurs)')).not.toBeChecked();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.locator('#badge-mj')).toHaveCount(0);

  await onglet(page, 'Tables');
  await page.locator('summary').first().click();
  await page.locator('[data-cle="tables-T1-tirer"]').click();
  await expect(page.locator('.masque')).toHaveCount(0);
  await expect(page.locator('[data-table="T1"] .resultat')).toBeVisible();
  await expect(page.locator('[data-table="T1"] li.obtenue')).toHaveCount(1);
  expect(erreurs).toEqual([]);
});

test('masquer les résultats : flou, puis un toucher révèle', async ({ page, serveur }) => {
  await nouvellePartie(page, serveur);
  await reglages(page, { 'Masquer les résultats (écran visible des joueurs)': true });
  await onglet(page, 'Tables');
  await page.locator('summary').first().click();
  await page.locator('[data-cle="tables-T1-tirer"]').click();
  const bloc = page.locator('[data-table="T1"] .masquable');
  await expect(bloc).toHaveClass(/masque/);
  // Flouté, et la ligne tirée n'est pas signalée dans la liste.
  expect(await bloc.locator('.masquable-contenu').evaluate((e) => getComputedStyle(e).filter)).toContain('blur');
  await expect(page.locator('[data-table="T1"] li.obtenue')).toHaveCount(0);
  await page.getByRole('button', { name: 'Résultat masqué : toucher pour révéler' }).click();
  await expect(page.locator('[data-table="T1"] .masque')).toHaveCount(0);
  await expect(page.locator('[data-table="T1"] .resultat')).toBeVisible();
  await expect(page.locator('[data-table="T1"] li.obtenue')).toHaveCount(1);
  // Révélé : il le reste quand l'écran se redessine (ici, en passant par le journal).
  await onglet(page, 'Journal');
  await onglet(page, 'Tables');
  await expect(page.locator('[data-table="T1"] .masque')).toHaveCount(0);
});

test('Tables : relancer et ignorer laissent une trace barrée dans le journal', async ({ page, serveur }) => {
  await nouvellePartie(page, serveur);
  await onglet(page, 'Tables');
  await page.locator('summary').first().click();
  await page.locator('[data-cle="tables-T1-tirer"]').click();
  await page.locator('[data-cle="tables-T1-relancer"]').click();
  await page.locator('[data-cle="tables-T1-ignorer"]').click();
  await expect(page.locator('[data-table="T1"] .resultat')).toHaveCount(0);
  await expect(page.locator('#annonce')).toHaveText('Résultat ignoré.');
  await onglet(page, 'Journal');
  await expect(page.locator('.journal li.ecarte')).toHaveCount(2);
  await expect(page.locator('.journal li.ecarte .etiquette')).toHaveText(['ignoré par le MJ', 'relancé par le MJ']);
  expect(await page.locator('.journal li.ecarte .texte-ecarte').first().evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe('line-through');
});

test('Mission et PNJ : « Ignorer » libère la table, « Relancer » refait le tirage', async ({ page, serveur }) => {
  await nouvellePartie(page, serveur);
  await onglet(page, 'Mission');
  await page.getByRole('button', { name: 'Tirer toute la mission' }).click();
  await expect(page.locator('.tirage-texte')).toHaveCount(6);
  await page.locator('[data-cle="mission-T6-ignorer"]').click();
  await expect(page.locator('.tirage-texte')).toHaveCount(5);
  await expect(page.locator('[data-cle="mission-T6-tirer"]')).toBeVisible();
  // Verrouillé : ni « Relancer » ni « Ignorer ».
  await page.locator('[data-cle="mission-T1-verrou"]').click();
  await expect(page.locator('[data-cle="mission-T1-relancer"]')).toHaveCount(0);
  await expect(page.locator('[data-cle="mission-T1-ignorer"]')).toHaveCount(0);
  await page.locator('[data-cle="mission-T2-relancer"]').click();
  await onglet(page, 'Journal');
  // Journal du plus récent au plus ancien tirage : T6 (ignoré), puis T2 (relancé).
  await expect(page.locator('.journal li.ecarte .etiquette')).toHaveText(['ignoré par le MJ', 'relancé par le MJ']);

  await onglet(page, 'PNJ');
  await page.getByRole('button', { name: 'Tirer les trois' }).click();
  await expect(page.locator('.vue-pnj .tirage-texte')).toHaveCount(3);
  await page.locator('[data-cle="pnj-trait-ignorer"]').click();
  await expect(page.locator('.vue-pnj .tirage-texte')).toHaveCount(2);
  await page.locator('[data-cle="pnj-role-relancer"]').click();
  await expect(page.locator('.vue-pnj .tirage-texte')).toHaveCount(2);
});

test('complication de début de scène : relancer ou ignorer sans toucher au d20 d\'altération', async ({ page, serveur }) => {
  await nouvellePartie(page, serveur);
  await reglages(page, { 'J\'utilise mon vrai dé (je saisis le résultat)': true });
  await page.getByLabel('Ton d20 de scène').fill('2');
  await page.locator('[data-cle="scene-lancer"]').click();
  await expect(page.locator('.resultat-titre', { hasText: 'Scène modifiée' })).toBeVisible();
  const premiere = await page.locator('.vue-jouer .complication').first().textContent();
  await page.locator('[data-cle="scene-complication-relancer"]').click();
  await expect(page.locator('.resultat-titre', { hasText: 'Scène modifiée' })).toBeVisible();
  await expect(page.getByText('d20 = 2 (pair)', { exact: false })).toBeVisible();
  await page.locator('[data-cle="scene-complication-ignorer"]').click();
  await expect(page.getByText('Complication ignorée par le MJ : invente l\'élément, ou relance.')).toBeVisible();
  await expect(page.locator('[data-cle="scene-complication-ignorer"]')).toHaveCount(0);
  await page.locator('[data-cle="scene-complication-relancer"]').click();
  await expect(page.locator('.vue-jouer div.complication')).toHaveCount(1);
  await onglet(page, 'Journal');
  const debut = page.locator('.journal li', { hasText: 'Début de la scène 1' });
  await expect(debut.locator('.ancien')).toHaveCount(2);
  await expect(debut.locator('.ancien').first()).toHaveText(premiere.replace(/^.*?\(\d+\) : /, ''));
});

test('intention : « Relancer » garde le profil et les modificateurs', async ({ page, serveur }) => {
  await nouvellePartie(page, serveur);
  await onglet(page, 'Intentions');
  await page.getByText('Tacticien', { exact: true }).click();
  await page.locator('[data-cle="intention-blesse"]').check();
  await page.locator('[data-cle="intention-jouer"]').click();
  await expect(page.locator('.vue-intentions .resultat-detail')).toContainText('+ 4');
  // On change les cases : la relance garde celles du résultat écarté.
  await page.locator('[data-cle="intention-blesse"]').uncheck();
  await page.getByText('Brute', { exact: true }).click();
  await page.locator('[data-cle="intention-relancer"]').click();
  await expect(page.locator('.vue-intentions .resultat-detail')).toContainText('+ 4');
  await expect(page.locator('.vue-intentions .resultat .discret').first()).toContainText('Tacticien');
  await page.locator('[data-cle="intention-ignorer"]').click();
  await expect(page.locator('.vue-intentions .resultat')).toHaveCount(0);
  await onglet(page, 'Journal');
  await expect(page.locator('.journal li.ecarte .etiquette')).toHaveText(['ignoré par le MJ', 'relancé par le MJ']);
});

for (const [nom, taille] of [['tablette', { width: 800, height: 1280 }], ['téléphone', TELEPHONE]]) {
  test(`« Afficher aux joueurs » sur ${nom} : plein écran, très grand texte, un toucher ferme`, async ({ page, serveur }) => {
    await page.setViewportSize(taille);
    await nouvellePartie(page, serveur);
    await onglet(page, 'Tables');
    await page.locator('summary').first().click();
    await page.locator('[data-cle="tables-T1-tirer"]').click();
    const texte = (await page.locator('[data-table="T1"] .resultat p').nth(1).textContent()).trim();
    await page.locator('[data-cle="tables-T1-afficher"]').click();
    const dlg = page.locator('dialog.dialogue-joueurs');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('.affichage-texte')).toHaveText(texte);
    const boite = await dlg.boundingBox();
    expect(boite.width).toBe(taille.width);
    expect(boite.height).toBe(taille.height);
    const police = await dlg.locator('.affichage-texte').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(police).toBeGreaterThanOrEqual(28);
    // Pas de débordement horizontal du texte.
    expect(await dlg.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
    await dlg.click();
    await expect(dlg).toHaveCount(0);
    // Échap ferme aussi, et le focus revient sur le bouton.
    await page.locator('[data-cle="tables-T1-afficher"]').click();
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
    await expect(page.locator('[data-cle="tables-T1-afficher"]')).toBeFocused();
  });
}
