// =============================================================================
// Service worker d'Omni-Oracle : garde une copie de l'application sur l'appareil
// pour qu'elle fonctionne sans internet.
//
// - À l'installation : TOUS les fichiers ci-dessous sont copiés (plus les fichiers
//   d'univers listés dans data/univers.json).
// - Ensuite : « cache d'abord » (la copie locale est utilisée en priorité).
// - Mise à jour : quand config.js change de version, une nouvelle copie est
//   préparée en arrière-plan ; elle n'est utilisée que lorsque la personne touche
//   « Mettre à jour » (jamais de changement par surprise).
//
// IMPORTANT : tout nouveau fichier de l'application doit être ajouté à FICHIERS.
// Le test tests/securite.test.mjs le vérifie.
// =============================================================================

importScripts('js/config.js');

const CONFIG = self.CONFIG_APP;
const PREFIXE = `${CONFIG.idStockage}-`;          // propre à cette application (origine partagée)
const CACHE = `${PREFIXE}v${CONFIG.version}`;

const FICHIERS = [
  './',
  'index.html',
  'livret.html',
  'manifest.webmanifest',
  'css/themes.css',
  'css/app.css',
  'css/livret.css',
  'js/config.js',
  'js/theme.js',
  'js/app.js',
  'js/actions.js',
  'js/apropos.js',
  'js/composants.js',
  'js/donnees.js',
  'js/livret.js',
  'js/moteur.js',
  'js/pwa.js',
  'js/stockage.js',
  'js/texte.js',
  'js/ui.js',
  'js/vue-fiche.js',
  'js/vue-intentions.js',
  'js/vue-jouer.js',
  'js/vue-journal.js',
  'js/vue-mission.js',
  'js/vue-pnj.js',
  'js/vue-tables.js',
  'js/vue-vaisseaux.js',
  'data/univers.json',
  'assets/logo-omni-systeme.webp',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icone-192.png',
  'icons/icone-512.png',
  'icons/icone-maskable-192.png',
  'icons/icone-maskable-512.png',
];

/** Requête qui ignore le cache HTTP du navigateur (pour copier la version à jour). */
const frais = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (evenement) => {
  evenement.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FICHIERS.map(frais));
    // Les univers : la liste est dans data/univers.json (ajouter un univers = ajouter un JSON).
    const index = await (await cache.match('data/univers.json')).json();
    await cache.addAll([index.commun, ...index.univers].map(frais));
  })());
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    // Supprime les anciennes copies de CETTE application seulement (préfixe propre).
    for (const nom of await caches.keys()) {
      if (nom.startsWith(PREFIXE) && nom !== CACHE) await caches.delete(nom);
    }
    await self.clients.claim();
  })());
});

// La page demande d'utiliser la nouvelle version (bouton « Mettre à jour »).
self.addEventListener('message', (evenement) => {
  if (evenement.data === 'activer') self.skipWaiting();
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // jamais d'autre site

  evenement.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const copie = await cache.match(requete, { ignoreSearch: true });
    if (copie) return copie;
    try {
      const reponse = await fetch(requete);
      if (reponse.ok && url.pathname.startsWith(new URL('./', self.location).pathname)) {
        cache.put(requete, reponse.clone());
      }
      return reponse;
    } catch (erreur) {
      // Plan B hors ligne : pour une page, on renvoie l'application.
      if (requete.mode === 'navigate') {
        const page = await cache.match('index.html');
        if (page) return page;
      }
      return new Response('Hors ligne : ce fichier n\'est pas disponible sur l\'appareil.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});
