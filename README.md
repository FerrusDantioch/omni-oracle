# Omni-Oracle

L'oracle de l'**Omni-système** (jeu de rôle d20 de Ferrus Dantioch) : un MJ de poche pour jouer
**en solo** (1 PJ, parfois des PNJ compagnons) ou **en duo** (2 PJ), ou pour **aider un vrai MJ**
à improviser.

Quatre univers : **Cyberpunk**, **Space opéra**, **Fantasy** et **Horreur / enquête**.

Il existe sous deux formes qui lisent **les mêmes données** :

1. **L'application** (`index.html`) : un outil de table, pensé pour la tablette, qui fonctionne
   aussi sur téléphone et sur ordinateur.
2. **Le livret imprimable** (`livret.html`) : pour jouer sans écran, avec un vrai d20.

Adresse publique : <https://ferrusdantioch.github.io/omni-oracle/>

## Principes

- **Aucun compte, aucun serveur, aucune IA intégrée.** Tout se passe sur ton appareil.
- **Hors ligne** : après la première ouverture, tout fonctionne sans internet.
- **Tes parties restent sur l'appareil.** Tu peux les exporter dans un fichier JSON pour les
  sauvegarder ou changer d'appareil, puis les importer ailleurs.
- **Aucune requête vers un autre site** : une règle de sécurité (CSP) l'interdit au navigateur.
- **Site statique** en HTML, CSS et JavaScript, sans framework ni étape de compilation.

## Ce que fait l'application

| Onglet | Contenu |
|---|---|
| **Jouer** | Assistant de scène (altération selon la Pression, soupape), oracle de question (5 vraisemblances, 6 degrés, complications, contestation en duo), lanceur de d20 (avantage, désavantage, modificateur, ou saisie de ton vrai dé) |
| **Mission** (« Quête » en fantasy, « Mystère » en horreur) | Tables T1 à T6 (tirer, verrouiller, choisir à la main), déroulé suggéré, clôture de l'univers (« La mission est-elle un succès ? », « La quête est-elle un succès ? », « L'affaire est-elle résolue ? ») |
| **PNJ** | Rôle, trait, motivation (N1 à N3), nom, attitude, profil, puis ajout à la fiche |
| **Intentions** | Ce que fait un ennemi ou un compagnon (+4 si blessé, −2 si Pression ≥ 7), avec les profils en plus de l'univers (F4 en fantasy, M1 en horreur) ; vaisseaux ennemis (table E) |
| **Vaisseaux** / **Rencontres** | Space opéra : type (D1) avec statistiques, escadrille, escorte, attitude (D2). Fantasy : type de rencontre (F1, bande de 1d4+1), attitude et état (F2). Réaction à une proposition |
| **Fiche** | Fiche de suivi modifiable : fils ouverts, PNJ, menaces, lieux, journal de scènes. En horreur : indices trouvés, suspects et témoins, chronologie, chocs et folie de chaque PJ |
| **Tables** | Toutes les tables de l'univers, avec recherche : tirage ou choix d'une ligne précise ; grilles de profils (F4, M1) et paliers propres à l'univers à consulter |
| **Journal** | L'historique de la partie |

Toujours visible en haut de l'écran : la **Pression** (avec + et −), le palier, le numéro de
scène, les **omni-points** de chaque PJ et de l'Oracle, et le seuil de rupture. En horreur
(univers sans omni-points) : les **points de choc** de chaque PJ à la place des omni-points.

**Horreur / enquête** : pas d'omni-points ni de contestation ; paliers de Pression « Calme
trompeur → Rupture » ; chocs (+1 / +2 après la table C1, +1 après « Terrorise » de M1) ;
à 5 chocs, alerte et conversion en 1 point de folie avec un jet sur la table de folie
(option « la folie s'aggrave », décochée par défaut). « Option à tester » de la source, dans
l'onglet Mystère (décochée par défaut) : à la Pression 9, le rebondissement est tiré s'il ne
l'est pas encore. **Fantasy** : rappel « un omni-point
permet aussi de récupérer une utilisation de sort » dans « Dépenser un omni-point ».

Dans le **menu** : mes parties, modifier la partie, mission suivante, export, livret
imprimable, réglages (thème Omni, Sombre, Clair ou Auto, luminosité, vibrations, vrai dé,
« Masquer les résultats (écran visible des joueurs) », rappel de sauvegarde), installation,
à propos.

**Rappel de sauvegarde** : après 5 scènes jouées sans export, un bandeau discret propose
d'exporter la partie (« Plus tard » le repousse de 5 scènes). « Mes parties » indique la date
du dernier export. L'application demande aussi au navigateur de garder ses données même s'il
manque de place (« stockage persistant ») ; l'état est affiché dans les Réglages. Rien n'est
envoyé nulle part.

Chaque résultat de table (mission, rebondissement, PNJ, complication, intention, rencontre,
onglet Tables) est une **suggestion** : le MJ a le dernier mot.

- **Relancer** : nouveau tirage ; l'ancien reste dans le journal, barré (« relancé par le MJ »).
- **Ignorer** : le résultat est écarté ; il reste dans le journal, barré (« ignoré par le MJ »).
  Pour une complication de début de scène, seule la complication est relancée ou ignorée :
  le d20 d'altération (la règle) ne change pas.
- **Afficher aux joueurs** : le résultat en très grand, plein écran, lisible de l'autre côté
  de la table ; un toucher (ou Échap) ferme.
- Réglage **Masquer les résultats** (désactivé par défaut) : les résultats sont floutés, un
  toucher les révèle.

## Publier sur GitHub Pages

Le site se publie **tel quel**, depuis la branche `main`, à la racine du dépôt.

1. Sur GitHub, ouvre le dépôt `omni-oracle`, puis **Settings** → **Pages**.
2. Dans **Build and deployment**, choisis **Source : Deploy from a branch**.
3. Choisis la branche **`main`** et le dossier **`/ (root)`**, puis **Save**.
4. Après une ou deux minutes, le site est en ligne à l'adresse ci-dessus.

Le fichier `.nojekyll` (vide) demande à GitHub de publier les fichiers sans les transformer.

### À chaque nouvelle publication

1. Augmente le numéro de **version** dans `js/config.js` (par exemple `0.1.0` → `0.1.1`).
   C'est ce qui fait apparaître le bouton « Mettre à jour » chez les personnes qui ont
   installé l'application.
2. Lance les tests (voir plus bas).
3. Fusionne dans `main`.

## Ajouter un univers

**Aucun code à modifier.** Il suffit de :

1. Créer un fichier, par exemple `data/western.json`, en copiant `data/cyberpunk.json` comme modèle.
2. L'ajouter à la liste de `data/univers.json` :
   ```json
   "univers": ["data/cyberpunk.json", "data/space-opera.json", "data/fantasy.json", "data/horreur-enquete.json", "data/western.json"]
   ```
3. Augmenter la version dans `js/config.js`.
4. Lancer `npm test` : le contrôle vérifie que chaque table couvre bien 1 à 20.

L'univers apparaît alors dans le choix de la nouvelle partie, dans les onglets et dans le livret,
et il est disponible hors ligne.

### Format d'un fichier d'univers

```jsonc
{
  "format": 1,
  "id": "fantasy",                // identifiant (lettres minuscules et tirets), ne plus le changer ensuite
  "nom": "Fantasy",               // nom affiché
  "ordre": 3,                     // position dans les listes
  "source": "sources/03-fantasy.md", // facultatif : active la comparaison mot pour mot avec la source
  "omniPointsPJ": 3,              // omni-points de chaque PJ par mission
  "roles": {                      // quelle table sert à quoi
    "mission": ["T1", "T2", "T3", "T4", "T5", "T6"],
    "rebondissement": "T6",
    "complications": "C",
    "pnj": { "role": "N1", "trait": "N2", "motivation": "N3" },
    // facultatif : onglet des rencontres (« Vaisseaux » en space opéra, « Rencontres » en fantasy)
    "rencontres": { "type": "F1", "attitude": "F2", "onglet": "Rencontres", "titre": "Rencontre",
                    "question": "Le groupe rencontré accepte la proposition ?" }
    // facultatif (space opéra) : "intentionsVaisseau": "E"
  },
  "options": {                    // facultatif : différences de règles (absent = comme le tronc commun)
    "libelles": { "mission": { "nom": "quête", "feminin": true } }, // « Quête », « Tirer toute la quête »…
    "omniPoints": false,          // aucun omni-point (mettre aussi "omniPointsPJ": 0) ; défaut : true
    "contestation": false,        // pas de contestation en duo ; défaut : true (jamais sans omni-points)
    "rebondissementAuSeuil": true, // propose la case « à 9, tirer le rebondissement s'il ne l'est pas »
    "paliers": "paliers",         // table de l'univers qui remplace les paliers de Pression (noms, textes)
    "profils": ["F4"],            // tables de profils d'intention ajoutées à celles du tronc commun
    "rappelOmni": "…",            // rappel affiché dans « Dépenser un omni-point »
    "fiche": [                    // rubriques en plus dans la fiche de suivi (application et livret)
      { "id": "indices", "titre": "Indices trouvés", "ajout": "Ajouter un indice", "aide": "…",
        "table": "I1",            // facultatif : « Noter dans … » après un tirage sur cette table
        "champs": [{ "cle": "texte", "etiquette": "Indice", "type": "textarea" }, { "cle": "endroit", "etiquette": "Endroit" }] }
    ],
    "chocs": { "seuil": 5, "table": "C1", "folie": "folie", "rappel": "…", "alerte": "5 chocs = 1 point de folie" }
  },
  "cloture": {
    "question": "La mission est-elle un succès ?",
    "issues": [
      { "libelle": "Oui, et… / Oui", "reponses": ["oui-et", "oui"], "texte": "succès complet." },
      { "libelle": "Oui, mais… / Non, mais…", "reponses": ["oui-mais", "non-mais"], "texte": "succès partiel." },
      { "libelle": "Non / Non, et…", "reponses": ["non", "non-et"], "texte": "échec, avec conséquences." }
    ]
  },
  "sections": [                   // le texte des règles, dans l'ordre du livret
    { "id": "mission", "titre": "A. Générer une mission", "niveau": 1, "texte": ["Tire un d20…"] },
    { "id": "deroule", "titre": "Déroulé suggéré", "niveau": 2, "texte": ["1. **Accroche** : …"] },
    { "id": "cloture", "titre": "Clôture", "niveau": 2, "texte": ["…"] },
    { "id": "T1", "titre": "T1 — Accroche", "niveau": 2, "texte": ["{{table T1}}"] }
  ],
  "tables": [
    {
      "id": "T1",
      "titre": "T1 — Accroche",
      "de": "d20",
      "colonnes": ["d20", "Résultat"],        // en-têtes (colonnes en plus possibles, ex. D1)
      "lignes": [
        { "plage": "1", "texte": "…" },       // plage : "5", "1-4"…
        { "plage": "2-3", "texte": "…", "autres": ["colonne 3"] }
      ]
    },
    // Reprendre une table du tronc commun ou d'un autre univers (N2, commune à tous les univers) :
    { "id": "N2", "titre": "N2 — Trait", "reference": { "univers": "commun", "table": "N2" } }
  ]
}
```

- Le texte garde la mise en forme des règles : `**gras**`, `*italique*`, listes `- …` et `1. …`.
- `{{table T1}}` place une table dans le texte (application et livret).
- Les sections `mission`, `deroule` et `cloture` sont affichées dans l'onglet Mission. La section
  `pnj` est affichée dans l'onglet PNJ.
- Une section peut venir d'une autre source que l'univers (`"source": "sources/06-…md"` dans la
  section) : c'est le cas de la table de folie de l'horreur.
- Une table peut avoir des **intertitres** (`"groupes": [{ "avant": "8", "texte": "…" }]`), placés
  avant la ligne indiquée.
- Champs utilisés par le moteur : `escadrille`, `escorte`, `famille` (D1), `groupe` (F1 : nombre
  à lancer), `attitude` (D2, F2), `modificateurs` (grilles de profils, table E ; `libelleBlesse`
  pour le texte de la case +4), `actionsChoc` (M1 : actions qui donnent un point de choc),
  `chocAllie` et `aggravation` (table de folie).

## Tester

Les tests ne font pas partie de l'application : ce sont des outils de développement.

```bash
npm test
```
Données (plages 1-20, fidélité aux sources), moteur de règles, sécurité. Il suffit d'avoir Node.js.

```bash
npm install
```
À faire une fois, pour installer Playwright (l'outil qui pilote un navigateur pour les tests).

```bash
npx playwright test
```
Tests dans le navigateur : hors ligne, réseau, thèmes et contrastes, tablette et téléphone,
À propos, mise à jour, livret, nouvel univers, options des univers (fantasy, horreur), chocs
et folie, suggestions du MJ, et relecture de vraies parties de la version 0.2.1.

Pour essayer l'application sur ton ordinateur :

```bash
npm run serveur
```
puis ouvre <http://127.0.0.1:8080/>.

## Organisation des fichiers

```
index.html, livret.html     les deux pages
manifest.webmanifest        description de l'application installable
sw.js                       service worker : copie hors ligne et mise à jour
css/themes.css              les SEULES couleurs (thèmes Omni, Sombre, Clair)
css/app.css, css/livret.css mise en page
js/config.js                nom, version, auteur, contact, identifiant de stockage
js/moteur.js                les règles (oracle, Pression, scènes, omni-points, chocs, folie…)
js/vue-*.js                 les onglets de l'application
js/livret.js                construction du livret
data/                       tronc commun et univers (JSON)
sources/                    les règles d'origine (Markdown), pour référence ; 06 = table de folie
                            recopiée du PDF de Ferrus
assets/, icons/             logo et icônes
tests/                      contrôles automatiques
```

## Licence

- **Code** (HTML, CSS, JavaScript) : © 2026 Ferrus Dantioch, licence Creative Commons
  BY-NC-ND 4.0 (voir `LICENSE`).
- **Règles, tables et textes de l'Omni-système**, logo compris : © 2026 Ferrus Dantioch,
  **tous droits réservés**.

Contact : omni-systeme.choking513@passmail.net
