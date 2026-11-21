// Onglet « Vaisseaux » (seulement si l'univers a des rencontres de vaisseaux, ex. space opéra) :
// type (D1) avec statistiques et armement, escadrille, escorte, attitude et état (D2).

import * as M from './moteur.js';
import { h, remplacer, riche, champ, vibrer, animerResultat, annoncer } from './ui.js';
import { rendreBloc, texteBrut } from './texte.js';
import { autresColonnes, valeurDePlage, actionsSuggestion } from './composants.js';
import { ecarter } from './actions.js';

const FAMILLES = { alien: 'aliens', humain: 'humains' };

export function creerVueVaisseaux(ctx) {
  const el = h('div', { class: 'vue-vaisseaux' });
  const ecran = { dernier: null, animer: false };

  const tables = () => ({
    d1: ctx.cat.table(ctx.univ.id, ctx.univ.roles.vaisseaux.type),
    d2: ctx.cat.table(ctx.univ.id, ctx.univ.roles.vaisseaux.attitude),
  });

  function rencontre({ valeurType = null, valeurAttitude = null } = {}) {
    const r = M.rencontreVaisseau(ctx.cat, ctx.univ.id, { valeurType, valeurAttitude });
    const e = M.journaliser(ctx.partie, { type: 'vaisseau', rencontre: r });
    ecran.dernier = e.n;
    ecran.animer = true;
    vibrer();
    ctx.enregistrer();
    ctx.annoncerResultat(`${texteBrut(r.type.ligne.texte)} · ${texteBrut(r.attitude.ligne.texte).split(' : ')[0]}`);
  }

  function decrire(r) {
    const { d1, d2 } = tables();
    const lignes = [];
    lignes.push(h('h3', {}, `${d1.titre} (d20 : ${r.type.valeur})`), h('p', { class: 'resultat-titre' }, riche(r.type.ligne.texte)), autresColonnes(d1, r.type.ligne));
    if (r.escadrille) {
      lignes.push(h('p', {}, h('strong', {}, 'Escadrille : '), `${r.escadrille.formule} = ${r.escadrille.total} chasseurs (dé : ${r.escadrille.des.join(', ')}).`));
    }
    if (r.escorte) {
      lignes.push(h('p', {}, h('strong', {}, 'Escorte : '), r.escorte.deploie
        ? `d20 = ${r.escorte.de} (${r.escorte.seuil} ou plus) : une escadrille de ${r.escorte.escadrille.total} chasseurs ${r.escorte.famille ? FAMILLES[r.escorte.famille] : '(aliens ou humains, au choix)'} est déployée (${r.escorte.escadrille.formule}, dé : ${r.escorte.escadrille.des.join(', ')}).`
        : `d20 = ${r.escorte.de} (moins de ${r.escorte.seuil}) : pas d'escorte.`));
    }
    lignes.push(h('h3', {}, `${d2.titre} (d20 : ${r.attitude.valeur})`), h('p', {}, riche(r.attitude.ligne.texte)));
    const v = M.vraisemblance(ctx.commun, r.vraisemblance);
    lignes.push(h('p', { class: 'petit discret' }, `Réaction à une proposition : ${v.texte.toLowerCase()} (${v.autres[0]})${r.attitude.ligne.attitude ? '' : ', par défaut pour cet état'}.`));
    return lignes;
  }

  function rendre() {
    const { d1, d2 } = tables();
    const s = ctx.univ.sections.find((x) => x.id === 'rencontres');
    const sD1 = ctx.univ.sections.find((x) => x.texte.includes(`{{table ${d1.id}}}`));
    const sD2 = ctx.univ.sections.find((x) => x.texte.includes(`{{table ${d2.id}}}`));
    const e = ctx.partie.journal.find((x) => x.n === ecran.dernier);
    const r = e?.rencontre;

    const choixType = champ('Choisir le type à la main', {
      type: 'select', valeur: r ? valeurDePlage(r.type.ligne.plage) : '', 'data-cle': 'vaisseau-type',
      options: [{ valeur: '', texte: 'Type…' }, ...d1.lignes.map((l) => ({ valeur: valeurDePlage(l.plage), texte: `${l.plage} — ${texteBrut(l.texte)}` }))],
    });
    choixType.saisie.addEventListener('change', (ev) => {
      if (ev.target.value) rencontre({ valeurType: Number(ev.target.value), valeurAttitude: r ? r.attitude.valeur : null });
    });
    const choixAttitude = champ('Choisir l\'attitude à la main', {
      type: 'select', valeur: r ? valeurDePlage(r.attitude.ligne.plage) : '', 'data-cle': 'vaisseau-attitude',
      options: [{ valeur: '', texte: 'Attitude…' }, ...d2.lignes.map((l) => ({ valeur: valeurDePlage(l.plage), texte: `${l.plage} — ${texteBrut(l.texte).split(' : ')[0]}` }))],
    });
    choixAttitude.saisie.addEventListener('change', (ev) => {
      if (!ev.target.value) return;
      if (r) {
        // On garde le même vaisseau et on ne change que l'attitude.
        r.attitude = M.tirerTable(d2, { valeur: Number(ev.target.value) });
        r.vraisemblance = M.vraisemblancePourAttitude(ctx.commun, r.attitude.ligne.attitude);
        ecran.animer = true;
        ctx.enregistrer();
      } else rencontre({ valeurAttitude: Number(ev.target.value) });
    });

    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-rencontre' },
      h('div', { class: 'carte-entete' },
        h('h2', { id: 'titre-rencontre' }, 'Rencontre de vaisseau'),
        h('button', { type: 'button', class: 'bouton bouton-accent', 'data-cle': 'vaisseau-tirer', onclick: () => rencontre() }, 'Nouvelle rencontre')),
      h('details', { class: 'petit' }, h('summary', {}, 'Rappel des règles'),
        h('div', { class: 'regles' },
          s && rendreBloc(s.texte),
          sD1 && rendreBloc(sD1.texte),
          sD2 && sD2.texte.length > 1 && rendreBloc(sD2.texte))),
      h('div', { class: 'grille-2' }, choixType, choixAttitude),
      h('p', { class: 'petit discret' }, 'Avec ton vrai dé : choisis le type puis l\'attitude à la main (escadrille et escorte sont lancées par l\'application).'));
    if (r) {
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' }, decrire(r));
      if (ecran.animer) animerResultat(res);
      carte.append(ctx.resultat(res, { cle: `j-${e.n}` }), actionsSuggestion({
        cle: 'vaisseau',
        relancer: () => { ecarter(ctx, e, 'relance'); rencontre(); },
        ignorer: () => { ecarter(ctx, e, 'ignore'); ecran.dernier = null; ctx.enregistrer(); annoncer('Rencontre ignorée.'); },
        afficher: { titre: 'Rencontre', texte: `${r.type.ligne.texte} · ${r.attitude.ligne.texte.split(' : ')[0]}` },
      }), h('div', { class: 'rangee' },
        h('button', {
          type: 'button', class: 'bouton', 'data-cle': 'vaisseau-reaction',
          onclick: () => ctx.preparerOracle({ question: 'Le vaisseau accepte la proposition ?', vraisemblance: r.vraisemblance }),
        }, 'Réaction à une proposition (oracle)'),
        h('button', {
          type: 'button', class: 'bouton', 'data-cle': 'vaisseau-noter',
          onclick: () => {
            ctx.partie.fiche.menaces.push({
              qui: texteBrut(r.type.ligne.texte),
              quoi: texteBrut(r.attitude.ligne.texte),
              consequence: '',
            });
            ctx.enregistrer();
            annoncer('Vaisseau noté dans les menaces de la fiche.');
          },
        }, 'Noter dans les menaces')));
    }
    remplacer(el, carte);
    ecran.animer = false;
  }

  return { el, actualiser: rendre };
}
