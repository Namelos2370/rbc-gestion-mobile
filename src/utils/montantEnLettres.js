// Conversion d'un montant entier en français, pour la mention « Arrêté la présente facture à la somme de ».
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function sousCent(n) {
  if (n < 20) return UNITES[n];
  if (n < 70) {
    const base = DIZAINES[Math.floor(n / 10)];
    const u = n % 10;
    if (u === 0) return base;
    if (u === 1) return `${base} et un`;
    return `${base}-${UNITES[u]}`;
  }
  if (n < 80) {
    const u = n - 60;
    return u === 11 ? 'soixante et onze' : `soixante-${UNITES[u]}`;
  }
  if (n === 80) return 'quatre-vingts';
  return `quatre-vingt-${sousCent(n - 80)}`;
}

function sousMille(n) {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  let s = '';
  if (centaines > 0) {
    s = centaines === 1 ? 'cent' : `${UNITES[centaines]} cent`;
    if (centaines > 1 && reste === 0) s += 's';
    if (reste > 0) s += ' ';
  }
  if (reste > 0) s += sousCent(reste);
  return s;
}

export function montantEnLettres(valeur) {
  const n = Math.round(Number(valeur) || 0);
  if (n === 0) return 'zéro';

  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const milliers = Math.floor((n % 1e6) / 1e3);
  const reste = n % 1000;
  const parties = [];

  if (milliards) parties.push(milliards === 1 ? 'un milliard' : `${sousMille(milliards)} milliards`);
  if (millions) parties.push(millions === 1 ? 'un million' : `${sousMille(millions)} millions`);
  if (milliers) parties.push(milliers === 1 ? 'mille' : `${sousMille(milliers)} mille`);
  if (reste) parties.push(sousMille(reste));

  const texte = parties.join(' ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
