import { useState, useEffect } from 'react';
import { chargerEntreprise, enregistrerEntreprise, CHAMPS_ENTREPRISE } from '../services/company';
import ModifierCompte from './ModifierCompte';

const champ =
  'mt-1.5 min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500';

// Champs longs : prennent toute la largeur du formulaire
const CHAMPS_LARGES = ['company_address', 'company_footer'];

const LIBELLES_ROLE = { super_admin: 'Super administrateur', admin: 'Administrateur', employe: 'Employé', employee: 'Employé', caissier: 'Caissier' };

export default function Profile({ user, firmeNom = '' }) {
  const estSuperAdmin = user?.role === 'super_admin';
  const [valeurs, setValeurs] = useState({});
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    chargerEntreprise()
      .then(setValeurs)
      .catch((err) => setErreur(err.message));
  }, []);

  const enregistrer = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setErreur('');
    try {
      await enregistrerEntreprise(user, valeurs);
      setMessage('Coordonnées enregistrées. Elles apparaîtront sur les prochaines factures imprimées.');
    } catch (err) {
      setErreur(err.message);
    }
    setSaving(false);
  };

  const initiale = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Carte identité de l'utilisateur */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
          {initiale}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold truncate">{user?.name || user?.email}</p>
          <p className="text-sm text-slate-500 truncate">{user?.email}</p>
          <span className="inline-block mt-2 bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            {LIBELLES_ROLE[user?.role] || user?.role}
          </span>
        </div>
      </section>

      {/* Nom et mot de passe du compte connecté */}
      <ModifierCompte user={user} />

      {/* Coordonnées de l'entreprise */}
      <form onSubmit={enregistrer} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Coordonnées de {firmeNom || "l'entreprise"}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Reprises automatiquement sur toutes les factures : vous n'avez pas à les ressaisir.
            {!estSuperAdmin && ' Seul un super administrateur peut les modifier.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
          {CHAMPS_ENTREPRISE.map((c) => (
            <label key={c.key}
              className={`block text-sm font-semibold text-slate-700 ${CHAMPS_LARGES.includes(c.key) ? 'sm:col-span-2' : ''}`}>
              {c.label}
              <input
                className={champ}
                value={valeurs[c.key] ?? ''}
                disabled={!estSuperAdmin}
                onChange={(e) => setValeurs({ ...valeurs, [c.key]: e.target.value })}
              />
            </label>
          ))}
        </div>

        {erreur && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erreur}</p>}
        {message && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{message}</p>}

        {estSuperAdmin && (
          <div className="flex justify-end pt-2 border-t border-slate-200">
            <button type="submit" disabled={saving}
              className="min-h-[44px] px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold">
              {saving ? 'Enregistrement...' : 'Enregistrer les coordonnées'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
