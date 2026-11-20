// Onglet « Fiche » : la fiche de suivi modifiable (tronc commun, section 7).
// Fils ouverts, PNJ, menaces, lieux, journal de scènes. Elle fait partie de la
// partie : elle est enregistrée sur l'appareil et incluse dans l'export JSON.

import * as M from './moteur.js';
import { h, remplacer, champ, confirmer, annoncer } from './ui.js';
import { ATTITUDES, optionsProfils } from './vue-pnj.js';

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
        const evenement = c.type === 'select' ? 'change' : 'input';
        ch.saisie.addEventListener(evenement, (e) => { o[c.cle] = e.target.value; ctx.enregistrerSansRendu(); });
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
        h('p', { class: 'petit discret' }, `Mission : ${p.mission.nom || 'sans nom'} · scène ${p.scene.numero} · Pression ${p.pression}/10 · omni-points : ${p.pjs.map((x) => `${x.nom} ${x.omni}`).join(', ')}, Oracle ${p.oracle.omni} · seuil de rupture (9) ${p.seuilAtteint ? 'déjà atteint' : 'pas encore atteint'}.`),
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
          { cle: 'profil', etiquette: 'Profil', type: 'select', options: profils },
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
      listeEditable({
        id: 'scenes', titre: 'Journal de scènes', ajout: 'Ajouter une ligne', aide: 'Une ligne par scène (ce qui s\'est passé). Remplie à chaque fin de scène.',
        liste: f.scenes, nouveau: () => ({ numero: p.scene.numero, mission: p.mission.numero, texte: '' }),
        champs: [{ cle: 'texte', etiquette: (o) => `Mission ${o.mission ?? 1} · scène ${o.numero}`, type: 'textarea' }],
        nomElement: (o) => `scène ${o.numero}`,
      }));
  }

  return { el, actualiser: rendre };
}
