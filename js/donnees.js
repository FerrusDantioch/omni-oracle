// Chargement des données (data/*.json). Les fichiers sont lus sur le site lui-même
// (jamais ailleurs) et gardés en cache par le service worker pour le hors-ligne.

import { creerCatalogue } from './moteur.js';

async function lireJSON(chemin) {
  const rep = await fetch(chemin, { cache: 'no-cache' });
  if (!rep.ok) throw new Error(`Fichier introuvable : ${chemin}`);
  return rep.json();
}

/**
 * Charge le tronc commun et tous les univers listés dans data/univers.json.
 * Pour ajouter un univers : déposer son fichier dans data/ et l'ajouter à cette liste.
 */
export async function chargerDonnees() {
  const index = await lireJSON('data/univers.json');
  const [commun, ...univers] = await Promise.all([index.commun, ...index.univers].map(lireJSON));
  return creerCatalogue(commun, univers);
}
