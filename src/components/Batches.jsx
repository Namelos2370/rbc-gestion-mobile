import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Download } from 'lucide-react';
import { logAudit } from '../services/invoices';
import { formatMontant, formatDate, numeroFacture, exporterCsv } from '../utils/format';

export default function Batches({ user, onChange }) {
  const [lots, setLots] = useState([]);
  const [toutes, setToutes] = useState([]);
  const [selection, setSelection] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    const [{ data: lotsData, error: e1 }, { data: facturesData, error: e2 }] = await Promise.all([
      supabase.from('batches').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*'),
    ]);
    if (e1 || e2) return setError((e1 || e2).message);
    setLots(lotsData || []);
    setToutes(facturesData || []);
  };

  const validees = toutes.filter((f) => f.status === 'validee');
  const parId = Object.fromEntries(toutes.map((f) => [f.id, f]));

  const toggle = (id) =>
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const genererLot = async () => {
    setBusy(true);
    setError('');
    try {
      const numero = `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const { data, error: err } = await supabase
        .from('batches')
        .insert([{ batch_number: numero, invoice_ids: selection, created_by: user?.id }])
        .select()
        .single();
      if (err) throw err;

      const montant = selection.reduce((s, id) => s + Number(parId[id]?.amount || 0), 0);
      await logAudit(user, {
        entityType: 'batch',
        entityId: 0,
        action: 'create_batch',
        after: { batch_id: data.id, batch_number: numero, invoice_ids: selection, total: montant },
      });

      setSelection([]);
      await charger();
      onChange?.();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const telecharger = (lot) => {
    const factures = (lot.invoice_ids || []).map((id) => parId[id]).filter(Boolean);
    exporterCsv(`${lot.batch_number || 'lot'}.csv`, [
      ['N°', 'Client', 'Service', 'Montant (F)'],
      ...factures.map((f) => [numeroFacture(f), f.client, f.service, Math.round(Number(f.amount))]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-3">Générer un lot de proformas</h2>
        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {validees.length === 0 ? (
          <p className="text-slate-500">Aucune facture validée</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {validees.map((f) => (
              <li key={f.id}>
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input type="checkbox" checked={selection.includes(f.id)} onChange={() => toggle(f.id)}
                    className="w-5 h-5 accent-blue-600" />
                  <span>{f.client} · {f.service} · {formatMontant(f.amount)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <button onClick={genererLot} disabled={busy || selection.length === 0}
          className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold">
          {busy ? 'Génération...' : `Générer le lot (${selection.length})`}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-3">Historique des lots</h2>
        {lots.length === 0 ? (
          <p className="text-slate-500">Aucun lot généré</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {lots.map((lot) => {
              const total = (lot.invoice_ids || []).reduce((s, id) => s + Number(parId[id]?.amount || 0), 0);
              return (
                <li key={lot.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold">{lot.batch_number}</p>
                    <p className="text-sm text-slate-600">
                      {(lot.invoice_ids || []).length} facture(s) · Total : {formatMontant(total)} · {formatDate(lot.created_at)}
                    </p>
                  </div>
                  <button onClick={() => telecharger(lot)}
                    className="min-h-[44px] px-4 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-2">
                    <Download size={16} /> Télécharger
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
