// Onglet « Mission » : générateur de mission (T1 à T6), déroulé suggéré et clôture.

import * as M from './moteur.js';
import { h, remplacer, choix, annoncer, vibrer, animerResultat } from './ui.js';
import { rendreBloc } from './texte.js';
import { tirageVerrouillable } from './composants.js';
import { tirerEtNoter, saisieDes, essayer, decrireJet, ecarter } from './actions.js';

export function creerVueMission(ctx) {
  const el = h('div', { class: 'vue-mission' });
  const ecran = { vraisemblance: ctx.commun.oracle.vraisemblanceParDefaut, cloture: null, animer: false };

  const section = (id) => ctx.univ.sections.find((s) => s.id === id);
  const etatMission = () => {
    const p = ctx.partie;
    if (!p.tirageMission) p.tirageMission = {};
    for (const id of ctx.univ.roles.mission) p.tirageMission[id] ||= { valeur: null, verrou: false };
    return p.tirageMission;
  };

  function tirer(id, valeur) {
    const table = ctx.cat.table(ctx.univ.id, id);
    const etat = etatMission()[id];
    if (etat.n) ecarter(ctx, etat.n, 'relance');
    const e = tirerEtNoter(ctx, table, { valeur, contexte: 'mission' });
    etat.valeur = e.valeur;
    etat.n = e.n;
  }

  function ignorer(id) {
    const etat = etatMission()[id];
    if (etat.n) ecarter(ctx, etat.n, 'ignore');
    etat.valeur = null;
    etat.n = null;
    ctx.enregistrer();
    annoncer('Résultat ignoré : la table est à nouveau libre.');
  }

  function tirerTout() {
    const etat = etatMission();
    const libres = ctx.univ.roles.mission.filter((id) => !etat[id].verrou);
    if (!libres.length) { annoncer('Tout est verrouillé : déverrouille une table pour la relancer.'); return; }
    libres.forEach((id) => tirer(id, null));
    vibrer();
    ctx.enregistrer();
    ctx.annoncerResultat(`Mission tirée (${libres.length} table${libres.length > 1 ? 's' : ''}).`);
  }

  function carteGenerateur() {
    const etat = etatMission();
    const intro = section('mission');
    return h('section', { class: 'carte', 'aria-labelledby': 'titre-generateur' },
      h('div', { class: 'carte-entete' },
        h('h2', { id: 'titre-generateur' }, 'Générer la mission'),
        h('button', { type: 'button', class: 'bouton bouton-accent', 'data-cle': 'mission-tout', onclick: tirerTout }, 'Tirer toute la mission')),
      intro && h('div', { class: 'regles' }, rendreBloc(intro.texte)),
      h('p', { class: 'petit discret' }, 'Verrouille un résultat pour le garder quand tu relances les autres. Avec ton vrai dé, choisis la ligne à la main.'),
      ctx.partie.rebondissementSignale && h('p', { class: 'complication' }, h('strong', {}, 'Étau : '), 'la Pression a atteint 7, le rebondissement de la mission est tiré.'),
      h('div', { class: 'grille-tirages' }, ctx.univ.roles.mission.map((id) => tirageVerrouillable(ctx, {
        table: ctx.cat.table(ctx.univ.id, id),
        etat: etat[id],
        cle: `mission-${id}`,
        surTirage: (valeur) => { tirer(id, valeur); ctx.enregistrer(); },
        surVerrou: () => ctx.enregistrer(),
        surIgnorer: () => ignorer(id),
      }))));
  }

  function carteDeroule() {
    const s = section('deroule');
    if (!s) return null;
    return h('section', { class: 'carte', 'aria-labelledby': 'titre-deroule' },
      h('h2', { id: 'titre-deroule' }, s.titre),
      h('div', { class: 'regles' }, rendreBloc(s.texte)));
  }

  function carteCloture() {
    const s = section('cloture');
    const C = ctx.commun;
    const v = M.vraisemblance(C, ecran.vraisemblance);
    const des = saisieDes(ctx, v.jet.mode === 'normal' ? 1 : 2);
    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-cloture' },
      h('h2', { id: 'titre-cloture' }, s ? s.titre : 'Clôture'),
      s && h('div', { class: 'regles' }, rendreBloc(s.texte)),
      choix('Vraisemblance (selon le déroulé réel)', 'vraisemblance-cloture',
        M.vraisemblances(C).map((x) => ({ valeur: x.id, texte: x.texte, detail: x.autres[0] })), ecran.vraisemblance,
        { onchange: (val) => { ecran.vraisemblance = val; rendre(); } }),
      des.el,
      h('div', { class: 'rangee' },
        h('button', {
          type: 'button', class: 'bouton bouton-accent', 'data-cle': 'cloture-poser',
          onclick: () => essayer(() => {
            const e = M.poserQuestion(C, ctx.partie, { question: ctx.univ.cloture.question, vraisemblance: ecran.vraisemblance, des: des.lire() });
            ecran.cloture = e.n;
            ecran.animer = true;
            vibrer();
            ctx.enregistrer();
            const issue = M.issueCloture(ctx.univ, e.reponse);
            ctx.annoncerResultat(`${e.libelle} : ${issue ? issue.texte : ''}`);
          }),
        }, `« ${ctx.univ.cloture.question} »`),
        h('button', { type: 'button', class: 'bouton', 'data-cle': 'mission-suivante', onclick: () => ctx.missionSuivante() }, 'Mission suivante')));
    const e = ctx.partie.journal.find((x) => x.n === ecran.cloture);
    if (e) {
      const issue = M.issueCloture(ctx.univ, e.reponse);
      const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
        h('p', { class: 'resultat-titre' }, e.libelle),
        issue && h('p', {}, h('strong', {}, `${issue.libelle} : `), issue.texte),
        h('p', { class: 'resultat-detail' }, `${M.vraisemblance(C, e.vraisemblance).texte} · ${decrireJet(e.jet)}`));
      if (ecran.animer) animerResultat(res);
      carte.append(ctx.resultat(res));
    }
    return carte;
  }

  function rendre() {
    remplacer(el, carteGenerateur(), h('div', { class: 'grille' }, carteDeroule(), carteCloture()));
    ecran.animer = false;
  }

  return { el, actualiser: rendre };
}
