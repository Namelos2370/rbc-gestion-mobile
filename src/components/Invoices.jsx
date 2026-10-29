import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { pourFirme } from '../services/firme';
import { Plus, Trash2, Pencil, Check, Download, Printer, Search, RotateCcw } from 'lucide-react';
import EditInvoiceModal from './EditInvoiceModal';
import LignesFacture, { LIGNE_VIDE } from './LignesFacture';
import FactureImprimable from './FactureImprimable';
import { creerFacture, validerFacture, supprimerFacture, chargerLignes, chargerFactures } from '../services/invoices';
import { chargerEntreprise } from '../services/company';
import { STATUS_LABEL, formatMontant, formatDate, numeroFacture, exporterCsv } from '../utils/format';
import { ouvrirFenetreImpression, imprimerDansFenetre } from '../utils/imprimer';
import TicketCaisse from './TicketCaisse';

const champ =
  'min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const bouton =
  'min-h-[44px] md:min-h-[36px] px-3 rounded-md text-sm flex items-center justify-center gap-1.5';

export default function Invoices({ user, onChange }) {
  const [invoices, setInvoices] = useState([]);
  const [noms, setNoms] = useState({});
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [choixImpression, setChoixImpression] = useState(null);
  const [client, setClient] = useState('client');
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }]);
  const [filtres, setFiltres] = useState({ recherche: '', statut: 'tous', du: '', au: '' });
  const estAdmin = ['admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    try {
      setInvoices(await chargerFactures());
    } catch (err) {
      return setError(err.message);
    }
    const { data: profils } = await supabase.from('profiles').select('id, name');
    setNoms(Object.fromEntries((profils || []).map((p) => [p.id, p.name])));
  };

  const rafraichir = async () => {
    await charger();
    onChange?.();
  };

  // Impression : la fenêtre s'ouvre au clic, puis on y écrit le document une fois les données chargées.
  // mode : 'facture' | 'signature' (facture avec signature du client) | 'ticket' (ticket de caisse)
  const imprimer = async (facture, mode = 'facture') => {
    setError('');
    const fenetre = ouvrirFenetreImpression();
    if (!fenetre) {
      setError('Autorisez les fenêtres pop-up pour imprimer.');
      return;
    }
    try {
      const [lignesFacture, entreprise] = await Promise.all([chargerLignes(facture.id), chargerEntreprise()]);
      const document = mode === 'ticket'
        ? <TicketCaisse facture={facture} lignes={lignesFacture} entreprise={entreprise} />
        : <FactureImprimable facture={facture} lignes={lignesFacture} entreprise={entreprise} avecSignatureClient={mode === 'signature'} />;
      imprimerDansFenetre(fenetre, document, numeroFacture(facture), { format: mode === 'ticket' ? 'ticket' : 'A4' });
    } catch (err) {
      fenetre.close();
      setError(err.message);
    }
  };

  const filtrees = useMemo(() => {
    const q = filtres.recherche.trim().toLowerCase();
    return invoices.filter((f) => {
      if (filtres.statut !== 'tous' && f.status !== filtres.statut) return false;
      if (filtres.du && new Date(f.created_at) < new Date(filtres.du)) return false;
      if (filtres.au && new Date(f.created_at) > new Date(filtres.au + 'T23:59:59')) return false;
      if (q) {
        const texte = `${numeroFacture(f)} ${f.client} ${f.service}`.toLowerCase();
        if (!texte.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filtres]);

  const total = filtrees.reduce((s, f) => s + Number(f.amount), 0);

  // Récapitulatif par employé : qui a fait combien (factures filtrées)
  const recapParEmploye = useMemo(() => {
    const cumul = new Map();
    for (const f of filtrees) {
      const cle = f.employee_id || 'inconnu';
      const ligne = cumul.get(cle) || { id: cle, nombre: 0, montant: 0 };
      ligne.nombre += 1;
      ligne.montant += Number(f.amount);
      cumul.set(cle, ligne);
    }
    return [...cumul.values()].sort((a, b) => b.montant - a.montant);
  }, [filtrees]);
  const filtreActif = filtres.recherche || filtres.statut !== 'tous' || filtres.du || filtres.au;

  const action = async (fn) => {
    setError('');
    try {
      await fn();
      await rafraichir();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await creerFacture(user, { client, lignes });
      setClient('client');
      setLignes([{ ...LIGNE_VIDE }]);
      setShowForm(false);
      await rafraichir();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const exporterExcel = () => {
    const lignesExport = [
      ['N°', 'Date', 'Client', 'Service', 'Montant (F)', 'Statut'],
      ...filtrees.map((f) => [
        numeroFacture(f),
        formatDate(f.created_at),
        f.client,
        f.service,
        Math.round(Number(f.amount)),
        STATUS_LABEL[f.status] || f.status,
      ]),
    ];
    exporterCsv(`factures-RBC-${new Date().toISOString().slice(0, 10)}.csv`, lignesExport);
  };

  // Boutons d'action d'une facture, partagés entre la vue tableau et la vue cartes
  const actionsFacture = (f) => (
    <>
      {estAdmin && f.status === 'en_attente' && (
        <button onClick={() => action(() => validerFacture(user, f))}
          className={`${bouton} bg-blue-600 hover:bg-blue-700 text-white`}>
          <Check size={14} /> Valider
        </button>
      )}
      {(estAdmin || f.status === 'en_attente') && (
        <button onClick={() => setEditing(f)} className={`${bouton} border border-slate-300 bg-white`}>
          <Pencil size={14} /> Modifier
        </button>
      )}
      <button onClick={() => setChoixImpression(f)} className={`${bouton} border border-slate-300 bg-white`}>
        <Printer size={14} /> Imprimer
      </button>
      {user?.role === 'super_admin' && (
        <button onClick={() => {
            if (confirm('Supprimer cette facture ?')) action(() => supprimerFacture(user, f));
          }}
          aria-label={`Supprimer ${numeroFacture(f)}`}
          className={`${bouton} text-red-600 hover:bg-red-50`}>
          <Trash2 size={16} />
        </button>
      )}
    </>
  );

  const badgeStatut = (f) => (
    <span className={`px-2.5 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap ${
      f.paid_at ? 'bg-blue-100 text-blue-800' : f.status === 'validee' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
    }`}>
      {f.paid_at ? 'Encaissée' : STATUS_LABEL[f.status] || f.status}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-semibold sm:mr-auto">Liste des factures</h2>
          <div className="no-print grid grid-cols-2 sm:flex gap-2">
            {estAdmin && (
              <button onClick={exporterExcel}
                className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white flex items-center justify-center gap-2 text-[15px]">
                <Download size={16} /> Excel
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)}
              className="min-h-[44px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 text-[15px]">
              <Plus size={16} /> Nouvelle facture
            </button>
          </div>
        </div>

        <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_170px_150px_150px_auto] gap-3 p-4 sm:p-5 border-b border-slate-200 bg-slate-50 items-end">
          <label className="relative block">
            <span className="block text-sm text-slate-600 mb-1">Recherche</span>
            <Search size={16} className="absolute left-3 bottom-[14px] text-slate-400" />
            <input value={filtres.recherche} placeholder="Client, service ou numéro"
              onChange={(e) => setFiltres({ ...filtres, recherche: e.target.value })}
              className={`${champ} w-full pl-9`} />
          </label>
          <label className="block">
            <span className="block text-sm text-slate-600 mb-1">Statut</span>
            <select value={filtres.statut} onChange={(e) => setFiltres({ ...filtres, statut: e.target.value })}
              className={`${champ} w-full`}>
              <option value="tous">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-slate-600 mb-1">Du</span>
            <input type="date" value={filtres.du} onChange={(e) => setFiltres({ ...filtres, du: e.target.value })}
              className={`${champ} w-full`} />
          </label>
          <label className="block">
            <span className="block text-sm text-slate-600 mb-1">Au</span>
            <input type="date" value={filtres.au} onChange={(e) => setFiltres({ ...filtres, au: e.target.value })}
              className={`${champ} w-full`} />
          </label>
          {filtreActif && (
            <button onClick={() => setFiltres({ recherche: '', statut: 'tous', du: '', au: '' })}
              className="min-h-[44px] px-3 text-blue-700 font-semibold flex items-center justify-center gap-1.5">
              <RotateCcw size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="no-print p-4 sm:p-5 border-b border-slate-200 bg-blue-50/40 space-y-5">
            <div>
              <h3 className="font-semibold">Nouvelle facture</h3>
              <p className="text-sm text-slate-600 mt-1">
                Le numéro, la date, la ville et les coordonnées de l'entreprise sont automatiques.
              </p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Nom du client
              <input className={`${champ} mt-1`} value={client} required
                onChange={(e) => setClient(e.target.value)} />
            </label>
            <LignesFacture lignes={lignes} onChange={setLignes} />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="min-h-[44px] px-5 rounded-lg bg-slate-400 hover:bg-slate-500 text-white">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="min-h-[44px] px-5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold">
                {saving ? 'Création...' : 'Créer la facture'}
              </button>
            </div>
          </form>
        )}

        {error && <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

        {estAdmin && recapParEmploye.length > 0 && (
          <div className="no-print p-4 sm:p-5 border-b border-slate-200">
            <h3 className="font-semibold mb-3">Récapitulatif par employé</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[15px] border-collapse">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-4 font-semibold">Employé</th>
                    <th className="py-2 pr-4 font-semibold text-right">Factures</th>
                    <th className="py-2 font-semibold text-right">Montant total</th>
                  </tr>
                </thead>
                <tbody>
                  {recapParEmploye.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200">
                      <td className="py-2.5 pr-4">{r.id === 'inconnu' ? 'Inconnu' : noms[r.id] || 'Inconnu'}</td>
                      <td className="py-2.5 pr-4 text-right">{r.nombre}</td>
                      <td className="py-2.5 text-right whitespace-nowrap font-semibold">{formatMontant(r.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vue cartes : téléphones */}
        <div className="md:hidden">
          {filtrees.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Aucune facture ne correspond aux filtres</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {filtrees.map((f) => (
                <li key={f.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px]">{numeroFacture(f)}</p>
                      <p className="truncate">{f.client}</p>
                      {f.service && <p className="text-sm text-slate-500 truncate">{f.service}</p>}
                      {estAdmin && <p className="text-sm text-slate-500 truncate">Par {noms[f.employee_id] || 'Inconnu'}</p>}
                    </div>
                    {badgeStatut(f)}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{formatDate(f.created_at)}</p>
                    <p className="font-bold text-lg whitespace-nowrap">{formatMontant(f.amount)}</p>
                  </div>
                  <div className="no-print grid grid-cols-2 gap-2">
                    {actionsFacture(f)}
                  </div>
                </li>
              ))}
              <li className="p-4 bg-slate-50 flex justify-between font-semibold">
                <span>Total ({filtrees.length} facture{filtrees.length > 1 ? 's' : ''})</span>
                <span className="whitespace-nowrap">{formatMontant(total)}</span>
              </li>
            </ul>
          )}
        </div>

        {/* Vue tableau : tablettes et ordinateurs */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[15px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-left">
                <th className="px-4 lg:px-5 py-3 font-semibold">N°</th>
                <th className="px-4 lg:px-5 py-3 font-semibold">Client</th>
                {estAdmin && <th className="px-4 lg:px-5 py-3 font-semibold">Employé</th>}
                <th className="px-4 lg:px-5 py-3 font-semibold">Service</th>
                <th className="px-4 lg:px-5 py-3 font-semibold text-right">Montant</th>
                <th className="px-4 lg:px-5 py-3 font-semibold">Statut</th>
                <th className="px-4 lg:px-5 py-3 font-semibold no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtrees.length === 0 ? (
                <tr><td colSpan={estAdmin ? 7 : 6} className="text-center text-slate-500 py-10">Aucune facture ne correspond aux filtres</td></tr>
              ) : (
                filtrees.map((f) => (
                  <tr key={f.id} className="border-t border-slate-200 hover:bg-slate-50/60">
                    <td className="px-4 lg:px-5 py-3.5 whitespace-nowrap">{numeroFacture(f)}</td>
                    <td className="px-4 lg:px-5 py-3.5">{f.client}</td>
                    {estAdmin && <td className="px-4 lg:px-5 py-3.5">{noms[f.employee_id] || 'Inconnu'}</td>}
                    <td className="px-4 lg:px-5 py-3.5">{f.service}</td>
                    <td className="px-4 lg:px-5 py-3.5 text-right whitespace-nowrap font-medium">{formatMontant(f.amount)}</td>
                    <td className="px-4 lg:px-5 py-3.5">{badgeStatut(f)}</td>
                    <td className="px-4 lg:px-5 py-3.5 no-print">
                      <div className="flex gap-2 flex-wrap">{actionsFacture(f)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtrees.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td colSpan={estAdmin ? 4 : 3} className="px-4 lg:px-5 py-3">Total ({filtrees.length} facture{filtrees.length > 1 ? 's' : ''})</td>
                  <td className="px-4 lg:px-5 py-3 text-right whitespace-nowrap">{formatMontant(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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


      {choixImpression && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={() => setChoixImpression(null)}>
          <div role="dialog" aria-modal="true" aria-label="Choisir l'impression"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-lg">Imprimer {numeroFacture(choixImpression)}</h3>
            {[
              { mode: 'facture', titre: 'Facture', aide: 'Avec la signature de la direction' },
              { mode: 'signature', titre: 'Facture à signer', aide: 'Avec la signature du client, si le client l\'exige' },
              { mode: 'ticket', titre: 'Ticket de caisse', aide: 'Format court, sans signature' },
            ].map((o) => (
              <button key={o.mode} type="button"
                onClick={() => {
                  const f = choixImpression;
                  setChoixImpression(null);
                  imprimer(f, o.mode);
                }}
                className="w-full min-h-[56px] text-left px-4 rounded-lg border border-slate-300 hover:bg-slate-50">
                <span className="block font-semibold">{o.titre}</span>
                <span className="block text-sm text-slate-500">{o.aide}</span>
              </button>
            ))}
            <button type="button" onClick={() => setChoixImpression(null)}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
