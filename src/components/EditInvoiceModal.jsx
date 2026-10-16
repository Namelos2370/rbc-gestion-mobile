import { useState, useEffect } from 'react';
import { modifierFacture, chargerLignes } from '../services/invoices';
import LignesFacture, { LIGNE_VIDE } from './LignesFacture';

export default function EditInvoiceModal({ facture, user, onClose, onSaved }) {
  const [client, setClient] = useState(facture.client);
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }]);
  const [chargement, setChargement] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chargerLignes(facture.id)
      .then((items) =>
        setLignes(
          items.length
            ? items.map((i) => ({ designation: i.designation, quantite: i.quantity, prix: i.unit_price }))
            : [{ ...LIGNE_VIDE }]
        )
      )
      .catch((err) => setError(err.message))
      .finally(() => setChargement(false));
  }, [facture.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await modifierFacture(user, facture, { client, lignes });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const champ =
    'min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl w-full sm:max-w-3xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl p-5 sm:p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier la facture"
      >
        <h3 className="text-lg sm:text-xl font-semibold pr-8">Modifier la facture {facture.invoice_number || `FAC-${facture.id}`}</h3>

        <label className="block text-sm font-semibold text-slate-700">
          Nom du client
          <input className={`${champ} mt-1`} value={client} required onChange={(e) => setClient(e.target.value)} />
        </label>

        {chargement ? (
          <p className="text-slate-500">Chargement des lignes...</p>
        ) : (
          <LignesFacture lignes={lignes} onChange={setLignes} />
        )}

        {facture.status === 'validee' && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
            Cette facture est déjà validée : la modification sera tracée dans le journal d'audit.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose}
            className="min-h-[44px] px-5 rounded-lg border border-slate-300 bg-white">
            Annuler
          </button>
          <button type="submit" disabled={saving || chargement}
            className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
