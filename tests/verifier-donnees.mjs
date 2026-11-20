// Contrôle automatique des données (data/*.json).
// Lancement : node tests/verifier-donnees.mjs   (ou : npm run test:donnees)
//
// Ce script vérifie, pour chaque fichier listé dans data/univers.json :
//   1. la structure (champs obligatoires, identifiants uniques, renvois valides) ;
//   2. les plages de dés : chaque table d20 couvre 1 à 20, sans trou ni chevauchement ;
//   3. la fidélité aux sources : en recomposant le texte à partir du JSON, on doit
//      retrouver mot pour mot le fichier .md d'origine (hors « Notes de test »).
// Il s'arrête avec un code d'erreur si un seul problème est trouvé.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lireJSON = (f) => JSON.parse(fs.readFileSync(path.join(racine, f), 'utf8'));

const erreurs = [];
const erreur = (msg) => erreurs.push(msg);
const ok = (msg) => console.log('  ✓ ' + msg);

// --- Lecture d'une plage : "5", "1-4", "2 à 7", "1 ou moins", "20 ou plus" ---
export function lirePlage(texte) {
  let m;
  if ((m = texte.match(/^(\d+)$/))) return { min: +m[1], max: +m[1] };
  if ((m = texte.match(/^(\d+)-(\d+)$/))) return { min: +m[1], max: +m[2] };
  if ((m = texte.match(/^(\d+) à (\d+)$/))) return { min: +m[1], max: +m[2] };
  if ((m = texte.match(/^(\d+) ou moins$/))) return { min: -Infinity, max: +m[1] };
  if ((m = texte.match(/^(\d+) ou plus$/))) return { min: +m[1], max: Infinity };
  return null;
}

// Vérifie qu'une suite de plages couvre exactement 1 à 20 (les bouts ouverts sont admis).
function verifierPlages(nom, plages) {
  let attendu = 1;
  for (const p of plages) {
    const r = lirePlage(p);
    if (!r) return erreur(`${nom} : plage illisible « ${p} »`);
    const debut = Math.max(r.min, 1);
    if (debut !== attendu) return erreur(`${nom} : la plage « ${p} » devrait commencer à ${attendu}`);
    if (r.max < debut) return erreur(`${nom} : plage à l'envers « ${p} »`);
    attendu = Math.min(r.max, 20) + 1;
  }
  if (attendu !== 21) return erreur(`${nom} : les plages s'arrêtent à ${attendu - 1} au lieu de 20`);
  return true;
}

// --- Chargement --------------------------------------------------------------
const index = lireJSON('data/univers.json');
const commun = lireJSON(index.commun);
const univers = index.univers.map(lireJSON);
const tous = [commun, ...univers];
const parId = Object.fromEntries(univers.map((u) => [u.id, u]));

// --- 1 et 2 : structure et plages --------------------------------------------
for (const doc of tous) {
  console.log(`\n${doc.nom} (${doc.id})`);
  for (const champ of ['format', 'id', 'nom', 'sections', 'tables']) {
    if (doc[champ] === undefined) erreur(`${doc.id} : champ « ${champ} » manquant`);
  }
  if (doc !== commun) {
    for (const champ of ['ordre', 'omniPointsPJ', 'roles', 'cloture']) {
      if (doc[champ] === undefined) erreur(`${doc.id} : champ « ${champ} » manquant`);
    }
  }
  const ids = new Set();
  for (const t of doc.tables) {
    if (ids.has(t.id)) erreur(`${doc.id} : table « ${t.id} » en double`);
    ids.add(t.id);
  }
  // Chaque {{table X}} renvoie à une table existante, et chaque table est placée.
  const placees = new Set();
  for (const s of doc.sections) {
    for (const l of s.texte) {
      const m = l.match(/^\{\{table (.+)\}\}$/);
      if (m) {
        if (!ids.has(m[1])) erreur(`${doc.id} : section « ${s.id} » renvoie à une table inconnue « ${m[1]} »`);
        placees.add(m[1]);
      }
    }
  }
  for (const id of ids) if (!placees.has(id)) erreur(`${doc.id} : la table « ${id} » n'apparaît dans aucune section`);
  // Rôles : chaque table nommée existe.
  const roles = JSON.stringify(doc.roles || {}).match(/"[A-Z]\d?"/g) || [];
  for (const r of roles) if (!ids.has(r.slice(1, -1))) erreur(`${doc.id} : rôle vers une table inconnue ${r}`);

  for (const t of doc.tables) {
    const nom = `${doc.id} / ${t.titre}`;
    if (t.reference) {
      const cible = parId[t.reference.univers]?.tables.find((x) => x.id === t.reference.table);
      if (!cible) erreur(`${nom} : renvoi introuvable vers ${t.reference.univers}/${t.reference.table}`);
      else ok(`${t.titre} : reprend la table ${t.reference.table} de « ${parId[t.reference.univers].nom} »`);
      continue;
    }
    if (!Array.isArray(t.colonnes) || !Array.isArray(t.lignes) || t.lignes.length === 0) {
      erreur(`${nom} : colonnes ou lignes manquantes`);
      continue;
    }
    for (const l of t.lignes) {
      if (typeof l.texte !== 'string' || l.texte === '') erreur(`${nom} : ligne sans texte`);
      const attendu = t.colonnes.length - (t.de && t.type !== 'grille' ? 2 : 1);
      if ((l.autres || []).length !== attendu) erreur(`${nom} : nombre de colonnes incorrect (« ${l.texte} »)`);
    }
    if (t.de !== 'd20') { ok(`${t.titre} : ${t.lignes.length} lignes (pas de dé)`); continue; }
    if (t.type === 'grille') {
      if (verifierPlages(nom, t.plages) === true) {
        ok(`${t.titre} : ${t.lignes.length} profils × ${t.plages.length} colonnes, plages 1-20 complètes`);
      }
      continue;
    }
    const plages = t.lignes.map((l) => l.plage);
    if (verifierPlages(nom, plages) === true) {
      const seules = t.lignes.every((l) => /^\d+$/.test(l.plage));
      if (seules && t.lignes.length !== 20) erreur(`${nom} : ${t.lignes.length} lignes au lieu de 20`);
      ok(`${t.titre} : ${t.lignes.length} lignes, plages 1-20 complètes`);
    }
  }
}

// --- 3 : fidélité aux sources --------------------------------------------------
// On recompose le texte des sections (titres, lignes, tableaux) et on le compare
// au fichier source, ligne par ligne. Sont ignorés dans la source : les lignes vides,
// les séparateurs « --- », le titre du fichier (#), les titres « PARTIE … », et tout
// ce qui suit « Notes de test ».

function tableEnMarkdown(t) {
  if (t.reference) return []; // la source ne contient qu'un renvoi en texte
  const ligne = (cellules) => '| ' + cellules.join(' | ') + ' |';
  const out = [ligne(t.colonnes), '|' + '---|'.repeat(t.colonnes.length)];
  for (const l of t.lignes) {
    const premieres = t.de && t.type !== 'grille' ? [l.plage, l.texte] : [l.texte];
    out.push(ligne([...premieres, ...(l.autres || [])]));
  }
  return out;
}

function recomposer(doc) {
  const tables = Object.fromEntries(doc.tables.map((t) => [t.id, t]));
  const out = [];
  for (const s of doc.sections) {
    if (s.titre) out.push('# ' + s.titre);
    for (const l of s.texte) {
      const m = l.match(/^\{\{table (.+)\}\}$/);
      if (m) out.push(...tableEnMarkdown(tables[m[1]]));
      else out.push(l);
    }
  }
  return out;
}

function normaliserSource(lignes) {
  const out = [];
  for (const l of lignes) {
    const titre = l.match(/^(#+) (.*)$/);
    if (titre && titre[2].startsWith('Notes de test')) break;
    if (l.trim() === '' || l.trim() === '---') continue;
    if (titre && (titre[1].length === 1 || titre[2].startsWith('PARTIE '))) continue;
    out.push(titre ? '# ' + titre[2] : l);
  }
  return out;
}

console.log('\nFidélité aux sources');
const parSource = new Map();
for (const doc of tous) {
  if (!doc.source) { console.log(`  (pas de source indiquée pour ${doc.nom} : contrôle de fidélité sauté)`); continue; }
  if (!parSource.has(doc.source)) parSource.set(doc.source, []);
  parSource.get(doc.source).push(doc);
}
for (const [source, docs] of parSource) {
  const chemin = path.join(racine, source);
  if (!fs.existsSync(chemin)) { console.log(`  (source ${source} absente : contrôle sauté)`); continue; }
  const attendu = normaliserSource(fs.readFileSync(chemin, 'utf8').split('\n'));
  const obtenu = docs.flatMap(recomposer);
  const n = Math.max(attendu.length, obtenu.length);
  let ecart = -1;
  for (let i = 0; i < n; i++) if (attendu[i] !== obtenu[i]) { ecart = i; break; }
  if (ecart >= 0) {
    erreur(`${source} : différence à la ligne utile n° ${ecart + 1}\n      source : ${attendu[ecart]}\n      JSON   : ${obtenu[ecart]}`);
  } else {
    ok(`${source} : ${attendu.length} lignes identiques (${docs.map((d) => d.id).join(' + ')})`);
  }
}

// --- Bilan ---------------------------------------------------------------------
console.log('');
if (erreurs.length) {
  console.log(`✗ ${erreurs.length} problème(s) :`);
  for (const e of erreurs) console.log('  - ' + e);
  process.exit(1);
}
console.log('✓ Toutes les données sont complètes et fidèles aux sources.');
