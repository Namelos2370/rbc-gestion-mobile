import { Plus, Trash2 } from 'lucide-react';
import { formatMontant } from '../utils/format';

export const LIGNE_VIDE = { designation: '', quantite: '', prix: '' };

export const totalLignes = (lignes) =>
  lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0);

const champ =
  'min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const etiquette = 'md:hidden block text-xs font-semibold text-slate-500 mb-1';

// Saisie des lignes d'une facture : désignation, quantité, prix unitaire, total calculé.
// Sur téléphone, chaque ligne devient un bloc avec étiquettes ; sur ordinateur, une grille.
export default function LignesFacture({ lignes, onChange }) {
  const modifier = (index, champName, valeur) =>
    onChange(lignes.map((l, i) => (i === index ? { ...l, [champName]: valeur } : l)));

  const ajouter = () => onChange([...lignes, { ...LIGNE_VIDE }]);
  const retirer = (index) => onChange(lignes.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <p className="hidden md:grid grid-cols-[1fr_90px_140px_140px_44px] gap-2 text-sm font-semibold text-slate-600">
        <span>Désignation</span>
        <span>Qté</span>
        <span>P.U (F)</span>
        <span className="text-right">P.T (F)</span>
        <span />
      </p>

      {lignes.map((l, i) => (
        <div key={i}
          className="grid grid-cols-2 md:grid-cols-[1fr_90px_140px_140px_44px] gap-3 md:gap-2 items-end md:items-center bg-white md:bg-transparent border border-slate-200 md:border-0 rounded-xl p-3 md:p-0">
          <label className="col-span-2 md:col-span-1">
            <span className={etiquette}>Désignation {lignes.length > 1 ? `(ligne ${i + 1})` : ''}</span>
            <input className={champ} placeholder="Désignation de la prestation" value={l.designation} required
              aria-label={`Désignation ligne ${i + 1}`}
              onChange={(e) => modifier(i, 'designation', e.target.value)} />
          </label>
          <label>
            <span className={etiquette}>Quantité</span>
            <input className={champ} type="number" inputMode="numeric" min="1" step="1" value={l.quantite} required placeholder="Qté"
              aria-label={`Quantité ligne ${i + 1}`}
              onChange={(e) => modifier(i, 'quantite', e.target.value)} />
          </label>
          <label>
            <span className={etiquette}>Prix unitaire (F)</span>
            <input className={champ} type="number" inputMode="numeric" min="0" step="1" placeholder="0" value={l.prix} required
              aria-label={`Prix unitaire ligne ${i + 1}`}
              onChange={(e) => modifier(i, 'prix', e.target.value)} />
          </label>
          <div className="min-h-[44px] flex items-center justify-between md:justify-end gap-2 font-semibold whitespace-nowrap">
            <span className="md:hidden text-xs font-semibold text-slate-500">Total ligne</span>
            <span>{formatMontant((Number(l.quantite) || 0) * (Number(l.prix) || 0))}</span>
          </div>
          <button type="button" onClick={() => retirer(i)} disabled={lignes.length === 1}
            aria-label={`Supprimer la ligne ${i + 1}`}
            className="col-span-2 md:col-span-1 min-h-[44px] md:min-w-[44px] rounded-lg border md:border-0 border-red-200 text-red-600 hover:bg-red-50 disabled:text-slate-300 disabled:border-slate-200 flex items-center justify-center gap-2">
            <Trash2 size={16} /> <span className="md:hidden text-sm">Supprimer cette ligne</span>
          </button>
        </div>
      ))}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button type="button" onClick={ajouter}
          className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white flex items-center justify-center gap-2">
          <Plus size={16} /> Ajouter une ligne
        </button>
        <p className="text-lg sm:text-xl font-bold">Total : {formatMontant(totalLignes(lignes))}</p>
      </div>
    </div>
  );
}
