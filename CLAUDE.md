# CLAUDE.md — Omni-Oracle

Consignes pour travailler sur ce dépôt. À lire en entier avant toute modification.

## Ce qu'est l'application

L'oracle de l'Omni-système (jeu de rôle d20 de Ferrus Dantioch) : simule le MJ en solo (1 PJ,
parfois des PNJ compagnons) ou en duo (2 PJ), ou aide un vrai MJ à improviser. Deux formes qui
lisent **les mêmes données** (`data/*.json`) :

- `index.html` : la PWA (outil de table, surtout sur tablette) ;
- `livret.html` : le livret imprimable (A4, noir et blanc), construit dans le navigateur.

## Travailler avec Ferrus

- Ferrus est novice en programmation : explique en français simple, signale chaque terme
  technique, fais de petites étapes, dis-lui quand une décision lui appartient.
- Tutoiement partout dans l'interface et dans les échanges. Signature : « Ferrus Dantioch ».
- Clavier AZERTY ; travaille sur ordinateur et téléphone ; l'application sert surtout sur tablette.
- Commits réguliers, messages clairs **en français**.

## Règles impératives

1. **Aucun backend, aucune IA intégrée, aucun compte, aucune requête vers un autre site.**
   Si une fonctionnalité demande internet : s'arrêter et en parler à Ferrus avant.
2. **Hors ligne** : tout est embarqué et copié par le service worker (`sw.js`).
   **Tout nouveau fichier de l'application doit être ajouté à la liste `FICHIERS` de `sw.js`**
   (le test `tests/securite.test.mjs` le vérifie). Les fichiers de `data/` sont couverts par
   `data/univers.json`.
3. **Pas de CDN, pas de framework, pas d'étape de build.** HTML, CSS, JS (modules ES) servis tels
   quels par GitHub Pages depuis `main` (racine). npm ne sert qu'aux tests (Playwright).
4. **Ne jamais modifier le texte des règles ni des tables.** Les JSON sont une copie fidèle de
   `sources/*.md` ; `npm test` compare mot pour mot. Une modification du texte se fait dans la
   source **et** dans le JSON, et seulement à la demande de Ferrus. En cas d'ambiguïté ou de cas
   non couvert dans les règles : le lister à Ferrus, ne pas trancher.
5. **Couleurs** : uniquement dans `css/themes.css` (variables). Contraste du texte ≥ 4,5:1
   (vérifié par `tests/navigateur/themes.spec.js`, y compris sur le texte réellement affiché).
6. **Accessibilité** : cibles tactiles ≥ 44 px, contour de focus visible, un seul `<h1>` par page,
   respect de « réduire les animations », vibrations désactivables (Réglages), Échap ferme les
   fenêtres (`<dialog>` natif).
7. **CSP stricte** dans chaque page HTML (`default-src 'none'`, `connect-src 'self'`, ni
   `unsafe-inline` ni `unsafe-eval`). Pas d'attribut `style=` ni de `<style>` dans le HTML.
   Aucun script n'est écrit dans les pages : le thème est appliqué avant l'affichage par
   `js/theme.js`, fichier séparé. Si un jour un script est écrit dans une page, son empreinte
   `'sha256-…'` doit être ajoutée à `script-src` et recalculée à chaque retouche : le test
   `tests/securite.test.mjs` échoue et donne la bonne empreinte.
8. **Stockage** : préfixe `oracle` (`js/config.js`, `idStockage`), **à ne jamais changer** :
   `oracle-parties`, `oracle-courante`, `oracle-reglages` (localStorage) et caches
   `oracle-v<version>`. Le service worker n'efface que les caches commençant par `oracle-`
   (le site est partagé avec les autres applications de Ferrus).
9. **Identité de l'application** (`manifest.webmanifest`) : `"id": "/omni-oracle/"`, jamais
   `"./"`. L'id est lu depuis la **racine du site** : `"./"` donnerait l'identité
   `ferrusdantioch.github.io/`, partagée avec toute autre application qui ferait pareil
   (Brave a pris l'Oracle pour omni-time, installé avec cette ancienne identité). Ne plus la
   changer après publication. Testé par `tests/securite.test.mjs` et `tests/navigateur/manifeste.spec.js`.
10. **Version** : une seule source, `js/config.js`. **L'augmenter à chaque publication** : c'est ce
   qui déclenche le bouton « Mettre à jour » (jamais de mise à jour sans action de la personne).
   Le nom figure aussi dans `manifest.webmanifest` : le changer aux deux endroits.
11. **À propos** : contenu et ordre fixés (logo ; nom ; version ; « Application réalisée par… » ;
    licence avec lien deed.fr ; phrase sur les droits réservés des règles ; confidentialité ;
    contact ; « Découvrir l'Omni-système »). Valeurs lues dans `js/config.js`, jamais en dur.
12. **Licence** : code en CC BY-NC-ND 4.0 (`LICENSE` identique au kit, ne pas le modifier) ;
    règles, tables, textes et logo de l'Omni-système : tous droits réservés.

## Architecture

| Fichier | Rôle |
|---|---|
| `js/config.js` | Nom, version, auteur, contact, lien Omni-système, `idStockage`. Lu par les pages et par `sw.js` (`importScripts`). |
| `js/theme.js` | Thème avant l'affichage (Omni par défaut, Sombre, Clair, Auto : appareil sombre → Omni, clair → Clair). |
| `js/moteur.js` | Toutes les règles, sans affichage. Les nombres viennent de `data/commun.json`. Testé par `tests/moteur.test.mjs`. |
| `js/donnees.js` | Charge `data/univers.json`, le tronc commun et les univers ; crée le catalogue (renvois de tables résolus). |
| `js/stockage.js` | localStorage, export / import JSON. |
| `js/app.js` | Accueil, tableau de bord, onglets, menu, réglages. |
| `js/actions.js` | Actions partagées (omni-points, contestation, fin de scène, complications, saisie d'un vrai dé). |
| `js/vue-*.js` | Un fichier par onglet. |
| `js/ui.js`, `js/texte.js`, `js/composants.js` | Outils d'affichage (fenêtres, champs, mise en forme `**gras**`, tables tirables). |
| `js/pwa.js`, `js/apropos.js` | Service worker, bouton « Mettre à jour », installation, À propos. |
| `js/livret.js`, `css/livret.css` | Livret imprimable. |

Données :

- `data/univers.json` : liste des fichiers (tronc commun + univers). **Ajouter un univers =
  ajouter un JSON et une ligne ici**, sans toucher au code (prouvé par
  `tests/navigateur/nouvel-univers.spec.js`). Format documenté dans le README.
- Chaque table : `id`, `titre`, `de` (`"d20"`), `colonnes`, `lignes` (`plage`, `texte`, `autres`
  facultatif), ou `reference` vers la table d'un autre univers. Les champs en plus (ex.
  `famille`, `escadrille`, `escorte` en D1 ; `attitude` en D2 ; `modificateurs`) servent au moteur.
- Le texte des règles est dans `sections[].texte` (lignes Markdown simples, `{{table X}}` place une table).

## Interprétations validées par Ferrus (20/11/2026)

Points non tranchés par les sources, décidés par Ferrus. Ne pas les changer sans son accord.

1. **1 ou 20 naturel avec avantage/désavantage** : on regarde le dé **gardé**.
2. **Soupape** : à la fin d'une scène commencée à 10, la Pression passe à 7 sans appliquer le +1/−1.
3. **Seuil de rupture** : la première fois que la Pression atteint 9 **ou plus**, même par les
   boutons manuels (une seule fois par mission).
4. **Gain de l'Oracle en duo** : les utilisations des deux PJ se cumulent ; une **contestation**
   compte comme une utilisation.
5. **« Oui » → « Oui, mais… »** : seulement sur un « Oui » simple, pas sur « Oui, et… ».
6. **Intentions (PNJ et table E) hors bornes** : total > 20 lu en 17-20, total < 1 lu en 1-4 ;
   la règle du 1/20 naturel ne s'applique pas aux intentions.
7. **Escorte (D1)** : escadrille de 1d4+1 chasseurs ; aliens pour un croiseur alien, humains pour
   un croiseur humain, au choix pour un vaisseau-mère. Un vaisseau-mère peut recevoir une escorte
   **en plus** de ses chasseurs embarqués : c'est voulu (avoir des chasseurs embarqués n'empêche
   pas d'être accompagné d'autres vaisseaux).
8. **D2, états sans attitude** (Endommagé, En fuite, Équipage divisé, À la dérive) : vraisemblance
   « incertain » par défaut, modifiable.
9. **Mission suivante** : Pression à 3, PJ à leurs omni-points, Oracle à 0, seuil remis à zéro,
   scène 1 ; fiche de suivi et journal conservés.
10. **Duo** : une seule question « qui avait la main ? » par scène, pour les deux PJ.
11. **Étau (Pression 7)** : l'application signale le rebondissement (une fois par mission) et
    propose d'aller à la mission, sans tirer automatiquement.
12. **Pression changée à la main** : compte comme le mouvement de la scène (« une fois par scène ») ;
    l'application le signale.
13. **Case −2 des intentions** : cochée automatiquement d'après la Pression, mais modifiable.
14. **Stockage** : localStorage. **Vibration** : courte, activée par défaut, désactivable.
15. **Réaction d'un PNJ** : boutons « Réaction à une proposition ou à une menace » (section 5 du
    tronc commun). Pour les vaisseaux, « Réaction à une proposition » seulement, comme dans D2.
16. **Luminosité** (Réglages) : curseur libre de 100 % à 50 %, 100 % par défaut, avec un
    avertissement. À 100 %, tous les contrastes respectent 4,5:1 ; en dessous, les textes
    secondaires passent sous 4,5:1 (limites : Omni 85 %, Clair 78 %, Sombre 98 %), choix assumé
    par Ferrus (même effet que baisser la luminosité de l'appareil). Appliquée avant l'affichage
    par `js/theme.js` (attribut `data-luminosite` sur `<html>`), à la page ET aux fenêtres
    (`dialog`, qui échappent au filtre de la page), jamais à l'impression.
17. **Space opéra** : la présentation et la note N2 ne citent plus de nom de fichier
    (« tronc commun de l'Oracle Omni-système », « traits universels, communs à tous les univers ») ;
    modifié dans la source et dans le JSON.

## Tests

- `npm test` : données (plages 1-20, fidélité mot pour mot), moteur (cas limites), sécurité.
- `npx playwright test` (après `npm install`) : hors ligne (serveur coupé), aucune requête
  externe, export/import, thèmes et contrastes, focus, animations réduites, tablette (800 px),
  téléphone (400 et 360 px), À propos, mise à jour, livret, nouvel univers.
  Utiliser `--trace off` ou la configuration fournie (traces désactivées).
- Avant de dire que c'est terminé : vérifier hors ligne, sur tablette et téléphone, relire
  l'« À propos », vérifier qu'aucune requête réseau ne part (ces quatre points sont couverts par
  les tests ci-dessus).

## Évolutions prévues (architecture prête, rien de codé)

- Univers Fantasy et Horreur / enquête : nouveaux fichiers JSON seulement.
- Profils de vaisseaux (agressif, prudent, prédateur), nouvelles tables (rencontres aliens,
  planètes, événements entre deux missions) : nouvelles tables JSON ; un nouveau *type* de
  générateur demandera un petit onglet.
- « Notes de test » : sections des sources remplies par Ferrus au fil des parties ; elles ne
  sont ni dans les JSON, ni dans l'application, ni dans le livret.

## Règles communes à l'écosystème

> Section ajoutée le 13 novembre 2026 à partir du socle commun des PWA de
> Ferrus. Elle est **adaptée à ce dépôt** : les règles du socle qui ne
> concernent que d'autres applications ont été retirées. Si une règle
> ci-dessous semble contredire les notes propres à ce dépôt (plus haut),
> ne tranche pas : signale-le à Ferrus et attends sa décision.
>
> Version de référence : dépôt privé `omni-socle`, fichier `SOCLE.md`. Toute
> modification d'une règle commune se fait d'abord là-bas, puis est recopiée
> ici.

*Chaque règle porte une étiquette :*

* [DÉCIDÉ] : choix confirmé par Ferrus. À respecter sans discuter.
* [CONSTATÉ] : relevé dans le code des dépôts omni-texte, Refuge, omni-budget et omni-grimoire (novembre 2026). Les autres dépôts n'ont pas été lus.
* [RECOMMANDÉ] : proposition non validée. À proposer, jamais à appliquer d'office.

### 1. Qui, pourquoi, comment travailler

* Ferrus veut comprendre ce qui se passe : explique en français simple, signale chaque terme technique, ne délègue pas dans le dos. [DÉCIDÉ]
* Sois clair, direct, sans édulcorant. Dis ce qui est fragile ou incohérent. [DÉCIDÉ]
* Les outils servent à aider les autres, en priorité les personnes autistes et les personnes en situation de handicap. Refuge et Cap sont des assistances pour personnes autistes ; Soutien-IMC est une fiche de contact très lisible, conçue pour des personnes infirmes moteurs cérébrales. [DÉCIDÉ]
* Objectif de fond : remplacer les outils des grandes entreprises par des outils faits maison, et être indépendant des comptes et d'internet. [DÉCIDÉ]
* Avant tout changement important : explique ce que tu vas faire, attends l'accord. Ne modifie jamais plusieurs applications d'un coup sans demande. [DÉCIDÉ]

### 2. Règles non négociables

1. Pas de compte, pas de backend, pas d'IA intégrée. [DÉCIDÉ]
2. Fonctionnement hors ligne systématique. Tout ce dont l'application a besoin est embarqué dans l'installation, moteur de reconnaissance de texte (OCR) d'omni-budget compris (environ 6 Mo). [DÉCIDÉ]
3. Aucun appel réseau sans en avoir parlé à Ferrus d'abord. Si une fonctionnalité demande internet, arrête-toi, explique pourquoi, propose une alternative locale, attends la décision. [DÉCIDÉ] Cette règle vise l'application. Les outils de développement (`npm install`, GitHub Actions) sont acceptés ; toute nouvelle bibliothèque, tout nouvel outil ou tout nouveau serveur contacté doit être signalé à Ferrus avant. [DÉCIDÉ]
4. Les données restent sur l'appareil. Rien n'est envoyé. Les liens externes ne s'ouvrent que sur action de la personne. [DÉCIDÉ]
5. Pas de police, de bibliothèque ou de script chargés depuis un CDN : tout est embarqué avec sa licence. [CONSTATÉ dans omni-texte ; à étendre]

### 3. Identité, ton, mentions

* Signature : « Ferrus Dantioch », sauf dans Refuge, qui signe d'un prénom seul (celui qui figure dans son « À propos »). C'est voulu : dans le contexte de Refuge, le prénom crée la confiance. Ne pas « corriger ». [DÉCIDÉ]
* Ton : tutoiement partout, y compris dans omni-budget et omni-grimoire. Exception conservée dans Refuge : « vous » pour ce qui est montré à d'autres personnes (message d'urgence, etc.). [DÉCIDÉ pour le tutoiement ; exception CONSTATÉE]
* Chaque application contient un « À propos » avec au minimum : nom, version, « Application réalisée par Ferrus Dantioch, avec l'aide de l'intelligence artificielle », mention de licence, phrase de confidentialité, contact, lien « Découvrir l'Omni-système ». Chaque application garde son texte propre. [DÉCIDÉ pour le fond ; modèle CONSTATÉ dans omni-texte]
* Licence du code : © 2026 Ferrus Dantioch, Creative Commons BY-NC-ND 4.0, avec le fichier LICENSE identique dans tous les dépôts. Règles, fiches, logos et textes de l'Omni-système : tous droits réservés. [DÉCIDÉ]
* Contact dans les applications : l'alias e-mail de l'Omni-système. Le serveur Discord figure sur le portfolio seulement : il n'a pas besoin d'apparaître dans les applications. [DÉCIDÉ]
* Identité visuelle : violet nuit pour l'écosystème Omni. Logo de l'Omni-système (dé à vingt faces violet entouré d'un anneau lumineux) dans l'« À propos ». Exception Refuge : pas de logo Omni ; le violet nuit y est une gamme facultative parmi les autres, pas celle par défaut. [DÉCIDÉ]
* Chaque bibliothèque tierce est créditée avec sa licence (fichier de licences, et lien depuis l'« À propos »). [RECOMMANDÉ ; aujourd'hui le lien manque dans les deux applications React]

### 4. Sécurité et vie privée

* Une CSP (règle de sécurité qui interdit au navigateur de contacter d'autres sites) stricte dans chaque application. [RECOMMANDÉ ; CONSTATÉ : présente dans omni-texte et omni-budget, absente de Refuge et omni-grimoire]
* Données sensibles (journal, notes vocales, finances) : chiffrées au repos quand c'est possible. [RECOMMANDÉ ; CONSTATÉ : seul omni-budget chiffre]
* Origine partagée : toutes les applications vivent sous la même adresse de base, donc chacune pourrait techniquement lire les données des autres. Ne jamais stocker deux applications sous le même nom de base de données ou de préfixe. Préfixe propre à chaque application pour caches, IndexedDB et localStorage. Un préfixe générique (ex. `budget-`) est à éviter. [CONSTATÉ ; hébergement à origines séparées : décision reportée] Cette règle vaut pour les nouveaux noms : les noms déjà publiés (`budget-perso` et `budget-theme` d'omni-budget) restent, car les renommer ferait perdre les données des personnes. [DÉCIDÉ]
* Sur Chrome Android, une seule PWA du même site s'installe. Contournement : utiliser Brave, qui les installe indépendamment. C'est un palliatif d'installation : il ne règle ni l'isolation des données ni le risque de sécurité. À mentionner dans l'aide à l'installation de chaque application. [DÉCIDÉ comme palliatif]
* Identité de chaque application dans son manifeste : `"id": "/nom-du-dossier/"` (par exemple `"/omni-oracle/"`), avec `"scope": "./"`. Jamais `"id": "./"` : le navigateur lit l'id depuis la **racine du site**, donc `"./"` donne à l'application l'identité `ferrusdantioch.github.io/`, la même que toute autre application qui fait pareil. Le navigateur prend alors l'une pour l'autre : sur ordinateur, Brave proposait « Ouvrir dans omni-time » au lieu d'installer omni-oracle. Ne plus changer un id correct après publication. Corriger un `"./"` reste nécessaire : l'application déjà installée continue de marcher avec l'ancienne identité, et la personne la réinstalle pour profiter de la correction (en sauvegardant ses données avant). [DÉCIDÉ le 20 novembre 2026 ; CONSTATÉ : corrigé dans omni-time le 1er novembre et dans omni-oracle (0.2.1) ; autres dépôts non vérifiés]
* Ne pas stocker en clair ce qui pourrait nuire à la personne si quelqu'un d'autre ouvre l'appareil. [RECOMMANDÉ]

### 5. Hors ligne et versions

* Service worker (petit programme qui garde une copie de l'application sur l'appareil) : tout est copié à l'installation, puis « cache d'abord ». [CONSTATÉ]
* La mise à jour doit se vérifier au retour au premier plan, avec un message clair. [CONSTATÉ dans 3 apps sur 4 ; manque dans omni-budget] Exception Refuge : le message clair est la note discrète de l'accueil (sans bouton) et le bouton « Mettre à jour » des Réglages ; rien en bouclier, jamais de changement par surprise. [DÉCIDÉ]
* Le service worker gère l'échec réseau (plan B quand un fichier manque). [RECOMMANDÉ ; absent de Refuge]
* Numéro de version : une seule source de vérité, automatique, jamais écrite à la main à deux endroits. [RECOMMANDÉ ; CONSTATÉ : 4 méthodes différentes, dont 2 reposent sur la mémoire]
* Si le numéro de version affiché ne correspond pas au code, le signaler. [RECOMMANDÉ]

### 6. Accessibilité (minimum pour toute application)

* Cibles tactiles : 44 px minimum. Refuge en vise 60 px. [DÉCIDÉ ; CONSTATÉ : plusieurs boutons du grimoire font 34 à 40 px]
* Contraste du texte : 4,5 minimum (WCAG). [RECOMMANDÉ ; CONSTATÉ : Refuge, thème clair, à 3,8–4,3]
* Contour de focus clavier toujours visible, y compris en thème « bouclier noir » de Refuge. [RECOMMANDÉ] Dans le bouclier : contour gris foncé, juste au minimum de la norme (contraste 3:1 sur le noir, environ `#5a5a5a`), seulement autour de l'élément sélectionné, pour éclairer le moins possible. [DÉCIDÉ]
* Respect du réglage « réduire les animations » du téléphone. [CONSTATÉ dans les quatre]
* Un seul `<h1>` par page. Échap ferme les écrans plein écran. Tab ne s'en échappe pas. [RECOMMANDÉ ; CONSTATÉ : manque dans Refuge]
* Vibration : interdite dans Refuge. Ailleurs, toute vibration a un réglage pour la couper. [DÉCIDÉ ; CONSTATÉ : le grimoire vibre sans réglage]
* Thème appliqué avant l'affichage pour éviter l'éclair du mauvais thème : petit script en tête de page. [CONSTATÉ dans omni-texte et Refuge ; manque dans omni-budget et omni-grimoire]
* Thèmes de référence : Omni (violet nuit), Sombre, Clair. [CONSTATÉ] « Auto » (suit le réglage du téléphone) est accepté en plus de ces trois thèmes. [DÉCIDÉ]
* Réglage de luminosité et animation de tournement de page au doigt : prévus pour les applications de lecture et d'écriture, en priorité omni-liseuse et omni-romancier, dépôts pas encore lus. Aucune des quatre applications examinées ne les a. [DÉCIDÉ pour le périmètre ; CONSTATÉ pour leur absence]

### 7. Tests et livraison

* Test automatique de chaque nouvelle fonction. omni-texte a Playwright (hors ligne, contrastes, téléphone) ; omni-budget a Vitest ; Refuge n'en a pas. [CONSTATÉ ; tests pour Refuge : RECOMMANDÉ]
* Avant de dire que c'est terminé : vérifie hors ligne, vérifie sur téléphone et sur tablette, relis le bloc « À propos », vérifie qu'aucune requête réseau ne part.
* Mettre à jour le README et les commentaires quand le code change (omni-texte annonce 1.3.0 alors que le code est en 1.3.1). [CONSTATÉ]

### 8. Technologies

* Pour une petite application : HTML, CSS et JavaScript purs, sans étape de compilation (build). [RECOMMANDÉ par défaut]
* React + Vite (build obligatoire, publication par GitHub Actions) n'est utilisé que si la complexité le justifie. [CONSTATÉ dans omni-budget et omni-grimoire]
* Publication : GitHub Pages. [CONSTATÉ]

### 9. Structure type d'un nouveau projet

[RECOMMANDÉ] Un dossier avec : `index.html`, `manifest.webmanifest`, `sw.js`, `css/` (thèmes inclus), `js/`, `assets/` (icônes, logo), `LICENSE`, `README.md`, `CLAUDE.md`, `licences-tierces.txt` si besoin, un dossier de tests. À ajuster après lecture d'omni-texte, qui est la référence la plus complète.

### 10. Périmètre actuel

Seuls omni-texte, Refuge, omni-budget et omni-grimoire ont été examinés. Cap, Soutien-IMC et les autres dépôts ne le seront pas pour le moment, par décision de Ferrus. Ne pas étendre les règles de ce document à un dépôt non lu sans l'avoir lu. [DÉCIDÉ]

### 11. Dettes connues, par priorité

- **Priorité 2** — Origine partagée : décision d'hébergement à étudier, reportée.
- **Priorité 4** — Méthode de version unique pour toutes les applications.
- **Priorité 6** — Éclair de thème (omni-budget, omni-grimoire), préfixe de cache générique d'omni-budget, documentation périmée.
