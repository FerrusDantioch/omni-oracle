// Petits outils d'affichage partagés par toutes les vues.

import { formaterEnLigne } from './texte.js';

/**
 * Crée un élément HTML.  h('button', { class: 'bouton', onclick: f }, 'Texte')
 * - les attributs commençant par « on » deviennent des écouteurs d'événements ;
 * - les enfants texte sont insérés comme texte (jamais comme HTML) ;
 * - false, null et undefined sont ignorés (pratique pour les conditions).
 */
export function h(tag, attrs = {}, ...enfants) {
  const el = document.createElement(tag);
  for (const [cle, val] of Object.entries(attrs || {})) {
    if (val === false || val === null || val === undefined) continue;
    if (cle.startsWith('on') && typeof val === 'function') el.addEventListener(cle.slice(2), val);
    else if (cle === 'class') el.className = val;
    else if (cle === 'dataset') Object.assign(el.dataset, val);
    else if (val === true) el.setAttribute(cle, '');
    else el.setAttribute(cle, val);
  }
  ajouter(el, enfants);
  return el;
}

/**
 * Ajoute des enfants à un élément en ignorant false, null et undefined (à préférer à
 * el.append(), qui afficherait le mot « null » ou « false » à l'écran).
 */
export function ajouter(el, enfants) {
  for (const e of enfants.flat(Infinity)) {
    if (e === false || e === null || e === undefined) continue;
    el.append(e instanceof Node ? e : String(e));
  }
}

/** Texte avec mise en forme (**gras**…) venant des tables. */
export const riche = (texte) => formaterEnLigne(texte);

/** Vide un élément et y place de nouveaux enfants. */
export function remplacer(el, ...enfants) {
  el.replaceChildren();
  ajouter(el, enfants);
  return el;
}

// --- Annonces ---------------------------------------------------------------------
let minuterie = null;
/** Affiche un court message à l'écran et le fait lire par les lecteurs d'écran. */
export function annoncer(message) {
  const zone = document.getElementById('annonce');
  if (!zone) return;
  zone.textContent = '';
  // petit délai pour que le même message soit relu s'il est répété
  requestAnimationFrame(() => { zone.textContent = message; zone.classList.add('visible'); });
  clearTimeout(minuterie);
  minuterie = setTimeout(() => zone.classList.remove('visible'), 4000);
}

// --- Vibration (désactivable dans les réglages) -------------------------------------
let vibrationActive = true;
export function reglerVibration(actif) { vibrationActive = !!actif; }
export function vibrer(duree = 25) {
  if (vibrationActive && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(duree); } catch { /* certains navigateurs refusent : sans importance */ }
  }
}

/** Fait « apparaître » un résultat (animation courte, désactivée si l'appareil demande moins d'animations). */
export function animerResultat(el) {
  el.classList.remove('apparition');
  void el.offsetWidth; // relance l'animation
  el.classList.add('apparition');
}

// --- Fenêtres (dialog) ----------------------------------------------------------------

/**
 * Ouvre une fenêtre modale.
 * - titre : texte du titre
 * - contenu : élément(s) à afficher
 * - actions : [{ id, texte, classe, auto }] ; les boutons ferment la fenêtre et
 *   la promesse renvoie l'id choisi (ou null si on ferme avec Échap / « Fermer »).
 * - avantFermeture(id, dialogue) : facultatif, renvoie false pour garder la fenêtre ouverte.
 */
export function ouvrirDialogue({ titre, contenu, actions = [{ id: 'ok', texte: 'Fermer' }], classe = '', avantFermeture = null, liste = false }) {
  return new Promise((resoudre) => {
    const idTitre = 'titre-dialogue-' + Math.random().toString(36).slice(2, 8);
    // liste : les actions forment un menu dans le contenu (au lieu d'une rangée en bas)
    const pied = h('div', { class: liste ? 'menu-liste' : 'dialogue-actions' });
    const dlg = h('dialog', { class: `dialogue ${classe}`, 'aria-labelledby': idTitre },
      h('form', { method: 'dialog', class: 'dialogue-corps' },
        h('div', { class: 'dialogue-entete' },
          h('h2', { id: idTitre }, titre),
          h('button', { type: 'button', class: 'bouton bouton-icone', 'aria-label': 'Fermer', onclick: () => fermer(null) }, '✕')),
        h('div', { class: 'dialogue-contenu' }, contenu, liste && pied),
        !liste && pied));
    for (const a of actions) {
      pied.append(h('button', {
        type: a.type || 'button',
        class: `bouton ${a.classe || ''}`,
        onclick: () => fermer(a.id),
      }, a.texte));
    }
    let resultat = null;
    function fermer(id) {
      if (id !== null && avantFermeture && avantFermeture(id, dlg) === false) return;
      resultat = id;
      dlg.close();
    }
    dlg.addEventListener('close', () => { dlg.remove(); resoudre(resultat); });
    dlg.addEventListener('submit', (e) => e.preventDefault());
    document.body.append(dlg);
    dlg.showModal();
    // Focus de départ : un élément marqué autofocus, sinon le 1er choix d'un menu, sinon le
    // bouton principal (le dernier). On évite de focaliser un champ de texte facultatif :
    // sur téléphone, cela ouvrirait le clavier pour rien.
    const premier = dlg.querySelector('[autofocus]')
      || (liste ? pied.querySelector('button') : pied.querySelector('button:last-child'))
      || dlg.querySelector('.dialogue-entete button');
    if (premier) premier.focus({ preventScroll: true });
  });
}

/**
 * « Afficher aux joueurs » : le résultat en très grand, plein écran, lisible depuis
 * l'autre côté de la table. Un toucher (ou Échap, ou Entrée) ferme.
 * - titre : petit texte au-dessus (ex. nom de la table) ; texte : le résultat (**gras** permis).
 */
export function afficherAuxJoueurs({ titre = '', texte }) {
  const retour = document.activeElement;
  const fermer = () => dlg.close();
  const bouton = h('button', { type: 'button', class: 'affichage-joueurs', onclick: fermer },
    titre && h('span', { class: 'affichage-titre' }, riche(titre)),
    h('span', { class: 'affichage-texte' }, riche(texte)),
    h('span', { class: 'affichage-aide' }, 'Toucher pour fermer'));
  const dlg = h('dialog', { class: 'dialogue-joueurs', 'aria-label': 'Résultat affiché aux joueurs' }, bouton);
  dlg.addEventListener('close', () => { dlg.remove(); retour?.focus?.({ preventScroll: true }); });
  document.body.append(dlg);
  dlg.showModal();
  bouton.focus({ preventScroll: true });
  return dlg;
}

/** Demande une confirmation (Oui / Annuler). */
export async function confirmer(titre, message, { oui = 'Confirmer', danger = false } = {}) {
  const r = await ouvrirDialogue({
    titre,
    contenu: h('p', {}, message),
    actions: [
      { id: 'non', texte: 'Annuler' },
      { id: 'oui', texte: oui, classe: danger ? 'bouton-danger' : 'bouton-accent' },
    ],
  });
  return r === 'oui';
}

// --- Champs de formulaire ----------------------------------------------------------------

let compteurChamps = 0;
/** Champ avec son étiquette. type : 'text' | 'number' | 'textarea' | 'select' */
export function champ(etiquette, { type = 'text', valeur = '', options = [], aide = '', ...attrs } = {}) {
  const id = 'champ-' + (++compteurChamps);
  let saisie;
  if (type === 'textarea') saisie = h('textarea', { id, rows: 3, ...attrs }, valeur);
  else if (type === 'select') {
    saisie = h('select', { id, ...attrs }, options.map((o) => h('option', { value: o.valeur, selected: String(o.valeur) === String(valeur) }, o.texte)));
  } else saisie = h('input', { id, type, value: valeur, ...attrs });
  const idAide = aide ? id + '-aide' : null;
  if (idAide) saisie.setAttribute('aria-describedby', idAide);
  const bloc = h('div', { class: 'champ' }, h('label', { for: id }, etiquette), saisie, aide && h('p', { class: 'aide', id: idAide }, aide));
  bloc.saisie = saisie;
  return bloc;
}

/**
 * Groupe de boutons radio présentés comme des boutons (choix exclusif).
 * options : [{ valeur, texte, detail }]
 */
export function choix(legende, nom, options, valeur, { onchange = null, classe = '' } = {}) {
  const fs = h('fieldset', { class: `choix ${classe}` }, h('legend', {}, legende));
  const grille = h('div', { class: 'choix-options' });
  for (const o of options) {
    const id = `${nom}-${o.valeur}-${++compteurChamps}`;
    grille.append(h('div', { class: 'choix-option' },
      h('input', { type: 'radio', name: nom, id, value: o.valeur, checked: o.valeur === valeur, 'data-cle': `${nom}-${o.valeur}`, onchange: onchange && (() => onchange(o.valeur)) }),
      h('label', { for: id }, h('span', { class: 'choix-texte' }, o.texte), o.detail && h('span', { class: 'choix-detail' }, o.detail))));
  }
  fs.append(grille);
  fs.valeur = () => fs.querySelector('input:checked')?.value ?? null;
  return fs;
}

/** Case à cocher avec étiquette. */
export function caseACocher(etiquette, { coche = false, onchange = null, ...attrs } = {}) {
  const id = 'case-' + (++compteurChamps);
  const input = h('input', { type: 'checkbox', id, checked: coche, onchange: onchange && ((e) => onchange(e.target.checked)), ...attrs });
  const bloc = h('div', { class: 'case' }, input, h('label', { for: id }, etiquette));
  bloc.saisie = input;
  return bloc;
}

/** Heure courte « 14:05 » d'une date ISO. */
export function heure(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Date courte « 20/11/2026 ». */
export function dateCourte(iso) {
  return new Date(iso).toLocaleDateString('fr-FR');
}
