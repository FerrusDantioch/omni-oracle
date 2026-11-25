// Onglet « Fiche » : la fiche de suivi modifiable (tronc commun, section 7).
// Fils ouverts, PNJ, menaces, lieux, journal de scènes. Elle fait partie de la
// partie : elle est enregistrée sur l'appareil et incluse dans l'export JSON.
// Un univers peut ajouter des rubriques (options.fiche, ex. indices en horreur) et
// un suivi des chocs et de la folie de chaque PJ (options.chocs).

import * as M from './moteur.js';
import { h, remplacer, champ, confirmer, annoncer, caseACocher, riche } from './ui.js';
import { ATTITUDES, optionsProfils } from './vue-pnj.js';
import { convertirEnFolie, donnerChocs, ecarter, saisieDes, essayer } from './actions.js';
import { actionsSuggestion, boutonsChocs } from './composants.js';
import { texteBrut } from './texte.js';

export function creerVueFiche(ctx) {
  const el = h('div', { class: 'vue-fiche' });

  /**
   * Liste modifiable.
   * - liste : tableau d'objets (modifié sur place)
   * - champs : [{ cle, etiquette, type, options }]
   * - nomElement(o, i) : nom lisible d'un élément (pour les boutons « Supprimer »)
   */
  function listeEditable({ id, titre, aide, liste, champs, nouveau, nomElement, ajout, actions = null }) {
    const idTitre = `titre-fiche-${id}`;
    const elements = liste.map((o, i) => {
      const bloc = h('div', { class: 'ligne-fiche' });
      for (const c of champs) {
        const ch = champ(typeof c.etiquette === 'function' ? c.etiquette(o) : c.etiquette, {
          type: c.type || 'text', valeur: o[c.cle] ?? '', options: c.options || [],
          rows: c.type === 'textarea' ? 2 : undefined, 'data-cle': `fiche-${id}-${i}-${c.cle}`,
        });
        ch.classList.add(`champ-${c.cle}`);
        if (c.type === 'textarea') ch.classList.add('champ-large');
        const evenement = c.type === 'select' ? 'change' : 'input';
        ch.saisie.addEventListener(evenement, (e) => {
          o[c.cle] = e.target.value;
          ctx.enregistrerSansRendu();
          if (c.onchange) c.onchange(e.target.value, bloc, i);
        });
        bloc.append(ch);
      }
      bloc.append(h('div', { class: 'rangee' },
        actions && actions(o, i),
        h('button', {
          type: 'button', class: 'bouton bouton-discret', 'data-cle': `fiche-${id}-${i}-suppr`,
          onclick: async () => {
            if (!(await confirmer('Supprimer', `Supprimer « ${nomElement(o, i)} » de la fiche ?`, { oui: 'Supprimer', danger: true }))) return;
            liste.splice(i, 1);
            ctx.enregistrer();
            annoncer('Supprimé de la fiche.');
          },
        }, 'Supprimer')));
      return bloc;
    });
    return h('section', { class: 'carte', 'aria-labelledby': idTitre },
      h('div', { class: 'carte-entete' },
        h('h2', { id: idTitre }, titre, ' ', h('span', { class: 'discret' }, `(${liste.length})`)),
        h('button', {
          type: 'button', class: 'bouton', 'data-cle': `fiche-${id}-ajout`,
          onclick: () => {
            liste.push(nouveau());
            ctx.enregistrer();
            const champs = el.querySelectorAll(`[data-cle^="fiche-${id}-${liste.length - 1}-"]`);
            champs[0]?.focus();
          },
        }, `+ ${ajout}`)),
      aide && h('p', { class: 'petit discret' }, aide),
      elements.length ? elements : h('p', { class: 'discret' }, 'Rien pour l\'instant.'));
  }

  function rendre() {
    const p = ctx.partie;
    const f = p.fiche;
    const profils = optionsProfils(ctx);
    const nomProfil = (id) => profils.find((x) => x.valeur === id)?.texte;
    remplacer(el,
      h('div', { class: 'carte' },
        h('div', { class: 'carte-entete' },
          h('h2', {}, 'Fiche de suivi'),
          h('button', { type: 'button', class: 'bouton', 'data-cle': 'fiche-exporter', onclick: () => ctx.exporter() }, 'Exporter la partie')),
        h('p', { class: 'petit discret' }, `${ctx.voc.Nom} : ${p.mission.nom || 'sans nom'} · scène ${p.scene.numero} · Pression ${p.pression}/10`,
          // Univers sans omni-points (ex. horreur) : pas de ligne « Omni-points » sur la fiche.
          M.optionsUnivers(ctx.univ).omniPoints && ` · omni-points : ${p.pjs.map((x) => `${x.nom} ${x.omni}`).join(', ')}, Oracle ${p.oracle.omni}`,
          ` · seuil de rupture (9) ${p.seuilAtteint ? 'déjà atteint' : 'pas encore atteint'}.`),
        h('p', { class: 'petit discret' }, 'Tout ce que tu écris ici est enregistré automatiquement et inclus dans l\'export de la partie.')),
      listeEditable({
        id: 'fils', titre: 'Fils ouverts', ajout: 'Ajouter un fil', aide: 'Une ligne par intrigue en cours.',
        liste: f.fils, nouveau: () => ({ texte: '' }),
        champs: [{ cle: 'texte', etiquette: 'Intrigue', type: 'textarea' }],
        nomElement: (o, i) => o.texte || `fil ${i + 1}`,
      }),
      listeEditable({
        id: 'pnjs', titre: 'PNJ', ajout: 'Ajouter un PNJ', aide: 'Nom, rôle, attitude, profil d\'intention, notes.',
        liste: f.pnjs, nouveau: () => ({ nom: '', role: '', attitude: 'neutre', profil: '', notes: '' }),
        champs: [
          { cle: 'nom', etiquette: 'Nom' },
          { cle: 'role', etiquette: 'Rôle' },
          { cle: 'attitude', etiquette: 'Attitude', type: 'select', options: ATTITUDES },
          {
            cle: 'profil', etiquette: 'Profil', type: 'select', options: profils,
            onchange: (val, bloc, i) => {
              // Met à jour le bouton « Intention » sans redessiner pour préserver le focus.
              const btn = bloc.querySelector(`[data-cle="fiche-pnjs-${i}-intention"]`);
              if (!btn) return;
              btn.disabled = !val;
              btn.title = val ? `Profil : ${nomProfil(val)}` : 'Choisis d\'abord un profil';
            },
          },
          { cle: 'notes', etiquette: 'Notes', type: 'textarea' },
        ],
        nomElement: (o, i) => o.nom || `PNJ ${i + 1}`,
        actions: (o, i) => [
          h('button', {
            type: 'button', class: 'bouton', 'data-cle': `fiche-pnjs-${i}-intention`, disabled: !o.profil,
            title: o.profil ? `Profil : ${nomProfil(o.profil)}` : 'Choisis d\'abord un profil',
            onclick: () => { ctx.demandeIntention = i; ctx.aller('intentions'); },
          }, 'Intention'),
          h('button', {
            type: 'button', class: 'bouton', 'data-cle': `fiche-pnjs-${i}-reaction`,
            onclick: () => ctx.preparerOracle({
              question: `${o.nom || 'Le PNJ'} accepte la proposition ou cède à la menace ?`,
              vraisemblance: M.vraisemblancePourAttitude(ctx.commun, o.attitude),
            }),
          }, 'Réaction à une proposition ou à une menace'),
        ],
      }),
      listeEditable({
        id: 'menaces', titre: 'Menaces', ajout: 'Ajouter une menace', aide: 'Qui, quoi, ce qui arrive si on ne fait rien.',
        liste: f.menaces, nouveau: () => ({ qui: '', quoi: '', consequence: '' }),
        champs: [
          { cle: 'qui', etiquette: 'Qui' },
          { cle: 'quoi', etiquette: 'Quoi' },
          { cle: 'consequence', etiquette: 'Ce qui arrive si on ne fait rien', type: 'textarea' },
        ],
        nomElement: (o, i) => o.qui || `menace ${i + 1}`,
      }),
      listeEditable({
        id: 'lieux', titre: 'Lieux', ajout: 'Ajouter un lieu', aide: 'Nom, détail marquant.',
        liste: f.lieux, nouveau: () => ({ nom: '', detail: '' }),
        champs: [{ cle: 'nom', etiquette: 'Nom' }, { cle: 'detail', etiquette: 'Détail marquant' }],
        nomElement: (o, i) => o.nom || `lieu ${i + 1}`,
      }),
      // Rubriques propres à l'univers (ex. horreur : indices, suspects et témoins, chronologie).
      M.optionsUnivers(ctx.univ).fiche.map((r) => {
        f[r.id] ||= [];
        const champs = r.champs.map((c) => (c.type === 'attitude' ? { ...c, type: 'select', options: ATTITUDES } : c));
        return listeEditable({
          id: r.id, titre: r.titre, ajout: r.ajout, aide: r.aide, liste: f[r.id],
          nouveau: () => Object.fromEntries(r.champs.map((c) => [c.cle, c.type === 'attitude' ? 'neutre' : ''])),
          champs,
          nomElement: (o, i) => o[r.champs[0].cle] || `${r.titre.toLowerCase()} ${i + 1}`,
        });
      }),
      carteChocs(),
      listeEditable({
        id: 'scenes', titre: 'Journal de scènes', ajout: 'Ajouter une ligne', aide: 'Une ligne par scène (ce qui s\'est passé). Remplie à chaque fin de scène.',
        liste: f.scenes, nouveau: () => ({ numero: p.scene.numero, mission: p.mission.numero, texte: '' }),
        champs: [{ cle: 'texte', etiquette: (o) => `${ctx.voc.Nom} ${o.mission ?? 1} · scène ${o.numero}`, type: 'textarea' }],
        nomElement: (o) => `scène ${o.numero}`,
      }));
  }

  // --- Chocs et folie (horreur) ---------------------------------------------------------
  /** Petit compteur − valeur + (cibles de 44 px). */
  function compteur(etiquette, valeur, cle, changer) {
    return h('div', { class: 'champ' },
      h('span', { class: 'etiquette-compteur', id: `etiq-${cle}` }, etiquette),
      h('div', { class: 'compteur', role: 'group', 'aria-labelledby': `etiq-${cle}` },
        h('button', { type: 'button', class: 'bouton', 'aria-label': `${etiquette} : moins 1`, 'data-cle': `${cle}-moins`, onclick: () => changer(-1) }, '−'),
        h('output', { class: 'valeur-compteur', 'data-cle': `${cle}-valeur` }, String(valeur)),
        h('button', { type: 'button', class: 'bouton', 'aria-label': `${etiquette} : plus 1`, 'data-cle': `${cle}-plus`, onclick: () => changer(+1) }, '+')));
  }

  /** Dernier jet de folie d'un PJ : effet, intertitre, et boutons du MJ. */
  function resultatFolie(pj) {
    const p = ctx.partie;
    const e = p.journal.find((x) => x.n === pj.derniereFolie && !x.ecarte);
    if (!e) return null;
    const res = h('div', { class: 'resultat', 'aria-live': 'polite' },
      h('p', { class: 'discret' }, `${e.titre} · d20 : ${e.de}${e.bonus ? ` + ${e.bonus} (points de folie) = ${e.total}` : ''}`),
      e.groupe && h('p', { class: 'petit' }, riche(e.groupe)),
      h('p', { class: 'resultat-titre' }, riche(e.nom)),
      e.texte && h('p', {}, riche(e.texte)));
    const autres = p.pjs.filter((x) => x.id !== pj.id).map((x) => x.id);
    return [
      ctx.resultat(res, { cle: `j-${e.n}` }),
      actionsSuggestion({
        cle: `folie-${pj.id}`,
        // Relancer : nouveau jet, sans toucher aux chocs ni aux points de folie déjà comptés.
        relancer: () => essayer(() => {
          ecarter(ctx, e, 'relance');
          pj.derniereFolie = M.tirerFolie(ctx.cat, ctx.univ.id, p, pj.id, { aggravation: !!p.folieAggravee }).n;
          ctx.enregistrer();
        }),
        ignorer: () => { ecarter(ctx, e, 'ignore'); pj.derniereFolie = null; ctx.enregistrer(); annoncer('Effet de folie ignoré.'); },
        afficher: { titre: `${pj.nom} · ${e.titre}`, texte: e.texte ? `${e.nom} — ${e.texte}` : e.nom },
      }),
      h('div', { class: 'rangee' },
        h('button', {
          type: 'button', class: 'bouton', 'data-cle': `folie-${pj.id}-sequelle`,
          onclick: () => {
            const ligne = `${texteBrut(e.nom)} : ${e.texte}`;
            pj.sequelles = pj.sequelles ? `${pj.sequelles}\n${ligne}` : ligne;
            ctx.enregistrer();
            annoncer('Noté dans les séquelles en cours.');
          },
        }, 'Noter dans les séquelles')),
      // Effet 11 (transfert de peur) : l'allié visé peut prendre 1 point de choc.
      e.chocAllie > 0 && boutonsChocs(ctx, { cle: `folie-${pj.id}-allie`, nombres: [e.chocAllie], pour: autres, motif: 'transfert de peur' }),
    ];
  }

  function carteChocs() {
    const o = M.optionsUnivers(ctx.univ).chocs;
    if (!o) return null;
    const p = ctx.partie;
    const folieTable = ctx.cat.table(ctx.univ.id, o.folie);
    const option = ctx.univ.sections.find((s) => s.id === 'folie-aggravation');
    const carte = h('section', { class: 'carte', 'aria-labelledby': 'titre-fiche-chocs', id: 'fiche-chocs' },
      h('h2', { id: 'titre-fiche-chocs' }, 'Chocs et folie'),
      h('p', { class: 'petit discret' }, `${o.alerte} + un jet sur la table « ${folieTable.titre} ».`),
      caseACocher(`Option : ${option ? texteBrut(option.titre).replace(/^OPTION : /i, '').toLowerCase() : 'la folie s\'aggrave avec l\'accumulation'} (1d20 + points de folie)`, {
        coche: !!p.folieAggravee, 'data-cle': 'folie-aggravation',
        onchange: (v) => { p.folieAggravee = v; ctx.enregistrer(); },
      }));
    for (const pj of p.pjs) {
      const chocs = pj.chocs || 0;
      const des = saisieDes(ctx, 1, `Ton d20 de folie (${pj.nom})`);
      const sequelles = champ('Séquelles en cours', { type: 'textarea', rows: 2, valeur: pj.sequelles || '', 'data-cle': `fiche-${pj.id}-sequelles` });
      sequelles.saisie.addEventListener('input', (ev) => { pj.sequelles = ev.target.value; ctx.enregistrerSansRendu(); });
      carte.append(h('div', { class: `ligne-fiche ligne-chocs${chocs >= o.seuil ? ' alerte' : ''}` },
        h('h3', {}, pj.nom),
        compteur('Points de choc', chocs, `fiche-${pj.id}-chocs`, (d) => (d > 0 ? donnerChocs(ctx, pj.id, d) : (M.ajouterChocs(ctx.univ, p, pj.id, d), ctx.enregistrer()))),
        compteur('Points de folie', pj.folie || 0, `fiche-${pj.id}-folie`, (d) => { M.ajusterFolie(ctx.univ, p, pj.id, d); ctx.enregistrer(); }),
        chocs >= o.seuil && h('div', { class: 'alerte-chocs' },
          h('p', {}, h('strong', {}, `${o.alerte} : `), `${pj.nom} a ${chocs} points de choc.`),
          des.el,
          h('button', {
            type: 'button', class: 'bouton bouton-accent', 'data-cle': `fiche-${pj.id}-convertir`,
            onclick: () => essayer(() => convertirEnFolie(ctx, pj.id, { des: des.lire()?.[0] ?? null })),
          }, `Convertir ${o.seuil} chocs en 1 point de folie`)),
        sequelles,
        resultatFolie(pj)));
    }
    return carte;
  }

  return {
    el,
    actualiser() {
      rendre();
      // Demande d'un autre écran (conversion en folie) : montrer la carte des chocs.
      if (ctx.demandeFiche === 'chocs') {
        ctx.demandeFiche = null;
        requestAnimationFrame(() => el.querySelector('#fiche-chocs')?.scrollIntoView({ block: 'start' }));
      }
    },
  };
}
