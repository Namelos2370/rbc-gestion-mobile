import { renderToStaticMarkup } from 'react-dom/server';
import { imprimanteChoisie, imprimerHtml } from '../services/impression';

// Ouvre tout de suite une fenêtre vierge. Doit être appelé au clic : sinon le navigateur (surtout sur téléphone)
// bloque la fenêtre. Le contenu est écrit ensuite, quand les données sont chargées.
export function ouvrirFenetreImpression() {
  return window.open('', '_blank');
}

// Document HTML complet, avec styles en ligne (pas besoin de la feuille de style de l'application)
export function documentHtml(element, titre, { format = 'A4' } = {}) {
  const origine = window.location.origin;
  const html = renderToStaticMarkup(element).replace(/src="\//g, `src="${origine}/`);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titre}</title>
  <style>
    @page { size: ${format === 'ticket' ? '80mm auto' : 'A4'}; margin: ${format === 'ticket' ? '4mm' : '0'}; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

// Remplace les images par leur contenu intégré : l'imprimante ne doit pas dépendre du réseau pour le logo
async function embarquerImages(html) {
  const sources = [...new Set([...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]))];
  let resultat = html;
  for (const src of sources) {
    if (src.startsWith('data:')) continue;
    try {
      const reponse = await fetch(src);
      const blob = await reponse.blob();
      const data = await new Promise((resoudre, rejeter) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resoudre(lecteur.result);
        lecteur.onerror = rejeter;
        lecteur.readAsDataURL(blob);
      });
      resultat = resultat.split(`src="${src}"`).join(`src="${data}"`);
    } catch {
      // Image introuvable : le document reste imprimable sans elle
    }
  }
  return resultat;
}

// Écrit uniquement le document dans la fenêtre et lance l'impression.
// Par défaut format A4 ; pour un ticket, on passe une autre mise en page (ex. 80 mm).
export function imprimerDansFenetre(fenetre, element, titre, { format = 'A4' } = {}) {
  const html = documentHtml(element, titre, { format });

  fenetre.document.open();
  fenetre.document.write(html);
  fenetre.document.close();

  const lancer = () => {
    fenetre.focus();
    fenetre.print();
  };
  const image = fenetre.document.querySelector('img');
  if (!image || image.complete) {
    setTimeout(lancer, 300);
  } else {
    image.onload = lancer;
    image.onerror = lancer;
  }
}

// Impression : directe sur l'imprimante choisie si elle est configurée et que QZ Tray répond,
// sinon par la boîte d'impression du navigateur. Renvoie le mode utilisé.
export async function imprimerDocument(fenetre, element, titre, { format = 'A4' } = {}) {
  if (imprimanteChoisie()) {
    try {
      const html = await embarquerImages(documentHtml(element, titre, { format }));
      await imprimerHtml(html, { format });
      fenetre.close();
      return 'imprimante';
    } catch (err) {
      console.warn('Impression directe indisponible, repli sur le navigateur :', err?.message || err);
    }
  }
  imprimerDansFenetre(fenetre, element, titre, { format });
  return 'navigateur';
}
