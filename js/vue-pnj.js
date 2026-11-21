// Onglet « PNJ » : générateur de PNJ (rôle, trait, motivation) et ajout à la fiche de suivi.

import * as M from './moteur.js';
import { h, remplacer, champ, choix, annoncer, vibrer } from './ui.js';
import { texteBrut, rendreBloc } from './texte.js';
import { tirageVerrouillable } from './composants.js';

export const ATTITUDES = [
  { valeur: 'hostile', texte: 'Hostile' },
  { valeur: 'neutre', texte: 'Neutre' },
  { valeur: 'amical', texte: 'Amical' },
];

/** Liste des profils d'intention pour une liste déroulante. */
export function optionsProfils(ctx, { vide = true } = {}) {
  const profils = ctx.commun.tables.find((t) => t.id === 'intentions').lignes;
  return [...(vide ? [{ valeur: '', texte: '(aucun)' }] : []), ...profils.map((p) => ({ valeur: p.id, texte: p.nom }))];
}

export function creerVueGenerateurPNJ(ctx) {
  const el = h('div', { class: 'vue-pnj' });
  const roles = ctx.univ.roles.pnj; // { role: 'N1', trait: 'N2', motivation: 'N3' }
  const neuf = () => ({
    tirages: Object.fromEntries(Object.keys(roles).map((k) => [k, { valeur: null, verrou: false }])),
    nom: '', attitude: 'neutre', profil: '', notes: '',
  });
  let pnj = neuf();

  function tirer(cle, valeur) {
    pnj.tirages[cle].valeur = valeur ?? M.deAleatoire(20);
  }

  function rendre() {
    const tables = Object.fromEntries(Object.entries(roles).map(([k, id]) => [k, ctx.cat.table(ctx.univ.id, id)]));
    const intro = ctx.univ.sections.find((s) => s.id === 'pnj');
    const nom = champ('Nom', { type: 'text', valeur: pnj.nom, 'data-cle': 'pnj-nom', placeholder: 'Nom libre' });
    nom.saisie.addEventListener('input', (e) => { pnj.nom = e.target.value; });
    const notes = champ('Notes (facultatif)', { type: 'textarea', rows: 2, valeur: pnj.notes, 'data-cle': 'pnj-notes' });
    notes.saisie.addEventListener('input', (e) => { pnj.notes = e.target.value; });
    const profil = champ('Profil d\'intention', { type: 'select', valeur: pnj.profil, options: optionsProfils(ctx), 'data-cle': 'pnj-profil' });
    profil.saisie.addEventListener('change', (e) => { pnj.profil = e.target.value; });

    const n2 = tables.trait;
    remplacer(el,
      h('section', { class: 'carte', 'aria-labelledby': 'titre-gen-pnj' },
        h('div', { class: 'carte-entete' },
          h('h2', { id: 'titre-gen-pnj' }, 'Générer un PNJ'),
          h('button', {
            type: 'button', class: 'bouton bouton-accent', 'data-cle': 'pnj-tout',
            onclick: () => {
              const libres = Object.keys(roles).filter((k) => !pnj.tirages[k].verrou);
              libres.forEach((k) => tirer(k, null));
              vibrer();
              rendre();
              ctx.annoncerResultat('PNJ tiré.');
            },
          }, 'Tirer les trois')),
        intro && h('div', { class: 'regles' }, rendreBloc(intro.texte)),
        n2.reference && h('p', { class: 'petit discret' }, `Le trait (${n2.id}) reprend la table ${n2.reference.table} ${ctx.cat.origine(n2.reference)}, commune à tous les univers.`),
        h('div', { class: 'grille-tirages' }, Object.entries(tables).map(([k, t]) => tirageVerrouillable(ctx, {
          table: t, etat: pnj.tirages[k], cle: `pnj-${k}`,
          surTirage: (valeur) => { tirer(k, valeur); if (valeur === null) vibrer(); rendre(); },
          surVerrou: rendre,
        })))),
      h('section', { class: 'carte', 'aria-labelledby': 'titre-ajout-pnj' },
        h('h2', { id: 'titre-ajout-pnj' }, 'Ajouter à la partie'),
        nom,
        choix('Attitude', 'pnj-attitude', ATTITUDES, pnj.attitude, { onchange: (v) => { pnj.attitude = v; } }),
        profil,
        notes,
        h('div', { class: 'rangee' }, h('button', {
          type: 'button', class: 'bouton bouton-accent', 'data-cle': 'pnj-ajouter',
          onclick: () => {
            const lire = (k) => {
              const v = pnj.tirages[k].valeur;
              return v ? texteBrut(M.ligneParValeur(tables[k], v).texte) : '';
            };
            const details = [lire('trait') && `Trait : ${lire('trait')}`, lire('motivation') && `Motivation : ${lire('motivation')}`, pnj.notes.trim()].filter(Boolean);
            const fiche = {
              nom: pnj.nom.trim() || lire('role') || 'PNJ sans nom',
              role: lire('role'),
              attitude: pnj.attitude,
              profil: pnj.profil,
              notes: details.join('\n'),
            };
            ctx.partie.fiche.pnjs.push(fiche);
            M.journaliser(ctx.partie, { type: 'note', texte: `Nouveau PNJ : ${fiche.nom}${fiche.role ? ` (${fiche.role})` : ''}` });
            pnj = neuf();
            ctx.enregistrer();
            annoncer(`${fiche.nom} est ajouté à la fiche de suivi.`);
          },
        }, 'Ajouter à la fiche de suivi')),
        h('p', { class: 'petit discret' }, 'Les PNJ de la partie se trouvent dans l\'onglet Fiche.')));
  }

  return { el, actualiser: rendre };
}
