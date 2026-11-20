// Petit serveur de fichiers statiques pour les tests (aucune dépendance).
// Il sert le dépôt tel que GitHub Pages le servira.
//
// Pour les tests de mise à jour, on peut remplacer le contenu d'un fichier à la volée :
//   serveur.remplacer('js/config.js', nouveauTexte)  puis  serveur.retablir()
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

/** Démarre le serveur ; renvoie { url, fermer(), remplacer(chemin, contenu), retablir() }. */
export function demarrerServeur(port = 0) {
  const remplacements = new Map();
  const serveur = http.createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.join(racine, chemin);
    if (!fichier.startsWith(racine)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) fichier = path.join(fichier, 'index.html');
    const relatif = path.relative(racine, fichier).split(path.sep).join('/');
    const entete = { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (remplacements.has(relatif)) { res.writeHead(200, entete).end(remplacements.get(relatif)); return; }
    fs.readFile(fichier, (err, data) => {
      if (err) { res.writeHead(404).end('introuvable'); return; }
      res.writeHead(200, entete).end(data);
    });
  });
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => {
    ok({
      url: `http://127.0.0.1:${serveur.address().port}/`,
      fermer: () => new Promise((f) => { serveur.closeAllConnections?.(); serveur.close(f); }),
      remplacer: (chemin, contenu) => remplacements.set(chemin, contenu),
      retablir: () => remplacements.clear(),
    });
  }));
}

// Lancement direct : node tests/serveur.mjs 8080
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  demarrerServeur(Number(process.argv[2]) || 8080).then((s) => console.log(`Omni-Oracle : ${s.url}  (Ctrl+C pour arrêter)`));
}
