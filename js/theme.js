// Thème appliqué AVANT l'affichage de la page (évite l'éclair du mauvais thème).
//
// Ce petit script est chargé dans le <head>, juste après les feuilles de style et
// config.js : le navigateur l'exécute avant de dessiner la page.
// C'est un fichier à part (et non un script écrit dans index.html) : ainsi la règle
// de sécurité CSP n'a pas besoin d'empreinte à recalculer quand on le modifie.
//
// Choix possibles : 'omni' (par défaut), 'sombre', 'clair', 'auto'.
// « Auto » suit le réglage de l'appareil : sombre → Omni, clair → Clair.

(function () {
  var THEMES = ['omni', 'sombre', 'clair', 'auto'];
  var CLE = self.CONFIG_APP.idStockage + '-reglages';
  var clair = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function lire() {
    try {
      var r = JSON.parse(localStorage.getItem(CLE) || '{}');
      return THEMES.indexOf(r.theme) >= 0 ? r.theme : 'omni';
    } catch (e) {
      return 'omni';
    }
  }

  function resoudre(choix) {
    if (choix === 'auto') return clair && clair.matches ? 'clair' : 'omni';
    return THEMES.indexOf(choix) >= 0 ? choix : 'omni';
  }

  var choixCourant = lire();

  function appliquer(choix) {
    choixCourant = choix;
    var racine = document.documentElement;
    racine.setAttribute('data-theme', resoudre(choix));
    racine.setAttribute('data-choix-theme', choix);
    // Couleur de la barre du navigateur : celle de la surface du thème (lue dans themes.css).
    var meta = document.querySelector('meta[name="theme-color"]');
    var surface = getComputedStyle(racine).getPropertyValue('--surface').trim();
    if (meta && surface) meta.setAttribute('content', surface);
  }

  // En mode « Auto », suivre le changement de réglage de l'appareil sans recharger.
  if (clair && clair.addEventListener) {
    clair.addEventListener('change', function () {
      if (choixCourant === 'auto') appliquer('auto');
    });
  }

  appliquer(choixCourant);
  self.OracleTheme = { THEMES: THEMES, appliquer: appliquer, resoudre: resoudre, lire: lire };
})();
