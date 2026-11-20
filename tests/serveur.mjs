// Petit serveur de fichiers statiques pour les tests (aucune dépendance).
// Il sert le dépôt tel que GitHub Pages le servira.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  '': 'text/plain; charset=utf-8',
};

/** Démarre le serveur ; renvoie { url, fermer() }. */
export function demarrerServeur(port = 0) {
  const serveur = http.createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = path.join(racine, chemin);
    if (!fichier.startsWith(racine)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) fichier = path.join(fichier, 'index.html');
    fs.readFile(fichier, (err, data) => {
      if (err) { res.writeHead(404).end('introuvable'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => {
    ok({ url: `http://127.0.0.1:${serveur.address().port}/`, fermer: () => new Promise((f) => serveur.close(f)) });
  }));
}

// Lancement direct : node tests/serveur.mjs 8080
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  demarrerServeur(Number(process.argv[2]) || 8080).then((s) => console.log(`Omni-Oracle : ${s.url}`));
}
