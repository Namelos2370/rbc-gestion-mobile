import { renderToStaticMarkup } from 'react-dom/server';

// Ouvre tout de suite une fenêtre vierge. Doit être appelé au clic : sinon le navigateur (surtout sur téléphone)
// bloque la fenêtre. Le contenu est écrit ensuite, quand les données sont chargées.
export function ouvrirFenetreImpression() {
  return window.open('', '_blank');
}

// Écrit uniquement le document dans la fenêtre et lance l'impression.
// Le document n'a pas besoin de la feuille de style de l'application : il utilise des styles en ligne.
// Par défaut format A4 ; pour un ticket, on passe une autre mise en page (ex. 80 mm).
export function imprimerDansFenetre(fenetre, element, titre, { format = 'A4' } = {}) {
  const origine = window.location.origin;
  const html = renderToStaticMarkup(element).replace(/src="\//g, `src="${origine}/`);

  fenetre.document.open();
  fenetre.document.write(`<!doctype html>
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
</html>`);
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
