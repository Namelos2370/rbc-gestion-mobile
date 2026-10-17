import { useState, useEffect } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { chercherFactureValidee, chargerFacturesCaisse, encaisserFacture } from '../services/invoices';
import { formatMontant, formatDate, numeroFacture } from '../utils/format';

const champ =
  'min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';

// Ligne d'une facture dans une liste : cliquable pour la sélectionner
function LigneFacture({ facture, onClick, detail }) {
  return (
    <li>
      <button type="button" onClick={onClick}
        className="w-full text-left min-h-[44px] px-3 py-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block font-semibold">{numeroFacture(facture)} · {facture.client}</span>
          <span className="block text-sm text-slate-500">{detail}</span>
        </span>
        <span className="font-semibold whitespace-nowrap">{formatMontant(facture.amount)}</span>
      </button>
    </li>
  );
}

// Espace du caissier : chercher une facture, voir celles à encaisser, confirmer, et consulter l'historique.
export default function Caisse({ user }) {
  const [saisie, setSaisie] = useState('');
  const [facture, setFacture] = useState(null);
  const [factures, setFactures] = useState([]);
  const [confirmation, setConfirmation] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const rafraichirListe = async () => {
    try {
      setFactures(await chargerFacturesCaisse());
    } catch (err) {
      setErreur(err.message);
    }
  };

  useEffect(() => {
    rafraichirListe();
  }, []);

  const aEncaisser = factures.filter((f) => !f.paid_at);
  const historique = factures
    .filter((f) => f.paid_at)
    .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));

  const choisir = (f) => {
    setFacture(f);
    setConfirmation(false);
    setErreur('');
    setMessage('');
  };

  const rechercher = async (e) => {
    e.preventDefault();
    setErreur('');
    setMessage('');
    setConfirmation(false);
    setChargement(true);
    try {
      setFacture(await chercherFactureValidee(saisie));
    } catch (err) {
      setFacture(null);
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  const encaisser = async () => {
    setErreur('');
    setChargement(true);
    try {
      const mise = await encaisserFacture(user, facture);
      setFacture(mise);
      setConfirmation(false);
      setMessage(`Encaissement confirmé pour ${numeroFacture(mise)}.`);
      await rafraichirListe();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Encaissement</h2>
          <p className="text-sm text-slate-500">Choisissez une facture dans la liste, ou saisissez son numéro.</p>
        </div>

        <form onSubmit={rechercher} className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <span className="sr-only">Numéro de la facture</span>
            <input className={champ} placeholder="Numéro de la facture (ex. FAC-001)" value={saisie}
              onChange={(e) => setSaisie(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" disabled={chargement}
            className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold flex items-center justify-center gap-2">
            <Search size={16} /> {chargement ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        {message && (
          <p className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircle2 size={16} /> {message}
          </p>
        )}

        {facture && (
          <div className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-lg">{numeroFacture(facture)}</p>
              {facture.paid_at ? (
                <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-blue-100 text-blue-800">Encaissée</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold bg-green-100 text-green-800">Validée · à encaisser</span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[15px]">
              <div>
                <dt className="text-xs text-slate-500">Client</dt>
                <dd className="font-semibold break-words">{facture.client}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Montant</dt>
                <dd className="font-semibold">{formatMontant(facture.amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Validée le</dt>
                <dd>{formatDate(facture.validated_at)}</dd>
              </div>
              {facture.paid_at && (
                <div>
                  <dt className="text-xs text-slate-500">Encaissée le</dt>
                  <dd>{formatDate(facture.paid_at)}</dd>
                </div>
              )}
            </dl>

            {!facture.paid_at && !confirmation && (
              <button onClick={() => setConfirmation(true)}
                className="w-full sm:w-auto min-h-[44px] px-5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold">
                Confirmer l'encaissement
              </button>
            )}

            {!facture.paid_at && confirmation && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                <p className="text-sm font-semibold text-amber-900">
                  Confirmer que {formatMontant(facture.amount)} ont été encaissés pour {numeroFacture(facture)} ?
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <button onClick={() => setConfirmation(false)} disabled={chargement}
                    className="min-h-[44px] px-5 rounded-lg border border-slate-300 bg-white">
                    Annuler
                  </button>
                  <button onClick={encaisser} disabled={chargement}
                    className="min-h-[44px] px-5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold">
                    {chargement ? 'Enregistrement...' : 'Oui, encaissé'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
        <h3 className="font-semibold mb-2">À encaisser ({aEncaisser.length})</h3>
        {aEncaisser.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune facture en attente d'encaissement.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto -mx-2">
            {aEncaisser.map((f) => (
              <LigneFacture key={f.id} facture={f} onClick={() => choisir(f)}
                detail={`Validée le ${formatDate(f.validated_at)}`} />
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
        <h3 className="font-semibold mb-2">Historique des encaissements ({historique.length})</h3>
        {historique.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun encaissement pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto -mx-2">
            {historique.map((f) => (
              <LigneFacture key={f.id} facture={f} onClick={() => choisir(f)}
                detail={`Encaissée le ${formatDate(f.paid_at)}`} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
