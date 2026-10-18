import { useState, useEffect } from 'react';
import { Plus, Printer, Trash2, FileText } from 'lucide-react';
import LignesFacture, { LIGNE_VIDE, totalLignes } from './LignesFacture';
import FactureImprimable from './FactureImprimable';
import { chargerEntreprise } from '../services/company';
import { chargerProformas, chargerLignesProforma, creerProforma, supprimerProforma } from '../services/proformas';
import { formatMontant, formatDate } from '../utils/format';

const champ =
  'mt-1.5 min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';

// Proformas : documents préliminaires créés par le super admin, imprimés en PDF et signés pour le client
export default function Proformas({ user }) {
  const [proformas, setProformas] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState('');
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }]);
  const [aImprimer, setAImprimer] = useState(null);

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    try {
      setProformas(await chargerProformas());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await creerProforma(user, { client, lignes });
      setClient('');
      setLignes([{ ...LIGNE_VIDE }]);
      setShowForm(false);
      await charger();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const supprimer = async (p) => {
    if (!confirm(`Supprimer la proforma ${p.proforma_number} ?`)) return;
    setError('');
    try {
      await supprimerProforma(user, p);
      await charger();
    } catch (err) {
      setError(err.message);
    }
  };

  // Impression / PDF : on charge les lignes et les coordonnées, puis on affiche le modèle
  const imprimer = async (p) => {
    setError('');
    try {
      const [items, entreprise] = await Promise.all([chargerLignesProforma(p.id), chargerEntreprise()]);
      setAImprimer({ proforma: p, lignes: items, entreprise });
    } catch (err) {
      setError(err.message);
    }
  };

  // Même logique que les factures : impression une fois le modèle affiché, retiré à la fin de l'aperçu
  useEffect(() => {
    if (!aImprimer) return;
    const fin = () => setAImprimer(null);
    window.addEventListener('afterprint', fin);
    const t = setTimeout(() => window.print(), 300);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [aImprimer]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-2 sm:mr-auto">
            <FileText size={20} className="text-blue-600" />
            <h2 className="text-lg sm:text-xl font-semibold">Proformas</h2>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 text-[15px]">
            <Plus size={16} /> Nouvelle proforma
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-b border-slate-200 bg-blue-50/40 space-y-5">
            <div>
              <h3 className="font-semibold">Nouvelle proforma</h3>
              <p className="text-sm text-slate-600 mt-1">
                Le numéro et les coordonnées de l'entreprise sont automatiques. Une fois imprimée, faites-la signer par le client.
              </p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Nom du client
              <input className={champ} value={client} required onChange={(e) => setClient(e.target.value)} />
            </label>
            <LignesFacture lignes={lignes} onChange={setLignes} />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="min-h-[44px] px-5 rounded-lg bg-slate-400 hover:bg-slate-500 text-white">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="min-h-[44px] px-5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold">
                {saving ? 'Création...' : `Créer la proforma (${formatMontant(totalLignes(lignes))})`}
              </button>
            </div>
          </form>
        )}

        {error && <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {proformas.length === 0 ? (
          <p className="text-center text-slate-500 py-12">Aucune proforma pour le moment</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {proformas.map((p) => (
              <li key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{p.proforma_number} · {p.client}</p>
                  <p className="text-sm text-slate-500">{formatDate(p.created_at)} · {formatMontant(p.amount)}</p>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <button onClick={() => imprimer(p)}
                    className="min-h-[44px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                    <Printer size={16} /> Imprimer / PDF
                  </button>
                  <button onClick={() => supprimer(p)} aria-label={`Supprimer ${p.proforma_number}`}
                    className="min-h-[44px] px-4 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 flex items-center justify-center">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aImprimer && (
        <div id="zone-facture" className="zone-impression">
          <FactureImprimable
            facture={{ id: aImprimer.proforma.id, invoice_number: aImprimer.proforma.proforma_number, client: aImprimer.proforma.client, created_at: aImprimer.proforma.created_at }}
            lignes={aImprimer.lignes}
            entreprise={aImprimer.entreprise}
            titre="PROFORMA"
            avecSignatureClient
          />
        </div>
      )}
    </div>
  );
}
