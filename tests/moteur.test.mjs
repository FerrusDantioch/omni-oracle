// Tests du moteur de règles (js/moteur.js).
// Lancement : node --test tests/   (ou : npm run test:moteur)
//
// Chaque test impose les valeurs des dés (« dés truqués ») pour vérifier un cas précis.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../js/moteur.js';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => JSON.parse(fs.readFileSync(path.join(racine, f), 'utf8'));
const index = lire('data/univers.json');
const commun = lire(index.commun);
const univers = index.univers.map(lire);
const cat = M.creerCatalogue(commun, univers);
const cyber = cat.univ('cyberpunk');
const space = cat.univ('space-opera');

/** Dés truqués : renvoie les valeurs dans l'ordre, et échoue s'il en manque. */
function des(...valeurs) {
  const reste = [...valeurs];
  const f = (faces) => {
    if (!reste.length) throw new Error('Plus de dés truqués disponibles');
    const v = reste.shift();
    if (v < 1 || v > faces) throw new Error(`Valeur ${v} impossible sur un d${faces}`);
    return v;
  };
  f.restants = () => reste.length;
  return f;
}

const question = (v, ...valeurs) => M.interrogerOracle(commun, { vraisemblance: v, de: des(...valeurs) });

// ---------------------------------------------------------------------------
describe('Lancer de d20', () => {
  test('avantage : on garde le meilleur des deux', () => {
    const j = M.lancerD20({ mode: 'avantage', de: des(4, 17) });
    assert.deepEqual(j.des, [4, 17]);
    assert.equal(j.naturel, 17);
  });
  test('désavantage : on garde le pire des deux', () => {
    const j = M.lancerD20({ mode: 'desavantage', de: des(4, 17) });
    assert.equal(j.naturel, 4);
  });
  test('modificateur manuel ajouté au dé gardé', () => {
    const j = M.lancerD20({ mode: 'avantage', modificateur: -2, de: des(9, 12) });
    assert.equal(j.total, 10);
  });
  test('saisie d\'un dé physique', () => {
    const j = M.lancerD20({ des: [13], modificateur: 1 });
    assert.equal(j.total, 14);
    assert.throws(() => M.lancerD20({ des: [21] }));
    assert.throws(() => M.lancerD20({ des: [0] }));
    assert.throws(() => M.lancerD20({ mode: 'avantage', des: [12] }), /2 valeur/);
  });
  test('le dé aléatoire reste entre 1 et 20 et sort toutes les faces', () => {
    const vus = new Set();
    for (let i = 0; i < 4000; i++) {
      const v = M.deAleatoire(20);
      assert.ok(Number.isInteger(v) && v >= 1 && v <= 20);
      vus.add(v);
    }
    assert.equal(vus.size, 20);
  });
  test('formule 1d4+1 : de 2 à 5', () => {
    assert.equal(M.lancerFormule('1d4+1', des(1)).total, 2);
    assert.equal(M.lancerFormule('1d4+1', des(4)).total, 5);
  });
});

// ---------------------------------------------------------------------------
describe('Oracle de question : les 6 degrés', () => {
  const cas = [
    [2, 'non'], [7, 'non'], [8, 'non-mais'], [10, 'non-mais'],
    [11, 'oui-mais'], [13, 'oui-mais'], [14, 'oui'], [19, 'oui'],
  ];
  for (const [valeur, attendu] of cas) {
    test(`incertain, d20 = ${valeur} → ${attendu}`, () => {
      assert.equal(question('incertain', valeur).reponse, attendu);
    });
  }
  test('1 naturel → Non, et… ; 20 naturel → Oui, et…', () => {
    assert.equal(question('incertain', 1).reponse, 'non-et');
    assert.equal(question('incertain', 20).reponse, 'oui-et');
  });
});

describe('Oracle : 1 et 20 naturels l\'emportent sur les modificateurs', () => {
  test('probable (+3) avec un 1 naturel → toujours Non, et…', () => {
    const r = question('probable', 1);
    assert.equal(r.jet.total, 4);
    assert.equal(r.reponse, 'non-et');
  });
  test('improbable (−3) avec un 20 naturel → toujours Oui, et…', () => {
    const r = question('improbable', 20);
    assert.equal(r.jet.total, 17);
    assert.equal(r.reponse, 'oui-et');
  });
  test('très probable (avantage) 1 et 1 → Non, et…', () => {
    assert.equal(question('tres-probable', 1, 1).reponse, 'non-et');
  });
  test('très probable (avantage) 1 et 15 → on garde 15, pas de 1 naturel → Oui', () => {
    const r = question('tres-probable', 1, 15);
    assert.equal(r.jet.naturel, 15);
    assert.equal(r.reponse, 'oui');
  });
  test('très improbable (désavantage) 20 et 5 → on garde 5 → Non', () => {
    assert.equal(question('tres-improbable', 20, 5).reponse, 'non');
  });
  test('très improbable (désavantage) 20 et 20 → Oui, et…', () => {
    assert.equal(question('tres-improbable', 20, 20).reponse, 'oui-et');
  });
});

describe('Oracle : modificateurs −3 et +3', () => {
  test('improbable : 4 − 3 = 1 → Non, et… (par le total, sans 1 naturel)', () => {
    const r = question('improbable', 4);
    assert.equal(r.jet.total, 1);
    assert.equal(r.naturel, false);
    assert.equal(r.reponse, 'non-et');
  });
  test('improbable : 5 − 3 = 2 → Non', () => assert.equal(question('improbable', 5).reponse, 'non'));
  test('improbable : 16 − 3 = 13 → Oui, mais…', () => assert.equal(question('improbable', 16).reponse, 'oui-mais'));
  test('probable : 17 + 3 = 20 → Oui, et… (par le total)', () => assert.equal(question('probable', 17).reponse, 'oui-et'));
  test('probable : 16 + 3 = 19 → Oui', () => assert.equal(question('probable', 16).reponse, 'oui'));
  test('probable : 4 + 3 = 7 → Non', () => assert.equal(question('probable', 4).reponse, 'non'));
  test('probable : 5 + 3 = 8 → Non, mais…', () => assert.equal(question('probable', 5).reponse, 'non-mais'));
  test('complication mineure pour Oui, mais… et majeure pour Non, et…', () => {
    assert.equal(question('incertain', 12).complication, 'mineure');
    assert.equal(question('incertain', 1).complication, 'majeure');
    assert.equal(question('incertain', 15).complication, null);
  });
});

// ---------------------------------------------------------------------------
describe('Pression et paliers', () => {
  test('départ à 3, palier Vigilance, 15 % d\'altération', () => {
    const p = M.creerPartie(commun, cyber, { pjs: [{ nom: 'Kei' }] });
    assert.equal(p.pression, 3);
    const pal = M.palier(commun, p.pression);
    assert.equal(pal.nom, 'Vigilance');
    assert.equal(pal.chance, 15);
  });
  test('les cinq paliers', () => {
    const noms = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => M.palier(commun, v).nom);
    assert.deepEqual(noms, ['Calme', 'Calme', 'Vigilance', 'Vigilance', 'Tension', 'Tension', 'Étau', 'Étau', 'Rupture', 'Rupture']);
    assert.equal(M.palier(commun, 10).chance, 50);
  });
  test('bornes 0 et 10', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 0;
    M.terminerScene(commun, p, 'subi');
    assert.equal(p.pression, 0);
    p.pression = 10;
    M.ajusterPression(commun, p, +1);
    assert.equal(p.pression, 10);
  });
  test('fin de scène : +1 si le PJ avait la main, −1 s\'il a subi, 0 sinon', () => {
    const p = M.creerPartie(commun, cyber);
    assert.equal(M.terminerScene(commun, p, 'main').apres, 4);
    assert.equal(M.terminerScene(commun, p, 'subi').apres, 3);
    assert.equal(M.terminerScene(commun, p, 'neutre').apres, 3);
    assert.equal(p.scene.numero, 4);
  });
  test('la Pression ne bouge qu\'une fois par scène', () => {
    const p = M.creerPartie(commun, cyber);
    const r1 = M.ajusterPression(commun, p, +1);
    assert.equal(r1.dejaBougee, false);
    const r2 = M.ajusterPression(commun, p, +1);
    assert.equal(r2.dejaBougee, true); // signalé à l'écran
    const fin = M.terminerScene(commun, p, 'main');
    assert.equal(fin.raison, 'deja-bougee');
    assert.equal(fin.apres, 5);
    // scène suivante : elle peut de nouveau bouger
    assert.equal(M.terminerScene(commun, p, 'main').apres, 6);
  });
});

describe('Scènes altérées', () => {
  const comp = cat.table('cyberpunk', 'C');
  test('d20 ≤ Pression et pair → scène modifiée, complication tirée', () => {
    const p = M.creerPartie(commun, cyber); // Pression 3
    const r = M.debuterScene(commun, p, { prevue: 'Je rencontre le fixeur', complications: comp, de: des(2, 7) });
    assert.equal(r.alteree, true);
    assert.equal(r.type, 'modifiee');
    assert.equal(r.complication.valeur, 7);
    assert.match(r.complication.ligne.texte, /coupure de courant/);
  });
  test('d20 ≤ Pression et impair → scène interrompue', () => {
    const p = M.creerPartie(commun, cyber);
    const r = M.debuterScene(commun, p, { complications: comp, de: des(3, 1) });
    assert.equal(r.type, 'interrompue');
  });
  test('d20 = Pression + 1 → scène jouée comme prévu', () => {
    const p = M.creerPartie(commun, cyber);
    const r = M.debuterScene(commun, p, { complications: comp, de: des(4) });
    assert.equal(r.alteree, false);
    assert.equal(r.complication, null);
  });
  test('Pression 0 : jamais altérée', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 0;
    assert.equal(M.debuterScene(commun, p, { de: des(1) }).alteree, false);
  });
  test('saisie d\'un dé physique pour l\'altération', () => {
    const p = M.creerPartie(commun, cyber);
    assert.equal(M.debuterScene(commun, p, { des: 2, complications: comp, de: des(20) }).type, 'modifiee');
  });
});

describe('Soupape à 10', () => {
  const comp = cat.table('cyberpunk', 'C');
  test('Pression 10 : scène altérée même avec un 20 (pair → modifiée)', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 10;
    const r = M.debuterScene(commun, p, { complications: comp, de: des(20, 5) });
    assert.equal(r.soupape, true);
    assert.equal(r.alteree, true);
    assert.equal(r.type, 'modifiee');
  });
  test('Pression 10 avec un 15 → interrompue', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 10;
    assert.equal(M.debuterScene(commun, p, { de: des(15) }).type, 'interrompue');
  });
  test('fin de la scène de soupape : retour à 7, quelle que soit l\'issue', () => {
    for (const issue of ['main', 'subi', 'neutre']) {
      const p = M.creerPartie(commun, cyber);
      p.pression = 10;
      M.debuterScene(commun, p, { de: des(8) });
      const fin = M.terminerScene(commun, p, issue);
      assert.equal(fin.raison, 'soupape');
      assert.equal(p.pression, 7);
    }
  });
  test('Pression 9 : pas de soupape (altération normale)', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 9;
    const r = M.debuterScene(commun, p, { de: des(12) });
    assert.equal(r.soupape, false);
    assert.equal(r.alteree, false);
  });
});

describe('Seuil de rupture à 9', () => {
  test('la première fois que la Pression atteint 9 : l\'Oracle gagne 1 omni-point', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 8;
    const fin = M.terminerScene(commun, p, 'main');
    assert.equal(p.pression, 9);
    assert.equal(p.oracle.omni, 1);
    assert.equal(p.seuilAtteint, true);
    assert.ok(fin.evenements.some((e) => e.type === 'seuil-rupture'));
  });
  test('une seule fois par mission, même après la soupape', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 8;
    M.terminerScene(commun, p, 'main'); // 9 : +1
    M.terminerScene(commun, p, 'main'); // 10
    M.debuterScene(commun, p, { de: des(4) });
    M.terminerScene(commun, p, 'main'); // soupape : 7
    M.terminerScene(commun, p, 'main'); // 8
    M.terminerScene(commun, p, 'main'); // 9 : pas de nouveau point
    assert.equal(p.pression, 9);
    assert.equal(p.oracle.omni, 1);
  });
  test('compte aussi quand la Pression est changée à la main', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 8;
    const r = M.ajusterPression(commun, p, +1);
    assert.equal(p.oracle.omni, 1);
    assert.ok(r.evenements.some((e) => e.type === 'seuil-rupture'));
  });
  test('mission suivante : le seuil est remis à zéro', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 8;
    M.terminerScene(commun, p, 'main');
    M.missionSuivante(commun, cyber, p, { nom: 'Deuxième' });
    assert.equal(p.seuilAtteint, false);
    assert.equal(p.pression, 3);
    assert.equal(p.oracle.omni, 0);
    assert.equal(p.pjs[0].omni, 3);
    assert.equal(p.scene.numero, 1);
    assert.equal(p.mission.numero, 2);
  });
  test('étau : le rebondissement est signalé une fois quand la Pression atteint 7', () => {
    const p = M.creerPartie(commun, cyber);
    p.pression = 6;
    assert.ok(M.terminerScene(commun, p, 'main').evenements.some((e) => e.type === 'rebondissement'));
    M.terminerScene(commun, p, 'subi');
    assert.ok(!M.terminerScene(commun, p, 'main').evenements.some((e) => e.type === 'rebondissement'));
  });
});

// ---------------------------------------------------------------------------
describe('Omni-points', () => {
  test('3 par PJ, l\'Oracle commence à 0', () => {
    const p = M.creerPartie(commun, space, { mode: 'duo', pjs: [{ nom: 'A' }, { nom: 'B' }] });
    assert.deepEqual(p.pjs.map((x) => x.omni), [3, 3]);
    assert.equal(p.oracle.omni, 0);
  });
  test('l\'Oracle gagne 1 omni-point toutes les 2 utilisations par les joueurs', () => {
    const p = M.creerPartie(commun, cyber);
    const r1 = M.depenserOmniPJ(commun, p, 'pj1', { replique: 'Pas aujourd\'hui.' });
    assert.equal(p.oracle.omni, 0);
    assert.equal(r1.evenements.length, 0);
    const r2 = M.depenserOmniPJ(commun, p, 'pj1');
    assert.equal(p.oracle.omni, 1);
    assert.equal(r2.evenements[0].type, 'gain-oracle');
    M.depenserOmniPJ(commun, p, 'pj1');
    assert.equal(p.oracle.omni, 1);
    assert.equal(p.pjs[0].omni, 0);
  });
  test('impossible de dépenser sans omni-point', () => {
    const p = M.creerPartie(commun, cyber);
    p.pjs[0].omni = 0;
    assert.throws(() => M.depenserOmniPJ(commun, p, 'pj1'), /plus d'omni-point/);
  });
  test('en duo, les dépenses des deux PJ se cumulent', () => {
    const p = M.creerPartie(commun, cyber, { mode: 'duo', pjs: [{ nom: 'A' }, { nom: 'B' }] });
    M.depenserOmniPJ(commun, p, 'pj1');
    M.depenserOmniPJ(commun, p, 'pj2');
    assert.equal(p.oracle.omni, 1);
    assert.deepEqual(p.pjs.map((x) => x.omni), [2, 2]);
  });
  test('l\'Oracle transforme « Oui » en « Oui, mais… »', () => {
    const p = M.creerPartie(commun, cyber);
    p.oracle.omni = 1;
    const e = M.poserQuestion(commun, p, { question: 'La porte est-elle ouverte ?', vraisemblance: 'incertain', de: des(16) });
    assert.equal(e.reponse, 'oui');
    M.depenserOmniOracle(commun, p, 'oui-mais', { entree: e });
    assert.equal(e.reponse, 'oui-mais');
    assert.equal(e.libelle, 'Oui, mais…');
    assert.equal(p.oracle.omni, 0);
  });
  test('« Oui, et… » ne peut pas être transformé, et il faut un omni-point', () => {
    const p = M.creerPartie(commun, cyber);
    p.oracle.omni = 1;
    const e = M.poserQuestion(commun, p, { vraisemblance: 'incertain', de: des(20) });
    assert.throws(() => M.depenserOmniOracle(commun, p, 'oui-mais', { entree: e }));
    assert.equal(p.oracle.omni, 1);
    p.oracle.omni = 0;
    assert.throws(() => M.depenserOmniOracle(commun, p, 'complication'), /pas d'omni-point/);
  });
});

describe('Duo : contestation', () => {
  const duo = () => M.creerPartie(commun, cyber, { mode: 'duo', pjs: [{ nom: 'A' }, { nom: 'B' }] });
  test('l\'autre joueur relance ; le nouveau résultat remplace l\'ancien', () => {
    const p = duo();
    const e = M.poserQuestion(commun, p, { vraisemblance: 'probable', joueur: 'pj1', de: des(3) });
    assert.equal(e.reponse, 'non');
    const r = M.contester(commun, p, e, 'pj2', { de: des(15) });
    assert.equal(r.entree.reponse, 'oui');
    assert.equal(r.entree.jet.modificateur, 3); // même vraisemblance
    assert.equal(e.historique[0].reponse, 'non');
    assert.equal(p.pjs[1].omni, 2);
  });
  test('un résultat contesté ne peut plus l\'être', () => {
    const p = duo();
    const e = M.poserQuestion(commun, p, { vraisemblance: 'incertain', joueur: 'pj1', de: des(3) });
    M.contester(commun, p, e, 'pj2', { de: des(5) });
    assert.throws(() => M.contester(commun, p, e, 'pj2', { de: des(5) }), /définitive/);
  });
  test('celui qui a posé la question ne peut pas contester', () => {
    const p = duo();
    const e = M.poserQuestion(commun, p, { joueur: 'pj1', de: des(3) });
    assert.throws(() => M.contester(commun, p, e, 'pj1', { de: des(5) }), /autre joueur/);
  });
  test('la contestation compte pour le gain de l\'Oracle', () => {
    const p = duo();
    M.depenserOmniPJ(commun, p, 'pj1');
    const e = M.poserQuestion(commun, p, { joueur: 'pj1', de: des(3) });
    M.contester(commun, p, e, 'pj2', { de: des(5) });
    assert.equal(p.oracle.omni, 1);
  });
  test('pas de contestation en solo', () => {
    const p = M.creerPartie(commun, cyber);
    const e = M.poserQuestion(commun, p, { de: des(3) });
    assert.throws(() => M.contester(commun, p, e, 'pj1', { de: des(5) }));
  });
});

// ---------------------------------------------------------------------------
describe('Intentions des PNJ', () => {
  const intention = (profil, valeur, opts = {}) => M.intentionPNJ(commun, { profil, de: des(valeur), ...opts });
  test('lecture simple de la colonne du profil', () => {
    assert.equal(intention('brute', 10).action, 'Attaque la cible la plus blessée');
    assert.equal(intention('lache', 20).action, 'Fuit ou se rend');
    assert.equal(intention('compagnon-loyal', 1).action, 'Protège le PJ');
  });
  test('+4 si le PNJ a perdu la moitié de ses PV', () => {
    const r = intention('lache', 13, { blesse: true });
    assert.equal(r.total, 17);
    assert.equal(r.action, 'Fuit ou se rend');
  });
  test('Fanatique : pas de +4 même blessé', () => {
    const r = intention('fanatique', 13, { blesse: true });
    assert.equal(r.total, 13);
    assert.equal(r.modificateurs.length, 0);
  });
  test('−2 si la Pression est de 7 ou plus, pas à 6', () => {
    assert.equal(intention('brute', 9, { pression: 7 }).total, 7);
    assert.equal(intention('brute', 9, { pression: 6 }).total, 9);
  });
  test('+4 et −2 ensemble', () => {
    assert.equal(intention('tacticien', 10, { blesse: true, pression: 8 }).total, 12);
  });
  test('au-delà des bornes : 20 + 4 lu en 17-20, 1 − 2 lu en 1-4', () => {
    const haut = intention('brute', 20, { blesse: true });
    assert.equal(haut.total, 24);
    assert.equal(haut.plage, '17-20');
    const bas = intention('brute', 1, { pression: 9 });
    assert.equal(bas.total, -1);
    assert.equal(bas.plage, '1-4');
  });
});

describe('Intentions des vaisseaux ennemis (E)', () => {
  const E = cat.table('space-opera', 'E');
  test('modificateurs +4 et −2', () => {
    assert.equal(M.intentionVaisseau(E, { de: des(13), blesse: true }).plage, '17-20');
    assert.equal(M.intentionVaisseau(E, { de: des(9), pression: 7 }).plage, '5-8');
    assert.equal(M.intentionVaisseau(E, { de: des(20), blesse: true }).lu, 20);
  });
});

// ---------------------------------------------------------------------------
describe('Générateurs', () => {
  test('mission : 6 tables, verrou respecté', () => {
    const m1 = M.tirerMission(cat, 'cyberpunk', { de: des(1, 2, 3, 4, 5, 6) });
    assert.deepEqual(Object.keys(m1), ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']);
    const m2 = M.tirerMission(cat, 'cyberpunk', { verrous: { T1: m1.T1 }, de: des(20, 20, 20, 20, 20) });
    assert.equal(m2.T1.valeur, 1);
    assert.equal(m2.T2.valeur, 20);
  });
  test('PNJ space opéra : le trait vient de la table N2 du tronc commun', () => {
    const pnj = M.genererPNJ(cat, 'space-opera', { de: des(1, 1, 1) });
    assert.equal(pnj.role.ligne.texte, 'Capitaine de croiseur');
    assert.equal(pnj.trait.ligne.texte, 'Méfiant : répond toujours par une question.');
  });
  test('N2 est commune : les quatre univers lisent la même table du tronc commun', () => {
    const n2 = cat.table('commun', 'N2');
    assert.equal(n2.lignes.length, 20);
    for (const id of ['cyberpunk', 'space-opera', 'fantasy', 'horreur-enquete']) {
      const t = cat.table(id, 'N2');
      assert.deepEqual(t.reference, { univers: 'commun', table: 'N2' }, id);
      assert.equal(t.lignes, n2.lignes, id);
    }
    assert.equal(cat.origine({ univers: 'commun', table: 'N2' }), 'du tronc commun');
    assert.equal(M.genererPNJ(cat, 'fantasy', { de: des(4, 1, 1) }).role.ligne.texte, 'Magicien errant');
    assert.equal(M.genererPNJ(cat, 'horreur-enquete', { de: des(20, 20, 20) }).trait.ligne.texte, cat.table('commun', 'N2').lignes[19].texte);
  });
  test('les quatre univers sont chargés, dans l\'ordre', () => {
    assert.deepEqual(cat.univers.map((u) => u.id), ['cyberpunk', 'space-opera', 'fantasy', 'horreur-enquete']);
    const q = M.tirerMission(cat, 'fantasy', { de: des(1, 1, 1, 1, 1, 1) });
    assert.equal(q.T1.ligne.texte, 'Un messager épuisé s\'effondre à la taverne en portant un sceau royal brisé.');
    const a = M.tirerMission(cat, 'horreur-enquete', { de: des(20, 20, 20, 20, 20, 20) });
    assert.equal(a.T6.titre, 'T6 — Révélation');
  });
  test('clôture : degrés de l\'oracle → succès complet, partiel, échec', () => {
    assert.equal(M.issueCloture(cyber, 'oui-et').texte, 'succès complet.');
    assert.equal(M.issueCloture(cyber, 'non-mais').texte, 'succès partiel.');
    assert.equal(M.issueCloture(space, 'non-et').texte, 'échec, avec conséquences.');
  });
  test('l\'univers cyberpunk n\'a pas de rencontres de vaisseaux', () => {
    assert.throws(() => M.rencontreVaisseau(cat, 'cyberpunk'));
  });
});

describe('Rencontres de vaisseaux (space opéra)', () => {
  test('chasseurs aliens : escadrille de 1d4+1', () => {
    const r = M.rencontreVaisseau(cat, 'space-opera', { de: des(2, 3, 1) });
    assert.match(r.type.ligne.texte, /Chasseurs aliens/);
    assert.equal(r.escadrille.total, 4);
    assert.equal(r.attitude.ligne.attitude, 'hostile');
    assert.equal(r.vraisemblance, 'improbable');
  });
  test('croiseur humain avec escorte (d20 ≥ 14) de chasseurs humains', () => {
    const r = M.rencontreVaisseau(cat, 'space-opera', { de: des(15, 14, 4, 17) });
    assert.equal(r.escorte.deploie, true);
    assert.equal(r.escorte.famille, 'humain');
    assert.equal(r.escorte.escadrille.total, 5);
    assert.equal(r.vraisemblance, 'probable'); // amical
  });
  test('croiseur alien sans escorte (d20 = 13)', () => {
    const r = M.rencontreVaisseau(cat, 'space-opera', { de: des(17, 13, 8) });
    assert.equal(r.escorte.deploie, false);
    assert.equal(r.escorte.escadrille, undefined);
    assert.equal(r.vraisemblance, 'incertain'); // neutre
  });
  test('vaisseau-mère : escorte possible, famille au choix', () => {
    const r = M.rencontreVaisseau(cat, 'space-opera', { de: des(19, 20, 2, 13) });
    assert.equal(r.escorte.famille, null);
    assert.equal(r.escorte.escadrille.total, 3);
  });
  test('cargo : ni escadrille ni escorte ; attitude « Endommagé » → incertain par défaut', () => {
    const r = M.rencontreVaisseau(cat, 'space-opera', { de: des(11, 13) });
    assert.equal(r.escadrille, undefined);
    assert.equal(r.escorte, undefined);
    assert.equal(r.attitude.ligne.attitude, null);
    assert.equal(r.vraisemblance, 'incertain');
  });
});

describe('Journal', () => {
  test('chaque question est inscrite avec le joueur, la scène et la mission', () => {
    const p = M.creerPartie(commun, cyber, { mode: 'duo', pjs: [{ nom: 'A' }, { nom: 'B' }] });
    M.poserQuestion(commun, p, { question: 'Est-il armé ?', joueur: 'pj2', de: des(10) });
    const e = p.journal.at(-1);
    assert.equal(e.type, 'oracle');
    assert.equal(e.joueur, 'pj2');
    assert.equal(e.scene, 1);
    assert.equal(e.mission, 1);
    assert.equal(e.question, 'Est-il armé ?');
  });
});

test('journal : le début de scène garde son type (et les anciennes parties restent lisibles)', () => {
  const p = M.creerPartie(commun, cyber, { pjs: [{ nom: 'Kei' }] });
  M.debuterScene(commun, p, { des: 2 });
  const e = p.journal.at(-1);
  assert.equal(e.type, 'scene-debut');
  assert.equal(e.alteration, 'modifiee');
  assert.equal(M.typeEntree(e), 'scene-debut');
  // Entrées enregistrées par la version 0.2.1 (type écrasé par l'altération).
  for (const ancien of ['modifiee', 'interrompue', null]) {
    const v = { n: 1, type: ancien, prevue: '', de: 2, pression: 3, soupape: false, alteree: ancien !== null, complication: null, palier: 'vigilance' };
    assert.equal(M.typeEntree(v), 'scene-debut');
    assert.equal(M.alterationEntree(v), ancien);
  }
  assert.equal(M.typeEntree({ type: 'oracle' }), 'oracle');
});

// --- Options d'univers (Fantasy, Horreur / enquête) -------------------------------------
describe('options d\'univers', () => {
  const fantasy = cat.univ('fantasy');
  const horreur = cat.univ('horreur-enquete');

  test('sans option, un univers suit le tronc commun', () => {
    for (const u of [cyber, space]) {
      const o = M.optionsUnivers(u);
      assert.equal(o.omniPoints, true);
      assert.equal(o.contestation, true);
      assert.equal(o.paliers, null);
      assert.deepEqual(o.profils, []);
    }
    assert.equal(M.optionsUnivers(fantasy).omniPoints, true);
    assert.equal(M.optionsUnivers(fantasy).rappelOmni, 'Un omni-point permet aussi de récupérer une utilisation de sort pour un magicien.');
  });

  test('horreur : aucun omni-point, ni pour les PJ ni pour l\'Oracle, et pas de contestation', () => {
    const o = M.optionsUnivers(horreur);
    assert.equal(o.omniPoints, false);
    assert.equal(o.contestation, false);
    const p = M.creerPartie(commun, horreur, { mode: 'duo', pjs: [{ nom: 'Ada' }, { nom: 'Bo' }] });
    assert.deepEqual(p.pjs.map((x) => x.omni), [0, 0]);
    assert.equal(p.oracle.omni, 0);
    assert.throws(() => M.depenserOmniPJ(commun, p, 'pj1'));
    const q = M.poserQuestion(commun, p, { vraisemblance: 'incertain', joueur: 'pj1', des: [10] });
    assert.throws(() => M.contester(commun, p, q, 'pj2', { des: [10], univers: horreur }), /Pas de contestation/);
    M.missionSuivante(commun, horreur, p);
    assert.deepEqual(p.pjs.map((x) => x.omni), [0, 0]);
    assert.equal(p.oracle.omni, 0);
  });

  test('horreur : le seuil de rupture ne rapporte rien, mais il est signalé (une fois)', () => {
    const p = M.creerPartie(commun, horreur, { pjs: [{ nom: 'Ada' }] });
    p.pression = 8;
    const r = M.ajusterPression(commun, p, +1, { univers: horreur });
    assert.deepEqual(r.evenements.find((e) => e.type === 'seuil-rupture'), { type: 'seuil-rupture', gain: 0 });
    assert.equal(p.oracle.omni, 0);
    assert.equal(p.seuilAtteint, true);
    assert.equal(M.ajusterPression(commun, p, +1, { univers: horreur }).evenements.length, 0);
    // Même règle en cyberpunk : l'Oracle gagne 1 omni-point.
    const c = M.creerPartie(commun, cyber, { pjs: [{ nom: 'Kei' }] });
    c.pression = 8;
    M.ajusterPression(commun, c, +1, { univers: cyber });
    assert.equal(c.oracle.omni, 1);
  });

  test('horreur : la soupape à 10 puis retour à 7 ne change pas', () => {
    const p = M.creerPartie(commun, horreur, { pjs: [{ nom: 'Ada' }] });
    p.pression = 10;
    const d = M.debuterScene(commun, p, { des: 15, univers: horreur });
    assert.equal(d.soupape, true);
    assert.equal(d.alteree, true);
    assert.equal(d.palier.nom, 'Rupture');
    const f = M.terminerScene(commun, p, 'main', { univers: horreur });
    assert.equal(f.apres, 7);
    assert.equal(p.oracle.omni, 0);
  });

  test('horreur : paliers propres à l\'univers, même chance d\'altération (Pression × 5 %)', () => {
    const noms = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => M.palier(commun, v, horreur).nom);
    assert.deepEqual(noms, ['Calme trompeur', 'Calme trompeur', 'Malaise', 'Malaise', 'Angoisse', 'Angoisse', 'Terreur', 'Terreur', 'Rupture', 'Rupture']);
    for (let v = 0; v <= 10; v++) assert.equal(M.palier(commun, v, horreur).chance, M.palier(commun, v, cyber).chance);
    assert.equal(M.palier(commun, 5, horreur).autres[0], '25 à 30 %');
    assert.match(M.palier(commun, 5, horreur).autres[1], /^La menace se rapproche\./);
    // Les autres univers gardent les paliers du tronc commun.
    assert.equal(M.palier(commun, 5, cyber).nom, 'Tension');
    assert.equal(M.palier(commun, 5, fantasy).nom, 'Tension');
    assert.equal(M.palier(commun, 5).nom, 'Tension');
  });

  test('profils d\'intention : ceux du tronc commun, plus ceux de l\'univers', () => {
    const ids = (u) => M.tablesProfils(cat, u).flatMap((t) => t.lignes.map((l) => l.id));
    assert.equal(ids('cyberpunk').length, 8);
    assert.deepEqual(ids('fantasy').slice(8), ['bete-sauvage', 'lanceur-de-sorts', 'chef-de-guerre']);
    assert.deepEqual(ids('horreur-enquete').slice(8), ['predateur', 'manipulateur', 'entite-liee-a-un-lieu']);
    assert.equal(M.trouverProfil(cat, 'cyberpunk', 'lanceur-de-sorts'), null);
    assert.equal(M.trouverProfil(cat, 'fantasy', 'brute').table.id, 'intentions');
  });

  test('F4 : mêmes modificateurs (+4 si PV à moitié ou moins, −2 si Pression ≥ 7)', () => {
    const { table } = M.trouverProfil(cat, 'fantasy', 'lanceur-de-sorts');
    const base = M.intentionPNJ(commun, { table, profil: 'lanceur-de-sorts', des: 3 });
    assert.equal(base.action, 'Lance un sort offensif sur la cible la plus dangereuse');
    const blesse = M.intentionPNJ(commun, { table, profil: 'lanceur-de-sorts', blesse: true, des: 3 });
    assert.equal(blesse.total, 7);
    assert.equal(blesse.action, 'Lance un sort de contrôle ou d\'altération d\'état');
    const tout = M.intentionPNJ(commun, { table, profil: 'chef-de-guerre', blesse: true, pression: 7, des: 17 });
    assert.equal(tout.total, 19);
    assert.equal(tout.action, 'Sonne la retraite ou parlemente');
    const bas = M.intentionPNJ(commun, { table, profil: 'bete-sauvage', pression: 9, des: 1 });
    assert.equal(bas.total, -1);
    assert.equal(bas.action, 'Fonce sur la proie la plus proche');
  });

  test('M1 : −2 si Pression ≥ 7, +4 si la menace est affaiblie', () => {
    const { table } = M.trouverProfil(cat, 'horreur-enquete', 'manipulateur');
    assert.equal(table.modificateurs.libelleBlesse, 'la menace est affaiblie (rituel perturbé, symbole effacé, objet détruit)');
    const r = M.intentionPNJ(commun, { table, profil: 'entite-liee-a-un-lieu', blesse: true, pression: 8, des: 11 });
    assert.deepEqual(r.modificateurs.map((m) => m.valeur), [4, -2]);
    assert.equal(r.total, 13);
    assert.equal(r.action, 'Attaque celui qui franchit son seuil');
    assert.equal(M.intentionPNJ(commun, { table, profil: 'predateur', des: 14 }).action, 'Terrorise : 1 point de choc à une cible, sans attaque');
  });
});

test('parties de la version 0.2.1 : toujours valides avec les quatre univers', () => {
  const fichier = lire('tests/navigateur/donnees/parties-0.2.1.json');
  const ids = cat.univers.map((u) => u.id);
  for (const p of fichier.parties) {
    const copie = structuredClone(p);
    const u = cat.univ(p.univers);
    assert.equal(M.optionsUnivers(u).omniPoints, true);
    // Le journal ancien se relit : débuts de scène reconnus, profils retrouvés.
    for (const e of p.journal) {
      if (M.typeEntree(e) === 'intention') assert.ok(M.trouverProfil(cat, p.univers, e.profil));
    }
    assert.equal(ids.includes(p.univers), true);
    assert.deepEqual(p, copie, 'la lecture ne modifie pas la partie');
  }
  assert.equal(fichier.parties[0].journal.filter((e) => M.typeEntree(e) === 'scene-debut').length, 2);
});
