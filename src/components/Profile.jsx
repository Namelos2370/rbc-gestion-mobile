import { useState, useEffect } from 'react';
import { chargerEntreprise, enregistrerEntreprise, CHAMPS_ENTREPRISE } from '../services/company';

const champ =
  'mt-1 min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100';

export default function Profile({ user }) {
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

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3">Mon profil</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[15px]">
          <dt className="text-slate-500">Nom</dt>
          <dd className="sm:col-span-2 font-semibold">{user?.name || '-'}</dd>
          <dt className="text-slate-500">Email</dt>
          <dd className="sm:col-span-2">{user?.email}</dd>
          <dt className="text-slate-500">Rôle</dt>
          <dd className="sm:col-span-2 capitalize">{user?.role}</dd>
        </dl>
      </div>

      <form onSubmit={enregistrer} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Coordonnées de l'entreprise</h2>
          <p className="text-sm text-slate-500">
            Ces informations sont reprises automatiquement sur toutes les factures : vous n'avez pas à les ressaisir.
            {!estSuperAdmin && ' Seul un super administrateur peut les modifier.'}
          </p>
        </div>

        {CHAMPS_ENTREPRISE.map((c) => (
          <label key={c.key} className="block text-sm font-semibold text-slate-700">
            {c.label}
            <input
              className={champ}
              value={valeurs[c.key] ?? ''}
              disabled={!estSuperAdmin}
              onChange={(e) => setValeurs({ ...valeurs, [c.key]: e.target.value })}
            />
          </label>
        ))}

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        {estSuperAdmin && (
          <button type="submit" disabled={saving}
            className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </form>
    </div>
  );
}
