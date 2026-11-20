// Thème appliqué AVANT l'affichage de la page (évite l'éclair du mauvais thème).
//
// Ce petit script est chargé dans le <head>, juste après les feuilles de style et
// config.js : le navigateur l'exécute avant de dessiner la page.
// C'est un fichier à part (et non un script écrit dans index.html) : ainsi la règle
// de sécurité CSP n'a pas besoin d'empreinte à recalculer quand on le modifie.
//
// Choix possibles : 'omni' (par défaut), 'sombre', 'clair', 'auto'.
// « Auto » suit le réglage de l'appareil : sombre → Omni, clair → Clair.
//
// Il applique aussi la luminosité choisie dans les Réglages (50 à 100 %), elle aussi
// avant l'affichage, pour éviter un éclair de pleine lumière le soir.

(function () {
  var THEMES = ['omni', 'sombre', 'clair', 'auto'];
  var CLE = self.CONFIG_APP.idStockage + '-reglages';
  var clair = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function reglages() {
    try {
      return JSON.parse(localStorage.getItem(CLE) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function lire() {
    var r = reglages();
    return THEMES.indexOf(r.theme) >= 0 ? r.theme : 'omni';
  }

  // Luminosité en % (50 à 100). En dessous de 100, la page ET les fenêtres sont assombries
  // (css/app.css et css/livret.css : html[data-luminosite]). Jamais à l'impression.
  function luminosite(pourcent) {
    var p = Math.min(100, Math.max(50, Math.round(Number(pourcent) || 100)));
    var racine = document.documentElement;
    if (p < 100) {
      racine.setAttribute('data-luminosite', String(p));
      racine.style.setProperty('--luminosite', String(p / 100));
    } else {
      racine.removeAttribute('data-luminosite');
      racine.style.removeProperty('--luminosite');
    }
    return p;
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
  luminosite(reglages().luminosite);
  self.OracleTheme = { THEMES: THEMES, appliquer: appliquer, resoudre: resoudre, lire: lire, luminosite: luminosite };
})();
