import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '../config/supabase';
import {
  aujourdhui, estDuJour, chargerDepenses,
  ajouterDepense, modifierDepense, supprimerDepense,
  depensesEnAttente, synchroniserDepenses,
} from '../services/depenses';
import { formatMontant, formatDate } from '../utils/format';

const champ =
  'min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const VIDE = { date_depense: '', libelle: '', montant: '', note: '' };

// Dépenses : le caissier saisit les siennes ; le super administrateur consulte et gère tout.
export default function Depenses({ user }) {
  const estAdmin = ['admin', 'super_admin'].includes(user?.role);
  // Saisie réservée au caissier ; le super admin consulte et peut tout modifier
  const peutSaisir = user?.role === 'caissier';
  const [depenses, setDepenses] = useState([]);
  const [noms, setNoms] = useState({});
  const [saisie, setSaisie] = useState({ ...VIDE, date_depense: aujourdhui() });
  const [enModification, setEnModification] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const [attente, setAttente] = useState([]);

  const rafraichir = async () => {
    setAttente(depensesEnAttente(user?.id));
    try {
      setDepenses(await chargerDepenses());
    } catch (err) {
      setErreur(err.message);
    }
  };

  // Envoie les dépenses gardées sur l'appareil, puis recharge la liste
  const synchroniser = async () => {
    const { envoyees, erreur: erreurSynchro } = await synchroniserDepenses(user);
    if (erreurSynchro) setErreur(erreurSynchro);
    if (envoyees > 0) setMessage(`${envoyees} dépense(s) hors ligne envoyée(s).`);
    await rafraichir();
  };

  useEffect(() => {
    synchroniser();
    if (estAdmin) {
      supabase.from('profiles').select('id, name').then(({ data }) => {
        const table = {};
        (data || []).forEach((p) => { table[p.id] = p.name; });
        setNoms(table);
      });
    }
    window.addEventListener('online', synchroniser);
    return () => window.removeEventListener('online', synchroniser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const peutModifier = (d) => user?.role === 'super_admin' || (peutSaisir && d.created_by === user?.id && estDuJour(d));

  const totaux = useMemo(() => {
    const jour = aujourdhui();
    const mois = jour.slice(0, 7);
    let totalJour = 0;
    let totalMois = 0;
    [...attente, ...depenses].forEach((d) => {
      d = d.donnees ? { date_depense: d.donnees.date_depense, montant: d.donnees.montant } : d;
      if (d.date_depense === jour) totalJour += Number(d.montant);
      if (d.date_depense.startsWith(mois)) totalMois += Number(d.montant);
    });
    return { totalJour, totalMois };
  }, [depenses]);

  const annuler = () => {
    setEnModification(null);
    setSaisie({ ...VIDE, date_depense: aujourdhui() });
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setChargement(true);
    setErreur('');
    setMessage('');
    try {
      if (enModification) {
        await modifierDepense(user, enModification, saisie);
        setMessage('Dépense modifiée.');
      } else {
        const { enAttente } = await ajouterDepense(user, saisie);
        setMessage(enAttente
          ? 'Pas de connexion : dépense gardée sur cet appareil, elle sera envoyée dès que le réseau reviendra.'
          : 'Dépense enregistrée.');
      }
      annuler();
      await rafraichir();
    } catch (err) {
      setErreur(err.message);
    }
    setChargement(false);
  };

  const commencerModification = (d) => {
    setEnModification(d);
    setSaisie({
      date_depense: d.date_depense,
      libelle: d.libelle,
      montant: String(d.montant),
      note: d.note || '',
    });
    setMessage('');
    setErreur('');
  };

  const supprimer = async (d) => {
    if (!window.confirm(`Supprimer la dépense « ${d.libelle} » (${formatMontant(d.montant)}) ?`)) return;
    setErreur('');
    try {
      await supprimerDepense(user, d);
      setMessage('Dépense supprimée.');
      await rafraichir();
    } catch (err) {
      setErreur(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">Dépenses d'aujourd'hui</p>
          <p className="text-2xl font-bold mt-1">{formatMontant(totaux.totalJour)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">Dépenses du mois</p>
          <p className="text-2xl font-bold mt-1">{formatMontant(totaux.totalMois)}</p>
        </div>
      </div>

      {peutSaisir && (
        <form onSubmit={enregistrer} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{enModification ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
            {enModification && (
              <button type="button" onClick={annuler} className="text-sm text-slate-500 flex items-center gap-1 min-h-[44px] px-2">
                <X size={16} /> Annuler
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Date
              <input type="date" required value={saisie.date_depense} max={aujourdhui()}
                onChange={(e) => setSaisie({ ...saisie, date_depense: e.target.value })} className={`mt-1 ${champ}`} />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Motif de la dépense (obligatoire)
              <input type="text" required value={saisie.libelle} placeholder="Ex. Carburant livraison"
                onChange={(e) => setSaisie({ ...saisie, libelle: e.target.value })} className={`mt-1 ${champ}`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Montant (FCFA)
              <input type="text" inputMode="decimal" required value={saisie.montant} placeholder="0"
                onChange={(e) => setSaisie({ ...saisie, montant: e.target.value })} className={`mt-1 ${champ}`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Note (facultatif)
              <input type="text" value={saisie.note}
                onChange={(e) => setSaisie({ ...saisie, note: e.target.value })} className={`mt-1 ${champ}`} />
            </label>
          </div>
          <button type="submit" disabled={chargement}
            className="min-h-[48px] rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold">
            {chargement ? 'Enregistrement...' : enModification ? 'Enregistrer les modifications' : 'Ajouter la dépense'}
          </button>
        </form>
      )}

      {erreur && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{erreur}</p>}
      {message && <p className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">{message}</p>}
      {attente.length > 0 && (
        <p className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          {attente.length} dépense(s) gardée(s) sur cet appareil, en attente d'envoi.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 font-bold">Liste des dépenses</div>
        {depenses.length === 0 && attente.length === 0 ? (
          <p className="px-5 py-6 text-slate-500 text-center">Aucune dépense enregistrée.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attente.map((a) => (
              <li key={a.client_ref} className="px-5 py-3 flex items-center justify-between gap-3 bg-amber-50/50">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{a.donnees.libelle}</p>
                  <p className="text-sm text-amber-700">{formatDate(a.donnees.date_depense)} · En attente d'envoi</p>
                </div>
                <span className="font-semibold whitespace-nowrap">{formatMontant(a.donnees.montant)}</span>
              </li>
            ))}
            {depenses.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{d.libelle}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(d.date_depense)}
                    {estAdmin && ` · ${noms[d.created_by] || 'Inconnu'}`}
                    {d.note && ` · ${d.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold whitespace-nowrap">{formatMontant(d.montant)}</span>
                  {peutModifier(d) && (
                    <>
                      <button type="button" onClick={() => commencerModification(d)} aria-label="Modifier"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-slate-100">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => supprimer(d)} aria-label="Supprimer"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-red-50 text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
