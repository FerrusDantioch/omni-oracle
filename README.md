# Omni-Oracle

L'oracle de l'**Omni-système** (jeu de rôle d20 de Ferrus Dantioch) : un MJ de poche pour jouer
**en solo** (1 PJ, parfois des PNJ compagnons) ou **en duo** (2 PJ), ou pour **aider un vrai MJ**
à improviser.

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
| **Mission** | Tables T1 à T6 (tirer, verrouiller, choisir à la main), déroulé suggéré, clôture « La mission est-elle un succès ? » |
| **PNJ** | Rôle, trait, motivation (N1 à N3), nom, attitude, profil, puis ajout à la fiche |
| **Intentions** | Ce que fait un ennemi ou un compagnon (+4 si blessé, −2 si Pression ≥ 7) ; vaisseaux ennemis (table E) |
| **Vaisseaux** | Space opéra seulement : type (D1) avec statistiques, escadrille, escorte, attitude (D2), réaction à une proposition |
| **Fiche** | Fiche de suivi modifiable : fils ouverts, PNJ, menaces, lieux, journal de scènes |
| **Tables** | Toutes les tables de l'univers, avec recherche, tirage ou choix d'une ligne précise |
| **Journal** | L'historique de la partie |

Toujours visible en haut de l'écran : la **Pression** (avec + et −), le palier, le numéro de
scène, les **omni-points** de chaque PJ et de l'Oracle, et le seuil de rupture.

Dans le **menu** : mes parties, modifier la partie, mission suivante, export, **mode assistant
du MJ** (résultats masqués, affichés au toucher), livret imprimable, réglages (thème Omni,
Sombre, Clair ou Auto, vibrations, vrai dé), installation, à propos.

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

## Ajouter un univers (Fantasy, Horreur…)

**Aucun code à modifier.** Il suffit de :

1. Créer un fichier, par exemple `data/fantasy.json`, en copiant `data/cyberpunk.json` comme modèle.
2. L'ajouter à la liste de `data/univers.json` :
   ```json
   "univers": ["data/cyberpunk.json", "data/space-opera.json", "data/fantasy.json"]
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
    "pnj": { "role": "N1", "trait": "N2", "motivation": "N3" }
    // facultatif (space opéra) : "vaisseaux": { "type": "D1", "attitude": "D2" }, "intentionsVaisseau": "E"
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
    // Reprendre une table d'un autre univers (comme N2 du space opéra) :
    { "id": "N2", "titre": "N2 — Trait", "de": "d20", "reference": { "univers": "cyberpunk", "table": "N2" } }
  ]
}
```

- Le texte garde la mise en forme des règles : `**gras**`, `*italique*`, listes `- …` et `1. …`.
- `{{table T1}}` place une table dans le texte (application et livret).
- Les sections `mission`, `deroule` et `cloture` sont affichées dans l'onglet Mission. La section
  `pnj` est affichée dans l'onglet PNJ.

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
À propos, mise à jour, livret, nouvel univers.

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
js/moteur.js                les règles (oracle, Pression, scènes, omni-points…)
js/vue-*.js                 les onglets de l'application
js/livret.js                construction du livret
data/                       tronc commun et univers (JSON)
sources/                    les règles d'origine (Markdown), pour référence
assets/, icons/             logo et icônes
tests/                      contrôles automatiques
kit/                        kit fourni au départ (référence)
```

## Licence

- **Code** (HTML, CSS, JavaScript) : © 2026 Ferrus Dantioch, licence Creative Commons
  BY-NC-ND 4.0 (voir `LICENSE`).
- **Règles, tables et textes de l'Omni-système**, logo compris : © 2026 Ferrus Dantioch,
  **tous droits réservés**.

Contact : omni-systeme.choking513@passmail.net
