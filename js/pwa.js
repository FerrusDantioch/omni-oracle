// Installation hors ligne (service worker) et mise à jour contrôlée par la personne.
//
// Le bouton « Mettre à jour » n'apparaît QUE lorsqu'une nouvelle version est prête.
// La mise à jour n'est jamais appliquée sans action de la personne.
// On vérifie s'il existe une mise à jour au démarrage et à chaque retour au premier plan.

let invitationInstallation = null; // événement « beforeinstallprompt » (Chrome, Edge, Android)

export function invitation() {
  return invitationInstallation;
}

export function initialiserPWA({ bouton, surPret = () => {} }) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitationInstallation = e;
  });
  window.addEventListener('appinstalled', () => { invitationInstallation = null; });

  if (!('serviceWorker' in navigator)) return;

  let miseAJourDemandee = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Recharger seulement si c'est la personne qui a demandé la mise à jour
    // (pas lors de la toute première installation).
    if (miseAJourDemandee) window.location.reload();
  });

  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    const montrer = () => {
      if (reg.waiting && navigator.serviceWorker.controller) bouton.hidden = false;
    };
    montrer();
    reg.addEventListener('updatefound', () => {
      const nouveau = reg.installing;
      if (!nouveau) return;
      nouveau.addEventListener('statechange', () => { if (nouveau.state === 'installed') montrer(); });
    });
    bouton.addEventListener('click', () => {
      if (!reg.waiting) return;
      miseAJourDemandee = true;
      bouton.disabled = true;
      bouton.textContent = 'Mise à jour…';
      reg.waiting.postMessage('activer');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    surPret(reg);
  }).catch((e) => console.warn('Service worker non installé :', e.message));
}
