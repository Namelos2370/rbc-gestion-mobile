import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { chargerFirmes } from '../services/firme';
import logoRbc from '../assets/logo-rbc.jpeg';

// Écran d'entrée du super administrateur : il choisit la firme dans laquelle il travaille.
export default function ChoixFirme({ onChoisir, onDeconnexion }) {
  const [firmes, setFirmes] = useState([]);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    chargerFirmes()
      .then(setFirmes)
      .catch((err) => setErreur(err.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logoRbc} alt="Logo RBC Business Center" className="w-20 h-20 object-contain mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold">Choisissez une firme</h1>
          <p className="text-slate-500 mt-2">Vous entrez dans son espace : factures, validation, encaissement et coordonnées.</p>
        </div>

        {erreur && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erreur}</p>}

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {firmes.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => onChoisir(f.id)}
                className="w-full min-h-[120px] bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl p-6 text-left transition flex flex-col justify-between gap-4">
                <span className="text-xl font-bold">{f.name}</span>
                <span className="text-sm font-semibold text-blue-600">Entrer dans l'espace →</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center">
          <button type="button" onClick={onDeconnexion}
            className="min-h-[44px] px-4 rounded-lg text-slate-600 hover:bg-slate-100 inline-flex items-center gap-2">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
