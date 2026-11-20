// Affichage du texte des tables et des règles.
// Les données gardent la mise en forme des sources (**gras**, *italique*, `code`).
// Ces fonctions la transforment en éléments HTML, SANS jamais interpréter de HTML
// (le texte est toujours inséré comme texte, jamais comme code).

const MOTIF_EN_LIGNE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;

/** Texte d'une ligne avec **gras**, *italique* et `code` → fragment de document. */
export function formaterEnLigne(texte) {
  const frag = document.createDocumentFragment();
  let dernier = 0;
  for (const m of String(texte).matchAll(MOTIF_EN_LIGNE)) {
    if (m.index > dernier) frag.append(texte.slice(dernier, m.index));
    const t = m[0];
    let el;
    if (t.startsWith('**')) { el = document.createElement('strong'); el.textContent = t.slice(2, -2); }
    else if (t.startsWith('`')) { el = document.createElement('code'); el.textContent = t.slice(1, -1); }
    else { el = document.createElement('em'); el.textContent = t.slice(1, -1); }
    frag.append(el);
    dernier = m.index + t.length;
  }
  if (dernier < texte.length) frag.append(texte.slice(dernier));
  return frag;
}

/** Le même texte sans aucune marque de mise en forme (pour la recherche, les titres…). */
export function texteBrut(texte) {
  return String(texte).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

/**
 * Rend un bloc de lignes de règles (listes, listes numérotées, sous-listes, paragraphes).
 * `rendreTable(id)` est appelé pour chaque marqueur {{table X}}.
 */
export function rendreBloc(lignes, rendreTable = () => null) {
  const frag = document.createDocumentFragment();
  // Pile de listes ouvertes : { indent, el }
  let pile = [];
  const fermer = () => { pile = []; };
  for (const ligne of lignes) {
    const table = ligne.match(/^\{\{table (.+)\}\}$/);
    if (table) {
      fermer();
      const t = rendreTable(table[1]);
      if (t) frag.append(t);
      continue;
    }
    const m = ligne.match(/^(\s*)(- |\d+\. )(.*)$/);
    if (m) {
      const indent = m[1].length;
      const type = m[2] === '- ' ? 'ul' : 'ol';
      while (pile.length && pile.at(-1).indent > indent) pile.pop();
      let liste = pile.at(-1);
      if (!liste || liste.indent < indent || liste.el.tagName.toLowerCase() !== type) {
        const nouvelle = document.createElement(type);
        if (liste && liste.indent < indent) {
          liste.el.lastElementChild.append(nouvelle);
        } else {
          if (liste) pile.pop();
          frag.append(nouvelle);
        }
        liste = { indent, el: nouvelle };
        pile.push(liste);
      }
      const li = document.createElement('li');
      li.append(formaterEnLigne(m[3]));
      liste.el.append(li);
      continue;
    }
    fermer();
    const p = document.createElement('p');
    p.append(formaterEnLigne(ligne));
    frag.append(p);
  }
  return frag;
}
