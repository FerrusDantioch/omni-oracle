// Onglet « Intentions » : ce que fait un ennemi ou un PNJ compagnon à son tour
// (tronc commun, section 5), et ce que fait un vaisseau ennemi (table E, space opéra).

import * as M from './moteur.js';
import { h, remplacer, riche, choix, caseACocher, champ, vibrer, animerResultat, annoncer } from './ui.js';
import { rendreBloc } from './texte.js';
import { saisieDes, essayer, ecarter } from './actions.js';
import { actionsSuggestion } from './composants.js';

const signe = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);

function detailJet(e) {
  let t = `d20 : ${e.de}`;
  for (const m of e.modificateurs) t += ` ${signe(m.valeur)}`;
  if (e.modificateurs.length) t += ` = ${e.total}`;
  if (e.lu !== e.total) t += ` (lu comme ${e.lu})`;
  return `${t} → colonne ${e.plage}`;
}

export function creerVueIntentions(ctx) {
  const el = h('div', { class: 'vue-intentions' });
  const tableI = () => ctx.commun.tables.find((t) => t.id === 'intentions');
  const ecran = {
    pnj: '',               // index du PNJ de la fiche (texte) ou ''
    profil: 'brute',
    blesse: false,
    pression: null,        // null = automatique d'après la Pression en cours
    dernier: null,
    vBlesse: false,
    vPression: null,
    vDernier: null,
    animer: null,
  };
  const seuil = () => tableI().modificateurs.pression.seuil;
  const pressionActive = (choixManuel) => (choixManuel === null ? ctx.partie.pression >= seuil() : choixManuel);

  /** Le MJ ignore une intention : elle reste barrée dans le journal, l'écran se vide. */
  function ignorer(e, champDernier) {
    ecarter(ctx, e, 'ignore');
    ecran[champDernier] = null;
    ctx.enregistrer();
    annoncer('Intention ignorée.');
  }
  const aEu = (e, id) => e.modificateurs.some((m) => m.id === id);

  /** Rappel de la colonne du profil, la ligne obtenue étant marquée (pas seulement par la couleur). */
  function listeColonnes(plages, actions, plageObtenue) {
    return h('ol', { class: 'colonnes-intention' }, plages.map((pl, i) => h('li', { class: pl === plageObtenue ? 'obtenue' : '' },
      h('span', { class: 'plage' }, pl), ' ', riche(actions[i]), pl === plageObtenue && h('strong', {}, ' ◀ résultat'))));
  }

  function boutonsRelance(rejouer) {
    const p = ctx.partie;
    if (!M.optionsUnivers(ctx.univ).omniPoints) return null; // univers sans omni-points
    return h('div', { class: 'rangee' }, h('button', {
      type: 'button', class: 'bouton', disabled: p.oracle.omni <= 0, 'data-cle': 'intention-relance',
      onclick: () => essayer(() => {
        M.depenserOmniOracle(ctx.commun, p, 'relance');
        rejouer(true);
      }),
    }, `L'Oracle relance ce jet (1 omni-point, il en a ${p.oracle.omni})`));
  }

  // --- PNJ ---------------------------------------------------------------------------
  /** Profil et sa table (tronc commun, ou table de l'univers comme F4 en fantasy). */
  const trouver = (id) => M.trouverProfil(ctx.cat, ctx.univ.id, id);
  /** Règles affichées : section 5 du tronc commun, et la section de l'univers pour ses profils. */
  function rappelRegles(table) {
    const sectionUnivers = table.id !== 'intentions' && ctx.univ.sections.find((s) => s.texte.includes(`{{table ${table.id}}}`));
    return h('details', { class: 'petit' }, h('summary', {}, 'Rappel des règles'),
      h('div', { class: 'regles' },
        rendreBloc(ctx.commun.sections.find((s) => s.id === 'intentions').texte),
        sectionUnivers && [h('h3', {}, sectionUnivers.titre), rendreBloc(sectionUnivers.texte)]));
  }

  function cartePNJ() {
    const p = ctx.partie;
    if (!trouver(ecran.profil)) ecran.profil = 'brute';
    const { table: t, ligne: profil } = trouver(ecran.profil);
    const tousProfils = M.tablesProfils(ctx.cat, ctx.univ.id).flatMap((x) => x.lignes);
    const pnjs = p.fiche.pnjs;
    const choisi = ecran.pnj !== '' ? pnjs[Number(ecran.pnj)] : null;
    const selectPNJ = champ('PNJ de la fiche (facultatif)', {
      type: 'select', valeur: ecran.pnj, 'data-cle': 'intention-pnj',
      options: [{ valeur: '', texte: '(aucun : choisis un profil)' }, ...pnjs.map((x, i) => ({ valeur: String(i), texte: `${x.nom}${x.profil && trouver(x.profil) ? ` (${trouver(x.profil).ligne.nom})` : ''}` }))],
    });
    selectPNJ.saisie.addEventListener('change', (e) => {
      ecran.pnj = e.target.value;
      const x = pnjs[Number(e.target.value)];
      if (x && x.profil) ecran.profil = x.profil;
      rendre();
    });
    const sauf = t.modificateurs.blesseSaufProfils || [];
    const exempte = sauf.includes(ecran.profil);
    const nomsSauf = sauf.map((id) => trouver(id)?.ligne.nom).filter(Boolean).join(', ');
    const libelleBlesse = `+${t.modificateurs.blesse} : ${t.modificateurs.libelleBlesse || 'le PNJ a perdu la moitié de ses PV ou plus'}${
      exempte ? ` (sans effet : ${profil.nom})` : nomsSauf ? ` (sauf ${nomsSauf})` : ''}`;
    const des = saisieDes(ctx, 1);

    function jouer(relance = false) {
      const r = M.intentionPNJ(ctx.commun, {
        table: t,
        profil: ecran.profil,
        blesse: ecran.blesse,
        pression: pressionActive(ecran.pression) ? seuil() : 0,
        des: relance ? null : des.lire()?.[0] ?? null,
      });
      const e = M.journaliser(p, { type: 'intention', relance, ...r, nom: choisi ? choisi.nom : '' });
      ecran.dernier = e.n;
      ecran.animer = 'pnj';
      vibrer();
      ctx.enregistrer();
      ctx.annoncerResultat(`${choisi ? choisi.nom : profil.nom} : ${r.action}`);
    }

    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-intention-pnj' },
      h('h2', { id: 'titre-intention-pnj' }, 'Intentions des ennemis et des PNJ compagnons'),
      rappelRegles(t),
      pnjs.length > 0 && selectPNJ,
      choix('Profil', 'intention-profil', tousProfils.map((l) => ({ valeur: l.id, texte: l.nom })), ecran.profil,
        { onchange: (v) => { ecran.profil = v; rendre(); } }),
      h('fieldset', {}, h('legend', {}, 'Modificateurs'),
        caseACocher(libelleBlesse, {
          coche: ecran.blesse, 'data-cle': 'intention-blesse', onchange: (v) => { ecran.blesse = v; },
        }),
        caseACocher(`${signe(t.modificateurs.pression.valeur).replace(' ', '')} : la Pression est de ${seuil()} ou plus (Pression actuelle : ${p.pression})`, {
          coche: pressionActive(ecran.pression), 'data-cle': 'intention-pression', onchange: (v) => { ecran.pression = v; },
        }),
        h('p', { class: 'petit discret' }, 'La case de la Pression se coche toute seule d\'après la Pression en cours.')),
      des.el,
      h('div', { class: 'rangee' },
        h('button', { type: 'button', class: 'bouton bouton-accent bouton-large', 'data-cle': 'intention-jouer', onclick: () => essayer(() => jouer(false)) },
          choisi ? `Que fait ${choisi.nom} ?` : 'Que fait-il ?')),
      choisi && h('div', { class: 'rangee' }, h('button', {
        type: 'button', class: 'bouton', 'data-cle': 'intention-reaction',
        onclick: () => ctx.preparerOracle({
          question: `${choisi.nom} accepte la proposition ou cède à la menace ?`,
          vraisemblance: M.vraisemblancePourAttitude(ctx.commun, choisi.attitude),
        }),
      }, `Réaction de ${choisi.nom} à une proposition ou à une menace`)));

    const e = p.journal.find((x) => x.n === ecran.dernier);
    if (e) {
      const { table: tE, ligne: prof } = trouver(e.profil);
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
        h('p', { class: 'discret' }, `${e.nom ? `${e.nom} · ` : ''}${prof.nom}${e.relance ? ' · relancé par l\'Oracle' : ''}`),
        h('p', { class: 'resultat-titre' }, riche(e.action)),
        h('p', { class: 'resultat-detail' }, detailJet(e)),
        listeColonnes(tE.plages, prof.autres, e.plage),
        boutonsRelance(jouer));
      if (ecran.animer === 'pnj') animerResultat(res);
      carte.append(ctx.resultat(res, { cle: `j-${e.n}` }), actionsSuggestion({
        cle: 'intention',
        // Nouveau d20, même profil et mêmes modificateurs que le résultat écarté.
        relancer: () => essayer(() => {
          const r = M.intentionPNJ(ctx.commun, { table: tE, profil: e.profil, blesse: aEu(e, 'blesse'), pression: aEu(e, 'pression') ? tE.modificateurs.pression.seuil : 0 });
          ecarter(ctx, e, 'relance');
          const n = M.journaliser(p, { type: 'intention', relance: false, ...r, nom: e.nom });
          ecran.dernier = n.n;
          ecran.animer = 'pnj';
          vibrer();
          ctx.enregistrer();
          ctx.annoncerResultat(`${e.nom || prof.nom} : ${r.action}`);
        }),
        ignorer: () => ignorer(e, 'dernier'),
        afficher: { titre: e.nom || prof.nom, texte: e.action },
      }));
    }
    return carte;
  }

  // --- Vaisseau ennemi (table E) -------------------------------------------------------
  function carteVaisseau() {
    const id = ctx.univ.roles.intentionsVaisseau;
    if (!id) return null;
    const p = ctx.partie;
    const E = ctx.cat.table(ctx.univ.id, id);
    const m = E.modificateurs;
    const section = ctx.univ.sections.find((s) => s.texte.includes(`{{table ${id}}}`));
    const des = saisieDes(ctx, 1);

    function jouer(relance = false) {
      const r = M.intentionVaisseau(E, {
        blesse: ecran.vBlesse,
        pression: pressionActive(ecran.vPression) ? m.pression.seuil : 0,
        des: relance ? null : des.lire()?.[0] ?? null,
      });
      const e = M.journaliser(p, { type: 'intention-vaisseau', relance, ...r });
      ecran.vDernier = e.n;
      ecran.animer = 'vaisseau';
      vibrer();
      ctx.enregistrer();
      ctx.annoncerResultat(`Vaisseau ennemi : ${r.action}`);
    }

    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-intention-vaisseau' },
      h('h2', { id: 'titre-intention-vaisseau' }, 'Intentions d\'un vaisseau ennemi'),
      section && h('details', { class: 'petit' }, h('summary', {}, 'Rappel des règles'), h('div', { class: 'regles' }, rendreBloc(section.texte))),
      h('fieldset', {}, h('legend', {}, 'Modificateurs'),
        caseACocher(`+${m.blesse} : le vaisseau a perdu la moitié de ses PV ou plus`, {
          coche: ecran.vBlesse, 'data-cle': 'vaisseau-blesse', onchange: (v) => { ecran.vBlesse = v; },
        }),
        caseACocher(`${signe(m.pression.valeur).replace(' ', '')} : la Pression est de ${m.pression.seuil} ou plus (Pression actuelle : ${p.pression})`, {
          coche: pressionActive(ecran.vPression), 'data-cle': 'vaisseau-pression', onchange: (v) => { ecran.vPression = v; },
        })),
      des.el,
      h('div', { class: 'rangee' },
        h('button', { type: 'button', class: 'bouton bouton-accent bouton-large', 'data-cle': 'vaisseau-jouer', onclick: () => essayer(() => jouer(false)) }, 'Que fait le vaisseau ?')));
    const e = p.journal.find((x) => x.n === ecran.vDernier);
    if (e) {
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
        e.relance && h('p', { class: 'discret' }, 'Relancé par l\'Oracle'),
        h('p', { class: 'resultat-titre' }, riche(e.action)),
        h('p', { class: 'resultat-detail' }, detailJet(e)),
        listeColonnes(E.lignes.map((l) => l.plage), E.lignes.map((l) => l.texte), e.plage),
        boutonsRelance(jouer));
      if (ecran.animer === 'vaisseau') animerResultat(res);
      carte.append(ctx.resultat(res, { cle: `j-${e.n}` }), actionsSuggestion({
        cle: 'intention-vaisseau',
        relancer: () => essayer(() => {
          const r = M.intentionVaisseau(E, { blesse: aEu(e, 'blesse'), pression: aEu(e, 'pression') ? m.pression.seuil : 0 });
          ecarter(ctx, e, 'relance');
          const n = M.journaliser(p, { type: 'intention-vaisseau', relance: false, ...r });
          ecran.vDernier = n.n;
          ecran.animer = 'vaisseau';
          vibrer();
          ctx.enregistrer();
          ctx.annoncerResultat(`Vaisseau ennemi : ${r.action}`);
        }),
        ignorer: () => ignorer(e, 'vDernier'),
        afficher: { titre: 'Vaisseau ennemi', texte: e.action },
      }));
    }
    return carte;
  }

  function rendre() {
    // PNJ choisi depuis la fiche de suivi (bouton « Intention »).
    if (ctx.demandeIntention !== null && ctx.demandeIntention !== undefined) {
      const x = ctx.partie.fiche.pnjs[ctx.demandeIntention];
      if (x) { ecran.pnj = String(ctx.demandeIntention); if (x.profil) ecran.profil = x.profil; }
      ctx.demandeIntention = null;
    }
    remplacer(el, h('div', { class: 'grille' }, cartePNJ(), carteVaisseau()));
    ecran.animer = null;
  }

  return { el, actualiser: rendre };
}
