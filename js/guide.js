// Guide d'utilisation (guide.html) : le texte est déjà dans la page, ce script ne fait
// qu'activer le bouton « Imprimer ». Sans JavaScript, le guide reste entièrement lisible
// (le bouton reste caché, l'impression passe alors par le menu du navigateur).

const bouton = document.getElementById('bouton-imprimer');
if (bouton && typeof window.print === 'function') {
  bouton.hidden = false;
  bouton.addEventListener('click', () => window.print());
}
