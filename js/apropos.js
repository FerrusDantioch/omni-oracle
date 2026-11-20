// Fenêtres « À propos » et « Installer l'application ».
// Toutes les valeurs (nom, version, auteur, contact, lien) viennent de js/config.js.

import { h, ouvrirDialogue, annoncer } from './ui.js';
import { invitation } from './pwa.js';

const CONFIG = globalThis.CONFIG_APP;
const LICENCE = 'https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr';

const lienExterne = (href, texte) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, texte);

export function dialogueAPropos() {
  return ouvrirDialogue({
    titre: 'À propos',
    classe: 'dialogue-apropos',
    contenu: h('div', { class: 'apropos' },
      h('img', { src: 'assets/logo-omni-systeme.webp', alt: 'Logo de l\'Omni-système', width: 120, height: 120, class: 'apropos-logo' }),
      h('p', { class: 'apropos-nom' }, CONFIG.nom),
      h('p', { class: 'apropos-version' }, `Version ${CONFIG.version}`),
      h('p', {}, `Application réalisée par ${CONFIG.auteur}, avec l'aide de l'intelligence artificielle.`),
      h('p', {}, `© 2026 ${CONFIG.auteur} — `, lienExterne(LICENCE, 'Creative Commons BY-NC-ND 4.0'),
        ' : partage autorisé en citant l\'auteur, sans usage commercial ni modification.'),
      h('p', { class: 'petit discret' }, 'Cette licence couvre le code de l\'application. Les règles, les tables et les textes de l\'Omni-système restent tous droits réservés.'),
      h('p', {}, 'Tes parties restent sur cet appareil. Aucun compte, aucune donnée envoyée.'),
      h('p', {}, 'Une idée, une remarque, un souci ? Tes retours sont les bienvenus : ',
        h('a', { href: `mailto:${CONFIG.contact}` }, CONFIG.contact)),
      h('p', {}, h('a', { href: CONFIG.siteOmni, target: '_blank', rel: 'noopener noreferrer', class: 'lien-seul' }, 'Découvrir l\'Omni-système'))),
  });
}

export async function dialogueInstallation() {
  const evt = invitation();
  const r = await ouvrirDialogue({
    titre: 'Installer l\'application',
    contenu: [
      h('p', {}, `Installée, ${CONFIG.nom} s'ouvre comme une application et fonctionne sans internet. Tes parties restent sur cet appareil.`),
      evt && h('p', {}, 'Ton navigateur peut l\'installer directement : touche « Installer maintenant ».'),
      h('h3', {}, 'Tablette ou téléphone Android'),
      h('ul', {},
        h('li', {}, 'Chrome : menu ⋮ puis « Installer l\'application » (ou « Ajouter à l\'écran d\'accueil »).'),
        h('li', {}, 'Attention : sur Chrome Android, une seule application de ce site peut s\'installer. Si tu as déjà installé une autre application de l\'Omni-système, utilise Brave : il installe chaque application indépendamment.')),
      h('h3', {}, 'iPad ou iPhone'),
      h('ul', {}, h('li', {}, 'Safari : bouton Partager puis « Sur l\'écran d\'accueil ».')),
      h('h3', {}, 'Ordinateur'),
      h('ul', {}, h('li', {}, 'Chrome, Edge ou Brave : icône d\'installation à droite de la barre d\'adresse, ou menu puis « Installer ».')),
      h('p', { class: 'petit discret' }, 'Pense à exporter tes parties de temps en temps (menu « Mes parties ») : c\'est ta sauvegarde.'),
    ],
    actions: evt
      ? [{ id: 'non', texte: 'Fermer' }, { id: 'installer', texte: 'Installer maintenant', classe: 'bouton-accent' }]
      : [{ id: 'non', texte: 'Fermer' }],
  });
  if (r === 'installer' && evt) {
    evt.prompt();
    const choix = await evt.userChoice.catch(() => null);
    if (choix?.outcome === 'accepted') annoncer('Application installée.');
  }
}
