export const STATUS_LABEL = {
  en_attente: 'En attente',
  validee: 'Validée',
};

export const formatMontant = (valeur) =>
  `${Math.round(Number(valeur) || 0).toLocaleString('fr-FR')} F`;

export const formatDate = (valeur) =>
  valeur ? new Date(valeur).toLocaleDateString('fr-FR') : '-';

export const numeroFacture = (facture) =>
  facture.invoice_number || `FAC-${facture.id}`;

export const joursDepuis = (valeur) =>
  Math.floor((Date.now() - new Date(valeur).getTime()) / 86400000);

// Export compatible Excel (séparateur « ; », BOM UTF-8 pour les accents).
export function exporterCsv(nomFichier, lignes) {
  const echapper = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const contenu = '﻿' + lignes.map((ligne) => ligne.map(echapper).join(';')).join('\r\n');
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}
