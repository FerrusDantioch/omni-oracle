// =============================================================================
// Omni-Oracle : point d'entrée de l'application.
// Accueil (parties enregistrées, nouvelle partie), tableau de bord, onglets, menu.
// Les règles sont dans js/moteur.js ; les données dans data/*.json.
// =============================================================================

import * as M from './moteur.js';
import { chargerDonnees } from './donnees.js';
import * as S from './stockage.js';
import {
  h, remplacer, annoncer, ouvrirDialogue, confirmer, champ, choix, caseACocher,
  reglerVibration, dateCourte, vibrer, riche,
} from './ui.js';
import { dialogueOmniPJ, dialogueOmniOracle, messageEvenement, essayer } from './actions.js';
import { creerVueJouer } from './vue-jouer.js';
import { creerVueJournal } from './vue-journal.js';
import { creerVueMission } from './vue-mission.js';
import { creerVueGenerateurPNJ } from './vue-pnj.js';
import { creerVueIntentions } from './vue-intentions.js';
import { creerVueVaisseaux } from './vue-vaisseaux.js';
import { creerVueFiche } from './vue-fiche.js';
import { creerVueTables } from './vue-tables.js';
import { initialiserPWA } from './pwa.js';
import { dialogueAPropos, dialogueInstallation } from './apropos.js';

const CONFIG = globalThis.CONFIG_APP;

// Onglets de la partie. `si(univers)` : l'onglet n'apparaît que si l'univers le permet.
const ONGLETS = [
  { id: 'jouer', texte: 'Jouer', creer: creerVueJouer },
  { id: 'mission', texte: (u) => M.vocabulaire(u).Nom, creer: creerVueMission },
  { id: 'pnj', texte: 'PNJ', creer: creerVueGenerateurPNJ },
  { id: 'intentions', texte: 'Intentions', creer: creerVueIntentions },
  { id: 'vaisseaux', texte: (u) => u.roles.rencontres.onglet, creer: creerVueVaisseaux, si: (u) => !!u.roles.rencontres },
  { id: 'fiche', texte: 'Fiche', creer: creerVueFiche },
  { id: 'tables', texte: 'Tables', creer: creerVueTables },
  { id: 'journal', texte: 'Journal', creer: creerVueJournal },
];


const $ = (id) => document.getElementById(id);

// --- Contexte partagé avec les vues -----------------------------------------------
const ctx = {
  cat: null,
  partie: null,
  reglages: S.lireReglages(),
  vues: {},
  onglet: 'jouer',
  demandeOracle: null,     // { question, vraisemblance } : à préremplir dans l'onglet Jouer
  demandeIntention: null,  // index d'un PNJ de la fiche : à présélectionner dans l'onglet Intentions
  get commun() { return this.cat.commun; },
  get univ() { return this.cat.univ(this.partie.univers); },
  /** « mission », ou le mot de l'univers (« quête », « mystère »), avec ses accords. */
  get voc() { return M.vocabulaire(this.univ); },

  /** Enregistre la partie sur l'appareil, puis met l'écran à jour. */
  enregistrer() {
    this.partie.modifie = new Date().toISOString();
    if (!S.enregistrerPartie(this.partie)) {
      annoncer('Attention : l\'enregistrement sur l\'appareil a échoué (stockage plein ?). Exporte ta partie.');
    }
    actualiser();
  },
  /** Enregistre sans redessiner l'écran (saisie dans la fiche de suivi). */
  enregistrerSansRendu() {
    this.partie.modifie = new Date().toISOString();
    S.enregistrerPartie(this.partie);
  },
  exporter() {
    S.exporterPartie(this.partie); // note aussi la date de l'export (rappel de sauvegarde)
    S.protegerStockage();
    actualiser();
    annoncer('Fichier de la partie enregistré.');
  },
  missionSuivante() { dialogueMissionSuivante(); },
  /** Ouvre l'oracle de question (onglet Jouer) avec une question et une vraisemblance préparées. */
  preparerOracle(demande) {
    this.demandeOracle = demande;
    allerOnglet('jouer');
  },
  sauverReglages() {
    S.ecrireReglages(this.reglages);
    reglerVibration(this.reglages.vibration);
  },
  /** Affiche les événements importants (seuil de rupture, gain de l'Oracle, rebondissement). */
  async signaler(evenements = []) {
    // Étau (Pression 7) : le rebondissement est tiré s'il ne l'est pas encore (sauf avec le vrai dé).
    evenements = evenements.map((e) => (e.type === 'rebondissement'
      ? { ...e, etau: M.rebondissementEtau(this.cat, this.univ.id, this.partie, { dePhysique: this.reglages.dePhysique }) }
      : e));
    if (evenements.some((e) => e.etau?.tire)) this.enregistrer();
    const messages = evenements.map((e) => messageEvenement(e, this.voc)).filter(Boolean);
    // « Option à tester » (horreur, si cochée) : au seuil de rupture, le rebondissement est tiré.
    const auSeuil = evenements.some((e) => e.type === 'seuil-rupture') && M.rebondissementAuSeuil(this.cat, this.univ.id, this.partie);
    if (auSeuil) {
      this.enregistrer();
      messages.push(`Option à tester : le rebondissement ${this.voc.de} n'était pas encore tiré, il l'est maintenant (${auSeuil.titre}, d20 : ${auSeuil.valeur}).`);
    }
    if (!messages.length) return;
    vibrer(60);
    const rebond = auSeuil || evenements.some((e) => e.type === 'rebondissement');
    const r = await ouvrirDialogue({
      titre: 'À noter',
      contenu: h('ul', {}, messages.map((m) => h('li', {}, riche(m)))),
      actions: rebond
        ? [{ id: 'ok', texte: 'Fermer' }, { id: 'mission', texte: `Voir ${this.voc.la}`, classe: 'bouton-accent' }]
        : [{ id: 'ok', texte: 'Fermer' }],
    });
    if (r === 'mission') allerOnglet('mission');
  },
  /** Résultats déjà révélés par un toucher (réglage « Masquer les résultats »), pour la séance. */
  reveles: new Set(),
  /**
   * Emballage des résultats. Avec le réglage « Masquer les résultats (écran visible
   * des joueurs) », le résultat est flouté ; un toucher le révèle.
   * - cle : identifiant stable du résultat (ex. n° du journal), pour qu'il reste
   *   révélé quand l'écran se redessine.
   */
  resultat(el, { cle = null } = {}) {
    if (!this.reglages.secret || (cle !== null && this.reveles.has(cle))) return el;
    const contenu = h('div', { class: 'masquable-contenu', inert: true, 'aria-hidden': 'true' }, el);
    const bloc = h('div', { class: 'masquable masque' }, contenu);
    bloc.append(h('button', {
      type: 'button', class: 'bouton bouton-reveler', 'data-cle': cle !== null ? `reveler-${cle}` : null,
      onclick: (ev) => {
        // Résultat repérable : on le note révélé et on redessine (ex. la ligne tirée
        // se marque aussi dans la liste de l'onglet Tables).
        if (cle !== null) { this.reveles.add(cle); actualiser(); return; }
        contenu.inert = false;
        contenu.removeAttribute('aria-hidden');
        bloc.classList.remove('masque');
        ev.currentTarget.remove();
        contenu.querySelector('button, [tabindex]')?.focus({ preventScroll: true });
      },
    }, h('span', {}, 'Résultat masqué : toucher pour révéler')));
    return bloc;
  },
  /** Annonce un résultat, sauf s'il est masqué (il serait lu à voix haute). */
  annoncerResultat(message) {
    annoncer(this.reglages.secret ? 'Résultat tiré (masqué).' : message);
  },
  aller(id) { allerOnglet(id); },
};

// --- Mise à jour de l'écran en gardant le focus clavier -----------------------------
function garderFocus(f) {
  const cle = document.activeElement?.dataset?.cle;
  f();
  if (cle) {
    const cible = document.querySelector(`[data-cle="${CSS.escape(cle)}"]`);
    if (cible && !cible.disabled) cible.focus({ preventScroll: true });
  }
}

function actualiser() {
  garderFocus(() => {
    if (!ctx.partie) return;
    rendreTableauDeBord();
    ctx.vues[ctx.onglet]?.actualiser();
  });
}

// --- Démarrage -------------------------------------------------------------------------

async function demarrer() {
  reglerVibration(ctx.reglages.vibration);
  $('bouton-menu').addEventListener('click', ouvrirMenu);
  initialiserPWA({ bouton: $('bouton-maj') });
  try {
    ctx.cat = await chargerDonnees();
  } catch (e) {
    remplacer($('contenu'), h('div', { class: 'carte' },
      h('h2', {}, 'Impossible de charger l\'oracle'),
      h('p', {}, 'Les tables n\'ont pas pu être lues. Vérifie ta connexion pour le premier chargement, puis recharge la page.'),
      h('p', { class: 'petit discret' }, e.message)));
    return;
  }
  const id = S.lireCourante();
  const p = id && S.lirePartie(id);
  if (p && !S.verifierPartie(p, ctx.cat.univers.map((u) => u.id))) ouvrirPartie(p);
  else afficherAccueil();
}

// --- Accueil -------------------------------------------------------------------------------
function afficherAccueil() {
  ctx.partie = null;
  ctx.vues = {};
  S.ecrireCourante(null);
  $('tableau-de-bord').hidden = true;
  $('onglets').hidden = true;
  majTitre();
  // Lien vers le guide : bien en vue tant qu'aucune partie n'est enregistrée sur l'appareil,
  // puis plus discret, en bas de l'accueil.
  const premiereFois = S.listerParties().length === 0;
  const lienGuide = () => h('a', { href: 'guide.html', class: 'lien-guide', 'data-cle': 'accueil-guide' }, 'Première fois ? Lis le guide d\'utilisation');
  remplacer($('contenu'),
    h('div', { class: 'accueil-logo' },
      h('img', { src: 'assets/logo-omni-systeme.webp', alt: '', width: 72, height: 72 }),
      h('div', {},
        h('p', {}, 'Ton MJ de poche pour jouer en solo ou en duo, ou pour aider un vrai MJ à improviser.'),
        premiereFois && lienGuide())),
    carteNouvellePartie(),
    carteMesParties(),
    !premiereFois && h('p', { class: 'petit accueil-guide-bas' }, lienGuide()));
}

function carteNouvellePartie() {
  const univers = ctx.cat.univers;
  const profilsCompagnons = ctx.commun.tables.find((t) => t.id === 'intentions').lignes.filter((l) => l.compagnon);
  const etat = { univers: univers[0].id, mode: 'solo', compagnons: [] };

  const libelleMission = (id) => `Nom ${M.vocabulaire(ctx.cat.univ(id)).de} (facultatif)`;
  const choixUnivers = choix('Univers', 'nouvel-univers', univers.map((u) => ({ valeur: u.id, texte: u.nom })), etat.univers,
    { onchange: (v) => { etat.univers = v; mission.querySelector('label').textContent = libelleMission(v); } });
  const mission = champ(libelleMission(etat.univers), { type: 'text' });
  const pj1 = champ('Nom du PJ', { type: 'text', autocomplete: 'off' });
  const pj2 = champ('Nom du second PJ', { type: 'text', autocomplete: 'off' });
  pj2.hidden = true;
  const choixMode = choix('Mode', 'nouveau-mode', [
    { valeur: 'solo', texte: 'Solo', detail: '1 PJ' },
    { valeur: 'duo', texte: 'Duo', detail: '2 PJ' },
  ], 'solo', {
    onchange: (v) => {
      etat.mode = v;
      pj2.hidden = v !== 'duo';
      pj1.querySelector('label').textContent = v === 'duo' ? 'Nom du premier PJ' : 'Nom du PJ';
    },
  });

  const listeCompagnons = h('div', {});
  function rendreCompagnons() {
    remplacer(listeCompagnons, etat.compagnons.map((c, i) => {
      const nom = champ(`Compagnon ${i + 1} : nom`, { type: 'text', valeur: c.nom });
      nom.saisie.addEventListener('input', (e) => { c.nom = e.target.value; });
      const profil = champ('Profil', { type: 'select', valeur: c.profil, options: profilsCompagnons.map((pr) => ({ valeur: pr.id, texte: pr.nom })) });
      profil.saisie.addEventListener('change', (e) => { c.profil = e.target.value; });
      return h('div', { class: 'compagnon' }, nom, profil,
        h('button', { type: 'button', class: 'bouton', 'aria-label': `Retirer le compagnon ${i + 1}`, onclick: () => { etat.compagnons.splice(i, 1); rendreCompagnons(); } }, '✕'));
    }));
  }

  return h('section', { class: 'carte', 'aria-labelledby': 'titre-nouvelle' },
    h('h2', { id: 'titre-nouvelle' }, 'Nouvelle partie'),
    choixUnivers, choixMode, mission, pj1, pj2,
    h('fieldset', {},
      h('legend', {}, 'PNJ compagnons (facultatif)'),
      listeCompagnons,
      h('button', {
        type: 'button', class: 'bouton',
        onclick: () => { etat.compagnons.push({ nom: '', profil: profilsCompagnons[0].id }); rendreCompagnons(); listeCompagnons.querySelector('.compagnon:last-child input')?.focus(); },
      }, '+ Ajouter un compagnon')),
    h('div', { class: 'rangee' }, h('button', {
      type: 'button', class: 'bouton bouton-accent bouton-large',
      onclick: () => {
        const u = ctx.cat.univ(etat.univers);
        const pjs = etat.mode === 'duo'
          ? [{ nom: pj1.saisie.value.trim() }, { nom: pj2.saisie.value.trim() }]
          : [{ nom: pj1.saisie.value.trim() }];
        const nomProfil = (id) => profilsCompagnons.find((x) => x.id === id)?.nom || '';
        const partie = M.creerPartie(ctx.commun, u, {
          mode: etat.mode,
          mission: mission.saisie.value.trim(),
          pjs,
          pnjs: etat.compagnons.map((c, i) => ({
            nom: c.nom.trim() || `Compagnon ${i + 1}`, role: 'Compagnon', attitude: 'amical', profil: c.profil, notes: nomProfil(c.profil),
          })),
        });
        M.journaliser(partie, { type: 'mission', nom: partie.mission.nom });
        S.enregistrerPartie(partie);
        S.protegerStockage(); // demandé au moment d'un geste de la personne
        ouvrirPartie(partie);
        annoncer(`Partie créée. ${M.vocabulaire(u).bonne} ${M.vocabulaire(u).nom} !`);
      },
    }, 'Commencer la partie')));
}

function carteMesParties() {
  const parties = S.listerParties();
  const inputFichier = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true, id: 'fichier-import',
    onchange: (e) => importer(e.target.files[0]),
  });
  return h('section', { class: 'carte', 'aria-labelledby': 'titre-parties' },
    h('h2', { id: 'titre-parties' }, 'Mes parties'),
    parties.length === 0
      ? h('p', { class: 'discret' }, 'Aucune partie enregistrée sur cet appareil.')
      : h('ul', { class: 'liste-parties' }, parties.map((p) => {
        const u = ctx.cat.univ(p.univers);
        const voc = M.vocabulaire(u);
        return h('li', {},
          h('div', { class: 'titre-partie' }, p.mission?.nom || voc.sansNom),
          h('div', { class: 'petit discret' },
            `${u ? u.nom : p.univers} · ${p.mode === 'duo' ? 'Duo' : 'Solo'} · ${p.pjs.map((x) => x.nom).join(' et ')} · ${voc.nom} ${p.mission?.numero ?? 1}, scène ${p.scene.numero} · ${dateCourte(p.modifie)}`),
          h('div', { class: 'petit discret' }, p.sauvegarde?.quand ? `Exportée le ${dateCourte(p.sauvegarde.quand)}` : 'Jamais exportée'),
          h('div', { class: 'rangee' },
            h('button', { type: 'button', class: 'bouton bouton-accent', onclick: () => ouvrirPartie(S.lirePartie(p.id)) }, 'Reprendre'),
            h('button', { type: 'button', class: 'bouton', onclick: () => { S.exporterPartie(p); afficherAccueil(); annoncer('Fichier de la partie enregistré.'); } }, 'Exporter'),
            h('button', {
              type: 'button', class: 'bouton bouton-discret',
              onclick: async () => {
                if (await confirmer('Supprimer la partie', `Supprimer « ${p.mission?.nom || voc.sansNom} » de cet appareil ? Pense à l'exporter avant si tu veux la garder.`, { oui: 'Supprimer', danger: true })) {
                  S.supprimerPartie(p.id);
                  afficherAccueil();
                  annoncer('Partie supprimée.');
                }
              },
            }, 'Supprimer')));
      })),
    h('div', { class: 'rangee' },
      inputFichier,
      h('button', { type: 'button', class: 'bouton', onclick: () => inputFichier.click() }, 'Importer un fichier'),
      parties.length > 0 && h('button', { type: 'button', class: 'bouton', onclick: () => { S.exporterTout(); afficherAccueil(); annoncer('Fichier de toutes les parties enregistré.'); } }, 'Exporter toutes les parties')),
    h('p', { class: 'petit discret' }, 'Tes parties restent sur cet appareil. Exporte-les pour les sauvegarder ou pour changer d\'appareil.'));
}

async function importer(fichier) {
  if (!fichier) return;
  let parties;
  try {
    parties = await S.lireFichierImport(fichier, ctx.cat.univers.map((u) => u.id));
  } catch (e) {
    await ouvrirDialogue({ titre: 'Import impossible', contenu: h('p', {}, e.message) });
    return;
  }
  let nb = 0;
  for (const p of parties) {
    if (S.lirePartie(p.id)) {
      const r = await ouvrirDialogue({
        titre: 'Partie déjà présente',
        contenu: h('p', {}, `« ${p.mission?.nom || 'Mission sans nom'} » existe déjà sur cet appareil.`),
        actions: [
          { id: 'passer', texte: 'Ne pas importer' },
          { id: 'copie', texte: 'Garder les deux' },
          { id: 'remplacer', texte: 'Remplacer', classe: 'bouton-danger' },
        ],
      });
      if (r === 'copie') {
        p.id = `partie-${Date.now().toString(36)}-${nb}`;
        p.mission.nom = `${p.mission.nom || 'Mission sans nom'} (copie)`;
      } else if (r !== 'remplacer') continue;
    }
    S.enregistrerPartie(p);
    nb++;
  }
  afficherAccueil();
  annoncer(nb ? `${nb} partie${nb > 1 ? 's' : ''} importée${nb > 1 ? 's' : ''}.` : 'Aucune partie importée.');
}

// --- Partie ------------------------------------------------------------------------------------
function ouvrirPartie(partie) {
  ctx.partie = partie;
  S.ecrireCourante(partie.id);
  ctx.vues = {};
  ctx.onglet = 'jouer';
  $('tableau-de-bord').hidden = false;
  $('onglets').hidden = false;
  rendreOnglets();
  allerOnglet('jouer');
}

function ongletsDisponibles() {
  return ONGLETS.filter((o) => !o.si || o.si(ctx.univ));
}

function rendreOnglets() {
  remplacer($('onglets'), ongletsDisponibles().map((o) => h('button', {
    type: 'button', class: 'onglet', 'data-onglet': o.id, 'data-cle': `onglet-${o.id}`,
    'aria-current': o.id === ctx.onglet ? 'page' : false,
    onclick: () => allerOnglet(o.id),
  }, typeof o.texte === 'function' ? o.texte(ctx.univ) : o.texte)));
}

function allerOnglet(id) {
  const o = ongletsDisponibles().find((x) => x.id === id) || ONGLETS[0];
  ctx.onglet = o.id;
  if (!ctx.vues[o.id]) ctx.vues[o.id] = o.creer(ctx);
  for (const b of $('onglets').querySelectorAll('.onglet')) {
    if (b.dataset.onglet === o.id) {
      b.setAttribute('aria-current', 'page');
      b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    else b.removeAttribute('aria-current');
  }
  remplacer($('contenu'), ctx.vues[o.id].el);
  garderFocus(() => {
    rendreTableauDeBord();
    ctx.vues[o.id].actualiser();
  });
}

function rendreTableauDeBord() {
  const p = ctx.partie;
  const C = ctx.commun;
  const pal = M.palier(C, p.pression, ctx.univ);
  const avecOmni = M.optionsUnivers(ctx.univ).omniPoints;
  const chocs = M.optionsUnivers(ctx.univ).chocs;
  const changer = (d) => {
    const r = M.ajusterPression(C, p, d, { univers: ctx.univ });
    if (r.avant === r.apres) { annoncer(`La Pression est déjà à ${r.apres}.`); return; }
    ctx.enregistrer();
    annoncer(`Pression ${r.avant} → ${r.apres}${r.dejaBougee ? '. Attention : elle avait déjà bougé pendant cette scène (une fois par scène).' : '.'}`);
    ctx.signaler(r.evenements);
  };
  const jauge = h('span', { class: 'tdb-jauge', 'aria-hidden': 'true' },
    Array.from({ length: C.pression.max }, (_, i) => h('span', { class: i < p.pression ? 'plein' : '' })));
  majTitre();
  remplacer($('tableau-de-bord'),
    h('div', { class: 'tdb-bloc tdb-pression', role: 'group', 'aria-label': 'Pression' },
      h('button', { type: 'button', class: 'bouton bouton-icone', 'aria-label': 'Baisser la Pression de 1', 'data-cle': 'tdb-moins', onclick: () => changer(-1) }, '−'),
      h('div', { class: 'tdb-pression-valeur' },
        h('span', { class: 'tdb-etiquette' }, 'Pression'),
        h('span', {}, h('strong', {}, String(p.pression)), h('span', { class: 'discret' }, ` /${C.pression.max}`)),
        jauge),
      h('button', { type: 'button', class: 'bouton bouton-icone', 'aria-label': 'Monter la Pression de 1', 'data-cle': 'tdb-plus', onclick: () => changer(+1) }, '+'),
      h('span', { class: 'tdb-palier' }, h('strong', {}, pal.nom), h('br'), `${pal.chance} %`)),
    h('div', { class: 'tdb-bloc tdb-scene' }, h('span', { class: 'tdb-etiquette' }, 'Scène'), h('strong', {}, String(p.scene.numero))),
    // Univers avec points de choc (ex. horreur) : un compteur par PJ, qui ouvre la fiche.
    chocs && h('div', { class: 'tdb-bloc tdb-chocs' },
      p.pjs.map((pj) => {
        const n = pj.chocs || 0;
        const alerte = n >= chocs.seuil;
        return h('button', {
          type: 'button', class: `bouton jeton${alerte ? ' alerte' : ''}`, 'data-cle': `tdb-chocs-${pj.id}`,
          'aria-label': `${pj.nom} : ${n} point${n > 1 ? 's' : ''} de choc${alerte ? ` (${chocs.alerte})` : ''}. Voir chocs et folie`,
          onclick: () => { ctx.demandeFiche = 'chocs'; allerOnglet('fiche'); },
        }, pj.nom, ' ', h('span', { class: 'omni' }, `${n} choc${n > 1 ? 's' : ''}`), alerte && h('span', { class: 'alerte-jeton', 'aria-hidden': 'true' }, ' !'));
      })),
    // Univers sans omni-points (ex. horreur) : ni jetons, ni case du seuil de rupture.
    avecOmni && h('div', { class: 'tdb-bloc tdb-omni' },
      p.pjs.map((pj) => h('button', {
        type: 'button', class: 'bouton jeton', 'data-cle': `tdb-omni-${pj.id}`,
        'aria-label': `${pj.nom} : ${pj.omni} omni-point${pj.omni > 1 ? 's' : ''}. Dépenser un omni-point`,
        onclick: () => dialogueOmniPJ(ctx, pj.id),
      }, pj.nom, ' ', h('span', { class: 'omni' }, `◆ ${pj.omni}`))),
      h('button', {
        type: 'button', class: 'bouton jeton', 'data-cle': 'tdb-omni-oracle',
        'aria-label': `Oracle : ${p.oracle.omni} omni-point${p.oracle.omni > 1 ? 's' : ''}. Actions de l'Oracle`,
        onclick: () => dialogueOmniOracle(ctx),
      }, 'Oracle ', h('span', { class: 'omni' }, `◆ ${p.oracle.omni}`)),
      caseACocher(`Seuil ${C.pression.seuilRupture} atteint`, {
        coche: p.seuilAtteint, 'data-cle': 'tdb-seuil', title: `Seuil de rupture (${C.pression.seuilRupture}) déjà atteint dans ${ctx.voc.cette}`,
        onchange: (v) => { p.seuilAtteint = v; ctx.enregistrer(); annoncer(v ? 'Seuil de rupture coché (correction manuelle, sans gain d\'omni-point).' : 'Seuil de rupture décoché.'); },
      })));
}

/** Titre de l'en-tête : nom de l'application à l'accueil, nom de la mission en partie. */
function majTitre() {
  const p = ctx.partie;
  const voc = p && ctx.voc;
  const titre = p ? `${p.mission.nom || voc.sansNom}${p.mission.numero > 1 ? ` (${voc.nom} ${p.mission.numero})` : ''}` : CONFIG.nom;
  $('titre-app').textContent = titre;
  document.title = p ? `${titre} · ${CONFIG.nom}` : CONFIG.nom;
}

// --- Menu ---------------------------------------------------------------------------------------
async function ouvrirMenu() {
  const enPartie = !!ctx.partie;
  const actions = [
    enPartie && { id: 'parties', texte: 'Mes parties' },
    enPartie && { id: 'modifier', texte: 'Modifier la partie' },
    enPartie && { id: 'mission', texte: ctx.voc.Suivante },
    enPartie && { id: 'exporter', texte: 'Exporter cette partie' },
    { id: 'reglages', texte: 'Réglages (thème, vibrations…)' },
    { id: 'guide', texte: 'Guide d\'utilisation' },
    { id: 'livret', texte: 'Livret imprimable' },
    { id: 'installer', texte: 'Installer l\'application' },
    { id: 'apropos', texte: 'À propos' },
  ].filter(Boolean);
  const r = await ouvrirDialogue({ titre: 'Menu', contenu: null, actions, liste: true, classe: 'dialogue-menu' });
  switch (r) {
    case 'parties': afficherAccueil(); break;
    case 'modifier': dialogueModifier(); break;
    case 'mission': dialogueMissionSuivante(); break;
    case 'exporter': ctx.exporter(); break;
    case 'reglages': dialogueReglages(); break;
    case 'installer': dialogueInstallation(); break;
    case 'guide': window.location.href = 'guide.html'; break;
    case 'livret':
      window.location.href = `livret.html?univers=${encodeURIComponent(ctx.partie ? ctx.partie.univers : ctx.cat.univers[0].id)}`;
      break;
    case 'apropos': dialogueAPropos(); break;
    default: break;
  }
}

const NOMS_THEMES = { omni: 'Omni', sombre: 'Sombre', clair: 'Clair', auto: 'Auto' };

async function dialogueReglages() {
  const T = globalThis.OracleTheme;
  const avant = ctx.reglages.theme;
  const theme = choix('Thème', 'theme', T.THEMES.map((t) => ({
    valeur: t,
    texte: [t === 'auto'
      ? h('span', { class: 'apercu-theme apercu-auto', 'aria-hidden': 'true' })
      : h('span', { class: 'apercu-theme', 'data-theme': t, 'aria-hidden': 'true' }), NOMS_THEMES[t]],
    detail: t === 'auto' ? 'Suit l\'appareil' : t === 'omni' ? 'Violet nuit' : '',
  })), avant, { onchange: (t) => T.appliquer(t) });
  const vibration = caseACocher('Vibrations (lancers, omni-points)', { coche: ctx.reglages.vibration });
  const dePhysique = caseACocher('J\'utilise mon vrai dé (je saisis le résultat)', { coche: ctx.reglages.dePhysique });
  const rappel = caseACocher('Rappel de sauvegarde (après 5 scènes sans export)', { coche: ctx.reglages.rappelSauvegarde !== false });
  const protection = h('p', { class: 'petit discret', 'data-cle': 'etat-stockage' }, 'Protection des données : vérification…');
  S.protegerStockage({ demander: false }).then((ok) => {
    protection.textContent = ok === true
      ? 'Protection des données : le navigateur garde les parties de l\'Oracle même s\'il manque de place.'
      : ok === false
        ? 'Protection des données : pas encore accordée par le navigateur (installer l\'application aide). Exporte tes parties régulièrement.'
        : 'Protection des données : ce navigateur ne la propose pas. Exporte tes parties régulièrement.';
  });
  const secret = caseACocher('Masquer les résultats (écran visible des joueurs)', { coche: ctx.reglages.secret, 'aria-describedby': 'aide-masquer' });
  const aideSecret = h('p', { class: 'aide', id: 'aide-masquer' }, 'Les résultats sont floutés ; un toucher les révèle.');
  const lumAvant = ctx.reglages.luminosite ?? 100;
  const valeurLum = h('output', { for: 'reglage-lum', id: 'valeur-lum' }, `${lumAvant} %`);
  const curseurLum = h('input', {
    type: 'range', id: 'reglage-lum', min: 50, max: 100, step: 5, value: lumAvant, 'aria-describedby': 'aide-lum',
    oninput: (e) => { valeurLum.textContent = `${e.target.value} %`; T.luminosite(e.target.value); },
  });
  const luminosite = h('div', { class: 'champ reglage-luminosite' },
    h('label', { for: 'reglage-lum' }, 'Luminosité de l\'écran : ', valeurLum),
    curseurLum,
    h('p', { class: 'aide', id: 'aide-lum' }, 'Assombrit l\'application pour jouer le soir (100 % = normal). En dessous de 100 %, les textes secondaires deviennent moins contrastés, comme quand tu baisses la luminosité de l\'appareil.'));
  const r = await ouvrirDialogue({
    titre: 'Réglages',
    contenu: [theme, luminosite, vibration, dePhysique, secret, aideSecret, rappel, protection, h('p', { class: 'petit discret' }, 'Ces réglages sont propres à cet appareil.')],
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: 'Enregistrer', classe: 'bouton-accent' }],
  });
  if (r !== 'oui') { T.appliquer(avant); T.luminosite(lumAvant); return; }
  ctx.reglages.theme = theme.valeur();
  ctx.reglages.luminosite = T.luminosite(curseurLum.value);
  ctx.reglages.vibration = vibration.saisie.checked;
  ctx.reglages.dePhysique = dePhysique.saisie.checked;
  if (ctx.reglages.secret !== secret.saisie.checked) ctx.reveles.clear();
  ctx.reglages.secret = secret.saisie.checked;
  ctx.reglages.rappelSauvegarde = rappel.saisie.checked;
  ctx.sauverReglages();
  if (ctx.partie) actualiser();
  annoncer('Réglages enregistrés.');
}

async function dialogueModifier() {
  const p = ctx.partie;
  const mission = champ('Nom de la mission', { type: 'text', valeur: p.mission.nom });
  const avecOmni = M.optionsUnivers(ctx.univ).omniPoints;
  const pjs = p.pjs.map((pj, i) => ({
    nom: champ(`Nom du PJ ${i + 1}`, { type: 'text', valeur: pj.nom }),
    omni: avecOmni && champ(`Omni-points de ${pj.nom}`, { type: 'number', valeur: pj.omni, min: 0, inputmode: 'numeric' }),
  }));
  const oracle = avecOmni && champ('Omni-points de l\'Oracle', { type: 'number', valeur: p.oracle.omni, min: 0, inputmode: 'numeric' });
  const utilisations = avecOmni && champ('Utilisations d\'omni-points par les joueurs', {
    type: 'number', valeur: p.oracle.utilisationsJoueurs, min: 0, inputmode: 'numeric',
    aide: 'L\'Oracle gagne 1 omni-point toutes les 2 utilisations.',
  });
  const scene = champ('Numéro de scène', { type: 'number', valeur: p.scene.numero, min: 1, inputmode: 'numeric' });
  const r = await ouvrirDialogue({
    titre: 'Modifier la partie',
    contenu: [mission, pjs.map((x) => [x.nom, x.omni]), oracle, utilisations, scene,
      h('p', { class: 'petit discret' }, 'Pour corriger une erreur. La Pression se règle avec les boutons − et + du tableau de bord.')],
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: 'Enregistrer', classe: 'bouton-accent' }],
  });
  if (r !== 'oui') return;
  const entier = (c, min) => Math.max(min, Number.parseInt(c.saisie.value, 10) || min);
  p.mission.nom = mission.saisie.value.trim();
  pjs.forEach((x, i) => {
    p.pjs[i].nom = x.nom.saisie.value.trim() || `PJ ${i + 1}`;
    if (avecOmni) p.pjs[i].omni = entier(x.omni, 0);
  });
  if (avecOmni) {
    p.oracle.omni = entier(oracle, 0);
    p.oracle.utilisationsJoueurs = entier(utilisations, 0);
  }
  p.scene.numero = entier(scene, 1);
  ctx.enregistrer();
  annoncer('Partie modifiée.');
}

async function dialogueMissionSuivante() {
  const p = ctx.partie;
  const voc = ctx.voc;
  const nom = champ(`Nom ${voc.deLaNouvelle} (facultatif)`, { type: 'text' });
  const r = await ouvrirDialogue({
    titre: voc.Suivante,
    contenu: [
      h('p', {}, `Avant de passer à la suite, pense à la clôture : pose à l'oracle « ${ctx.univ.cloture.question} », puis applique la progression d'Omni.`),
      h('ul', {},
        h('li', {}, `La Pression revient à ${ctx.commun.pression.depart}, le seuil de rupture est remis à zéro, et on repart de la scène 1.`),
        M.optionsUnivers(ctx.univ).omniPoints && [
          h('li', {}, `L'Oracle perd ses omni-points restants (${p.oracle.omni}).`),
          h('li', {}, `Chaque PJ retrouve ses ${ctx.univ.omniPointsPJ} omni-points.`)],
        h('li', {}, 'La fiche de suivi et le journal sont conservés.')),
      nom,
    ],
    actions: [{ id: 'non', texte: 'Annuler' }, { id: 'oui', texte: `Commencer ${voc.laSuivante}`, classe: 'bouton-accent' }],
  });
  if (r !== 'oui') return;
  essayer(() => M.missionSuivante(ctx.commun, ctx.univ, p, { nom: nom.saisie.value.trim() }));
  ctx.enregistrer();
  annoncer(`${voc.Nom} ${p.mission.numero} : c'est parti.`);
}

demarrer();
