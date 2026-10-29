import { useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { listerImprimantes, imprimanteChoisie, enregistrerImprimante } from '../services/impression';

const champ =
  'min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';

// Choix de l'imprimante de cet ordinateur pour l'impression directe (sans boîte de dialogue)
export default function ImprimanteQz() {
  const [imprimantes, setImprimantes] = useState([]);
  const [choisie, setChoisie] = useState(imprimanteChoisie());
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');

  const detecter = async () => {
    setChargement(true);
    setErreur('');
    setMessage('');
    try {
      const liste = await listerImprimantes();
      setImprimantes(liste);
      setMessage(`${liste.length} imprimante(s) détectée(s).`);
    } catch {
      setErreur("QZ Tray n'est pas lancé sur cet ordinateur. Installez-le (qz.io/download), lancez-le, puis cliquez à nouveau sur Détecter.");
    }
    setChargement(false);
  };

  const choisir = (nom) => {
    setChoisie(nom);
    enregistrerImprimante(nom);
    setMessage(nom ? `Impression directe sur « ${nom} » activée pour cet ordinateur.` : 'Impression par la boîte du navigateur.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Printer size={20} className="text-blue-600" />
        <h2 className="text-lg font-bold">Imprimante de cet ordinateur</h2>
      </div>
      <p className="text-sm text-slate-600">
        Avec QZ Tray installé, les factures et tickets s'impriment directement sur l'imprimante choisie, sans boîte de dialogue.
        Ce réglage ne concerne que cet ordinateur.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={detecter} disabled={chargement}
          className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold flex items-center justify-center gap-2">
          <RefreshCw size={16} /> {chargement ? 'Détection...' : 'Détecter les imprimantes'}
        </button>
      </div>

      <label className="block text-sm font-semibold text-slate-700">
        Imprimante
        <select value={choisie} onChange={(e) => choisir(e.target.value)} className={`mt-1.5 ${champ}`}>
          <option value="">Boîte d'impression du navigateur</option>
          {choisie && !imprimantes.includes(choisie) && <option value={choisie}>{choisie}</option>}
          {imprimantes.map((nom) => (
            <option key={nom} value={nom}>{nom}</option>
          ))}
        </select>
      </label>

      {erreur && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{erreur}</p>}
      {message && <p className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">{message}</p>}
    </div>
  );
}
