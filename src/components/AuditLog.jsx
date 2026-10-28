import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { pourFirme } from '../services/firme';
import { RefreshCw, ClipboardList } from 'lucide-react';
import { formatMontant } from '../utils/format';

const LIBELLES = {
  validate_invoice: 'Facture validée',
  edit_invoice: 'Facture modifiée',
  edit_validated_invoice: 'Facture validée modifiée',
  delete_invoice: 'Facture supprimée',
  create_invoice: 'Facture créée',
  create_batch: 'Lot de proformas créé',
  encaisser_facture: 'Facture encaissée',
  create_proforma: 'Proforma créée',
  delete_proforma: 'Proforma supprimée',
  create_depense: 'Dépense créée',
  update_depense: 'Dépense modifiée',
  delete_depense: 'Dépense supprimée',
};

// Libellés des champs enregistrés dans le journal
const CHAMPS = {
  invoice_number: 'Numéro',
  client: 'Client',
  total: 'Total',
  amount: 'Montant',
  batch_number: 'Numéro de lot',
  invoice_ids: 'Factures',
  batch_id: 'Lot',
  lignes: 'Lignes',
  libelle: 'Libellé',
  categorie: 'Catégorie',
  note: 'Note',
  date_depense: 'Date',
  montant: 'Montant',
};

// Affiche les valeurs du journal en clair, sans JSON
function valeursLisibles(valeur) {
  if (!valeur) return [];
  return Object.entries(valeur).map(([cle, val]) => {
    if (cle === 'lignes' && Array.isArray(val)) {
      return {
        libelle: CHAMPS[cle],
        liste: val.map((l) => `${l.designation} : ${l.quantite} × ${formatMontant(l.prix)}`),
      };
    }
    let texte;
    if (Array.isArray(val)) texte = `${val.length} élément(s)`;
    else if (cle === 'total' || cle === 'amount' || cle === 'montant') texte = formatMontant(val);
    else if (cle === 'batch_id') texte = String(val).slice(0, 8);
    else texte = String(val);
    return { libelle: CHAMPS[cle] || cle, texte };
  });
}

function Detail({ titre, valeur }) {
  const lignes = valeursLisibles(valeur);
  if (lignes.length === 0) return null;
  return (
    <div className="flex-1 min-w-[180px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{titre}</p>
      <dl className="text-sm space-y-0.5">
        {lignes.map((l) => (
          <div key={l.libelle} className="flex gap-2">
            <dt className="text-slate-500">{l.libelle} :</dt>
            {l.liste ? (
              <dd className="font-medium">
                <ul className="space-y-0.5">
                  {l.liste.map((ligne, i) => <li key={i} className="break-all">{ligne}</li>)}
                </ul>
              </dd>
            ) : (
              <dd className="font-medium break-all">{l.texte}</dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

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
      pourFirme(supabase.from('audit_logs').select('*')).order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('id, name'),
    ]);
    if (e1 || e2) setError((e1 || e2).message);
    setLogs(journal || []);
    setNoms(Object.fromEntries((profils || []).map((p) => [p.id, p.name])));
    setLoading(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mr-auto">
          <ClipboardList size={20} className="text-blue-600" />
          <h2 className="text-lg sm:text-xl font-semibold">Journal d'audit</h2>
        </div>
        <button onClick={charger} disabled={loading}
          className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Chargement...' : 'Rafraîchir'}
        </button>
      </div>

      {error && <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {logs.length === 0 ? (
        <p className="text-center text-slate-500 py-12">Aucune entrée dans le journal</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {logs.map((log) => (
            <li key={log.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-semibold text-[15px]">{LIBELLES[log.action] || log.action}</p>
                <time className="text-sm text-slate-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Par <span className="font-medium text-slate-800">{noms[log.user_id] || 'Utilisateur inconnu'}</span>
              </p>
              {(log.before_value || log.after_value) && (
                <div className="flex flex-wrap gap-x-8 gap-y-3 mt-3 bg-slate-50 rounded-lg p-3">
                  <Detail titre="Avant" valeur={log.before_value} />
                  <Detail titre="Après" valeur={log.after_value} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
