import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import logoRbc from '../assets/logo-rbc.jpeg';

export default function Login() {
  const [email, setEmail] = useState('super@rbc.local');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const champ =
    'mt-1 min-h-[48px] w-full border border-slate-300 rounded-lg px-3.5 text-base outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 sm:p-10">
        <div className="flex flex-col items-center gap-3 mb-7">
          <img src={logoRbc} alt="Logo RBC Business Center" className="w-28 h-28 object-contain" />
          <h1 className="text-2xl font-bold">RBC Gestion</h1>
          <p className="text-slate-500 text-[15px]">Connectez-vous à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-semibold text-slate-700">
            Adresse e-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@rbc.local" required className={champ} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required className={champ} />
          </label>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="min-h-[48px] mt-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold text-base">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate-500">Accès réservé au personnel autorisé</p>
      </div>
    </div>
  );
}
