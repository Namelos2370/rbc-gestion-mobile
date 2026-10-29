import qz from 'qz-tray';

// Impression directe via QZ Tray (programme installé sur l'ordinateur).
// Le choix de l'imprimante est propre à chaque ordinateur : il est gardé dans le navigateur de cette machine.
const CLE_IMPRIMANTE = 'rbc_imprimante_choisie';

export function imprimanteChoisie() {
  try {
    return localStorage.getItem(CLE_IMPRIMANTE) || '';
  } catch {
    return '';
  }
}

export function enregistrerImprimante(nom) {
  try {
    if (nom) localStorage.setItem(CLE_IMPRIMANTE, nom);
    else localStorage.removeItem(CLE_IMPRIMANTE);
  } catch {
    // Stockage indisponible : l'impression reste possible par le navigateur
  }
}

async function connecter() {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 1, delay: 1 });
  }
}

// Liste les imprimantes reconnues par le système sur cet ordinateur
export async function listerImprimantes() {
  await connecter();
  const liste = await qz.printers.find();
  return Array.isArray(liste) ? liste : [liste];
}

// Envoie un document HTML à l'imprimante choisie, sans boîte de dialogue
export async function imprimerHtml(html, { imprimante, format = 'A4' }) {
  await connecter();
  const nom = imprimante || imprimanteChoisie();
  if (!nom) throw new Error('Aucune imprimante choisie.');
  const config = qz.configs.create(nom, format === 'ticket'
    ? { size: { width: 80 }, units: 'mm', margins: 4 }
    : { size: { width: 210, height: 297 }, units: 'mm', margins: 0 });
  await qz.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }]);
}
