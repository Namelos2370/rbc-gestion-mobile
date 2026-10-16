import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Check, Pencil } from 'lucide-react';
import EditInvoiceModal from './EditInvoiceModal';
import { validerFacture } from '../services/invoices';
import { formatMontant, numeroFacture, formatDate } from '../utils/format';

export default function Validation({ user, onChange }) {
  const [factures, setFactures] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    const { data, error: err } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'en_attente')
      .order('created_at', { ascending: false });
    if (err) return setError(err.message);
    setFactures(data || []);
  };

  const rafraichir = async () => {
    await charger();
    onChange?.();
  };

  const valider = async (facture) => {
    setBusy(true);
    setError('');
    try {
      await validerFacture(user, facture);
      await rafraichir();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Factures à valider</h2>
        </div>

        {error && <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {factures.length === 0 ? (
          <p className="text-center text-slate-500 py-10">Aucune facture à valider</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {factures.map((f) => (
              <li key={f.id} className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold">{f.client}</p>
                  <p className="text-sm text-slate-600">{f.service}</p>
                  <p className="text-sm text-slate-500">{numeroFacture(f)} · {formatDate(f.created_at)}</p>
                </div>
                <p className="font-semibold whitespace-nowrap">{formatMontant(f.amount)}</p>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(f)}
                    className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white flex items-center gap-2">
                    <Pencil size={16} /> Modifier
                  </button>
                  <button onClick={() => valider(f)} disabled={busy}
                    className="min-h-[44px] px-4 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold flex items-center gap-2">
                    <Check size={16} /> Valider
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EditInvoiceModal
          facture={editing}
          user={user}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            rafraichir();
          }}
        />
      )}
    </div>
  );
}
