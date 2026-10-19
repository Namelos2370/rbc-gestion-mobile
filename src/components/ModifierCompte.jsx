import { useState } from 'react';
import { Eye, EyeOff, KeyRound, UserRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabase';

const champ =
  'mt-1.5 min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const bouton =
  'min-h-[44px] px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold transition';

// Champ mot de passe avec bouton pour afficher / masquer la saisie
function ChampMotDePasse({ id, label, valeur, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} value={valeur} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} className={`${champ} pr-12`} />
        <button type="button" onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-1 top-1/2 -translate-y-1/2 mt-0.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

// Message de retour (succès ou erreur) sous un formulaire
function Retour({ succes, erreur }) {
  if (erreur) {
    return (
      <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        <AlertCircle size={18} className="shrink-0 mt-0.5" /> {erreur}
      </p>
    );
  }
  if (succes) {
    return (
      <p className="flex items-start gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> {succes}
      </p>
    );
  }
  return null;
}

// Carte « Sécurité du compte » : changer son nom affiché et son mot de passe
export default function ModifierCompte({ user }) {
  const [nom, setNom] = useState(user?.name || '');
  const [busyNom, setBusyNom] = useState(false);
  const [succesNom, setSuccesNom] = useState('');
  const [erreurNom, setErreurNom] = useState('');

  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busyMdp, setBusyMdp] = useState(false);
  const [succesMdp, setSuccesMdp] = useState('');
  const [erreurMdp, setErreurMdp] = useState('');

  const enregistrerNom = async (e) => {
    e.preventDefault();
    const propre = nom.trim();
    setSuccesNom('');
    setErreurNom('');
    if (!propre) return setErreurNom('Le nom ne peut pas être vide.');
    setBusyNom(true);
    const { error } = await supabase.from('profiles').update({ name: propre }).eq('id', user.id);
    if (error) {
      setErreurNom(error.message);
    } else {
      // Recharge le profil dans l'application pour que le nouveau nom apparaisse tout de suite
      await supabase.auth.refreshSession().catch(() => {});
      setSuccesNom('Nom enregistré.');
    }
    setBusyNom(false);
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    setSuccesMdp('');
    setErreurMdp('');
    if (!actuel) return setErreurMdp('Saisissez votre mot de passe actuel.');
    if (nouveau.length < 8) return setErreurMdp('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (nouveau !== confirmation) return setErreurMdp('La confirmation ne correspond pas au nouveau mot de passe.');
    if (nouveau === actuel) return setErreurMdp('Le nouveau mot de passe doit être différent de l\'actuel.');

    setBusyMdp(true);
    // Vérifie le mot de passe actuel avant de le changer
    const { error: errActuel } = await supabase.auth.signInWithPassword({ email: user.email, password: actuel });
    if (errActuel) {
      setErreurMdp('Mot de passe actuel incorrect.');
      setBusyMdp(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nouveau });
    if (error) {
      setErreurMdp(error.message);
    } else {
      setActuel('');
      setNouveau('');
      setConfirmation('');
      setSuccesMdp('Mot de passe modifié. Il sera demandé à la prochaine connexion.');
    }
    setBusyMdp(false);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
          <KeyRound size={20} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Sécurité du compte</h2>
          <p className="text-sm text-slate-500">Votre nom affiché et votre mot de passe.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nom */}
        <form onSubmit={enregistrerNom} className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <UserRound size={18} className="text-blue-700" /> Mon nom
          </div>
          <div>
            <label htmlFor="nom-compte" className="block text-sm font-semibold text-slate-700">Nom affiché</label>
            <input id="nom-compte" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80}
              className={champ} />
          </div>
          <Retour succes={succesNom} erreur={erreurNom} />
          <div className="flex justify-end">
            <button type="submit" disabled={busyNom} className={bouton}>
              {busyNom ? 'Enregistrement...' : 'Enregistrer le nom'}
            </button>
          </div>
        </form>

        {/* Mot de passe */}
        <form onSubmit={changerMotDePasse} className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <KeyRound size={18} className="text-blue-700" /> Mot de passe
          </div>
          <ChampMotDePasse id="mdp-actuel" label="Mot de passe actuel" valeur={actuel} onChange={setActuel}
            autoComplete="current-password" />
          <ChampMotDePasse id="mdp-nouveau" label="Nouveau mot de passe (8 caractères minimum)" valeur={nouveau}
            onChange={setNouveau} autoComplete="new-password" />
          <ChampMotDePasse id="mdp-confirmation" label="Confirmer le nouveau mot de passe" valeur={confirmation}
            onChange={setConfirmation} autoComplete="new-password" />
          <Retour succes={succesMdp} erreur={erreurMdp} />
          <div className="flex justify-end">
            <button type="submit" disabled={busyMdp} className={bouton}>
              {busyMdp ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
