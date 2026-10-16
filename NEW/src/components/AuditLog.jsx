import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { RefreshCw } from 'lucide-react';

const LIBELLES = {
  validate_invoice: 'Validation de facture',
  edit_invoice: 'Modification de facture',
  edit_validated_invoice: 'Modification après validation',
  delete_invoice: 'Suppression de facture',
  create_batch: 'Création de lot de proformas',
};

const formatValeur = (v) => (v ? JSON.stringify(v) : '');

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [noms, setNoms] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    setLoading(true);
    setError('');
    const [{ data: journal, error: e1 }, { data: profils, error: e2 }] = await Promise.all([
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id, name'),
    ]);
    if (e1 || e2) setError((e1 || e2).message);
    setLogs(journal || []);
    setNoms(Object.fromEntries((profils || []).map((p) => [p.id, p.name])));
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold mr-auto">Journal d'audit</h2>
          <button onClick={charger} disabled={loading}
            className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white flex items-center gap-2">
            <RefreshCw size={16} /> {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        {error && <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {logs.length === 0 ? (
          <p className="text-center text-slate-500 py-10">Aucune entrée dans le journal</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {logs.map((log) => (
              <li key={log.id} className="p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold">{LIBELLES[log.action] || log.action}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {noms[log.user_id] || 'Utilisateur inconnu'} · {log.entity_type}
                  {log.entity_type === 'invoice' ? ` #${log.entity_id}` : ''}
                </p>
                {(log.before_value || log.after_value) && (
                  <p className="text-xs text-slate-500 mt-1 break-all">
                    {log.before_value && <>Avant : {formatValeur(log.before_value)} </>}
                    {log.after_value && <>Après : {formatValeur(log.after_value)}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
