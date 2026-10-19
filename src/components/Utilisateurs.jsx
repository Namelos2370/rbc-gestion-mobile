import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../config/supabase';
import { chargerFirmes } from '../services/firme';
import { Search, Pencil, KeyRound, X, Eye, EyeOff, CheckCircle2, AlertCircle, Users } from 'lucide-react';

const LIBELLES_ROLE = { super_admin: 'Super admin', admin: 'Admin', employe: 'Employé', caissier: 'Caissier' };
const COULEURS_ROLE = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  employe: 'bg-slate-100 text-slate-700',
  caissier: 'bg-green-100 text-green-800',
};

const champ =
  'mt-1.5 min-h-[44px] w-full border border-slate-300 rounded-lg px-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const bouton =
  'min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold transition';

// Fenêtre modale : sur téléphone elle remonte du bas de l'écran
function Dialogue({ titre, sousTitre, onFermer, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-semibold">{titre}</h3>
            <p className="text-sm text-slate-500">{sousTitre}</p>
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

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

function ModifierNom({ utilisateur, onFait, onFermer }) {
  const [nom, setNom] = useState(utilisateur.user_name || '');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const enregistrer = async (e) => {
    e.preventDefault();
    setErreur('');
    setBusy(true);
    const { error } = await supabase.rpc('sa_definir_nom', { cible: utilisateur.user_id, nouveau_nom: nom });
    setBusy(false);
    if (error) return setErreur(error.message);
    onFait('Nom enregistré.');
  };

  return (
    <Dialogue titre="Modifier le nom" sousTitre={utilisateur.user_email} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-5">
        <label className="block text-sm font-semibold text-slate-700">
          Nom affiché
          <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} autoFocus className={champ} />
        </label>
        <Retour erreur={erreur} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="min-h-[44px] px-5 rounded-lg border border-slate-300 hover:bg-slate-50">Annuler</button>
          <button type="submit" disabled={busy} className={bouton}>{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </form>
    </Dialogue>
  );
}

function ChampMdp({ label, valeur, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="relative">
        <input type={visible ? 'text' : 'password'} value={valeur} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} className={`${champ} pr-12`} />
        <button type="button" onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Masquer' : 'Afficher'}
          className="absolute right-1 top-1/2 -translate-y-1/2 mt-0.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function ReinitialiserMdp({ utilisateur, onFait, onFermer }) {
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const enregistrer = async (e) => {
    e.preventDefault();
    setErreur('');
    if (nouveau.length < 8) return setErreur('Le mot de passe doit contenir au moins 8 caractères.');
    if (nouveau !== confirmation) return setErreur('La confirmation ne correspond pas.');
    setBusy(true);
    const { error } = await supabase.rpc('sa_definir_mot_de_passe', { cible: utilisateur.user_id, nouveau });
    setBusy(false);
    if (error) return setErreur(error.message);
    onFait('Mot de passe modifié. L\'utilisateur devra utiliser le nouveau à sa prochaine connexion.');
  };

  return (
    <Dialogue titre="Nouveau mot de passe" sousTitre={utilisateur.user_email} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-5">
        <ChampMdp label="Nouveau mot de passe (8 caractères minimum)" valeur={nouveau} onChange={setNouveau} autoComplete="new-password" />
        <ChampMdp label="Confirmer" valeur={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        <Retour erreur={erreur} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="min-h-[44px] px-5 rounded-lg border border-slate-300 hover:bg-slate-50">Annuler</button>
          <button type="submit" disabled={busy} className={bouton}>{busy ? 'Modification...' : 'Changer le mot de passe'}</button>
        </div>
      </form>
    </Dialogue>
  );
}

// Écran du super administrateur : tous les comptes, par firme, avec modification du nom et du mot de passe
export default function Utilisateurs({ user }) {
  const [liste, setListe] = useState([]);
  const [firmes, setFirmes] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [action, setAction] = useState(null); // { type: 'nom' | 'mdp', utilisateur }

  const charger = async () => {
    setChargement(true);
    setErreur('');
    const [{ data, error }, firmesData] = await Promise.all([
      supabase.rpc('sa_liste_utilisateurs'),
      chargerFirmes().catch(() => []),
    ]);
    if (error) setErreur(error.message);
    setListe(data || []);
    setFirmes(firmesData);
    setChargement(false);
  };

  useEffect(() => {
    charger();
  }, []);

  const nomFirme = (id) => (id == null ? 'Super administrateurs' : firmes.find((f) => f.id === id)?.name || `Firme ${id}`);

  // Regroupe par firme, filtre par recherche
  const groupes = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const filtres = liste.filter((u) =>
      !texte || (u.user_name || '').toLowerCase().includes(texte) || (u.user_email || '').toLowerCase().includes(texte)
    );
    const parFirme = new Map();
    for (const u of filtres) {
      const cle = u.user_company ?? null;
      if (!parFirme.has(cle)) parFirme.set(cle, []);
      parFirme.get(cle).push(u);
    }
    return [...parFirme.entries()].sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
  }, [liste, recherche]);

  const quandFait = (message) => {
    setAction(null);
    setSucces(message);
    charger();
  };

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">Utilisateurs</h2>
            <p className="text-sm text-slate-500">Vous seul pouvez modifier les noms et les mots de passe des comptes.</p>
          </div>
        </div>

        <label className="relative block mb-5">
          <span className="sr-only">Rechercher un utilisateur</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher par nom ou e-mail"
            className="min-h-[44px] w-full border border-slate-300 rounded-lg pl-10 pr-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </label>

        {succes && <div className="mb-5"><Retour succes={succes} /></div>}
        {erreur && <div className="mb-5"><Retour erreur={erreur} /></div>}

        {chargement ? (
          <p className="text-slate-500">Chargement des comptes...</p>
        ) : groupes.length === 0 ? (
          <p className="text-slate-500">Aucun compte ne correspond à la recherche.</p>
        ) : (
          <div className="space-y-6">
            {groupes.map(([firme, membres]) => (
              <div key={String(firme)}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {nomFirme(firme)} <span className="font-normal normal-case">· {membres.length} compte(s)</span>
                </h3>
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {membres.map((u) => {
                    const moi = u.user_id === user?.id;
                    return (
                      <li key={u.user_id} className="bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">
                            {u.user_name || u.user_email}
                            {moi && <span className="ml-2 text-xs font-normal text-slate-500">(vous)</span>}
                          </p>
                          <p className="text-sm text-slate-500 truncate">{u.user_email}</p>
                        </div>
                        <span className={`self-start sm:self-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${COULEURS_ROLE[u.user_role] || 'bg-slate-100 text-slate-700'}`}>
                          {LIBELLES_ROLE[u.user_role] || u.user_role}
                        </span>
                        {moi ? (
                          <span className="text-xs text-slate-500 sm:w-[230px]">Modifiez votre compte dans « Mon profil ».</span>
                        ) : (
                          <div className="flex gap-2 sm:w-[230px]">
                            <button type="button" onClick={() => setAction({ type: 'nom', utilisateur: u })}
                              className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold inline-flex items-center justify-center gap-2">
                              <Pencil size={15} /> Nom
                            </button>
                            <button type="button" onClick={() => setAction({ type: 'mdp', utilisateur: u })}
                              className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold inline-flex items-center justify-center gap-2">
                              <KeyRound size={15} /> Mot de passe
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {action?.type === 'nom' && (
        <ModifierNom utilisateur={action.utilisateur} onFait={quandFait} onFermer={() => setAction(null)} />
      )}
      {action?.type === 'mdp' && (
        <ReinitialiserMdp utilisateur={action.utilisateur} onFait={quandFait} onFermer={() => setAction(null)} />
      )}
    </div>
  );
}
