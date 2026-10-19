import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { Bell, LogOut, ChevronDown } from 'lucide-react';
import Invoices from './Invoices';
import Validation from './Validation';
import Batches from './Batches';
import AuditLog from './AuditLog';
import Profile from './Profile';
import Proformas from './Proformas';
import Caisse from './Caisse';
import ChoixFirme from './ChoixFirme';
import Utilisateurs from './Utilisateurs';
import { getFirmeActive, setFirmeActive, pourFirme, chargerFirmes } from '../services/firme';
import { formatMontant, joursDepuis, numeroFacture } from '../utils/format';
import logoRbc from '../assets/logo-rbc.jpeg';

const JOURS_ALERTE = 3;

const ONGLETS = [
  { id: 'invoices', label: 'Factures' },
  { id: 'validation', label: 'Validation' },
  { id: 'proformas', label: 'Proformas', superAdmin: true },
  { id: 'batches', label: 'Lots Excel', superAdmin: true },
  { id: 'audit', label: 'Audit' },
  { id: 'caisse', label: 'Encaissement', caissier: true },
];

// Menu déroulant ouvert en cliquant sur le logo
const MENU_LOGO = [
  { id: 'invoices', label: 'Accueil · Factures' },
  { id: 'validation', label: 'Validation des factures' },
  { id: 'proformas', label: 'Proformas', superAdmin: true },
  { id: 'batches', label: 'Lots Excel', superAdmin: true },
  { id: 'audit', label: "Journal d'audit" },
  { id: 'utilisateurs', label: 'Utilisateurs', superAdmin: true },
  { id: 'caisse', label: 'Encaissement', caissier: true },
  { id: 'profile', label: 'Mon profil' },
];

const LIBELLES_ROLE = { super_admin: 'Super admin', admin: 'Admin', employe: 'Employé', caissier: 'Caissier' };
// Couleur du badge par rôle : on distingue d'un coup d'œil son espace
const COULEURS_ROLE = {
  super_admin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  employe: 'bg-slate-100 text-slate-700',
  caissier: 'bg-green-100 text-green-800',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const estSuperAdmin = user?.role === 'super_admin';
  // Super admin : la firme est choisie à l'écran d'entrée (gardée pour la session). Les autres : leur firme.
  const [firmeChoisie, setFirmeChoisie] = useState(() => (estSuperAdmin ? getFirmeActive() : null));
  const [firmes, setFirmes] = useState([]);
  const firmeActive = estSuperAdmin ? firmeChoisie : user?.company_id ?? null;
  if (firmeActive && getFirmeActive() !== Number(firmeActive)) setFirmeActive(firmeActive);
  const firmeNom = firmes.find((f) => f.id === Number(firmeActive))?.name || '';
  const [onglet, setOnglet] = useState('invoices');
  const [stats, setStats] = useState({ enAttente: 0, validees: 0, lots: 0, totalMois: 0 });
  const [alertes, setAlertes] = useState([]);
  const [notifOuverte, setNotifOuverte] = useState(false);
  const [menuLogoOuvert, setMenuLogoOuvert] = useState(false);
  const estAdmin = ['admin', 'super_admin'].includes(user?.role);
  const estCaissier = user?.role === 'caissier';
  // Le caissier n'a qu'un seul espace (l'encaissement) ; son profil reste accessible
  const ongletActif = estCaissier && onglet !== 'profile' ? 'caisse' : onglet;

  // L'encaissement est ouvert au caissier, à l'administrateur et au super administrateur
  const ongletVisible = (o) => {
    if (estCaissier) return !!o.caissier;
    if (o.caissier) return estAdmin;
    return (!o.superAdmin || user?.role === 'super_admin') && (estAdmin || o.id === 'invoices');
  };

  const menuVisible = (m) => {
    if (estCaissier) return !!m.caissier || m.id === 'profile';
    if (m.caissier) return estAdmin;
    return (estAdmin || m.id === 'invoices' || m.id === 'profile') && (!m.superAdmin || user?.role === 'super_admin');
  };

  const choisirDansMenu = (id) => {
    setOnglet(id);
    setMenuLogoOuvert(false);
    setNotifOuverte(false);
  };

  const chargerStats = async () => {
    const [{ data: factures }, { count: nbLots }] = await Promise.all([
      pourFirme(supabase.from('invoices').select('id, invoice_number, client, service, amount, status, created_at')),
      pourFirme(supabase.from('batches').select('id', { count: 'exact', head: true })),
    ]);
    const liste = factures || [];
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    setStats({
      enAttente: liste.filter((f) => f.status === 'en_attente').length,
      validees: liste.filter((f) => f.status === 'validee').length,
      lots: nbLots ?? 0,
      totalMois: liste
        .filter((f) => new Date(f.created_at) >= debutMois)
        .reduce((s, f) => s + Number(f.amount), 0),
    });
    setAlertes(
      liste.filter((f) => f.status === 'en_attente' && joursDepuis(f.created_at) >= JOURS_ALERTE)
    );
  };

  useEffect(() => {
    chargerFirmes().then(setFirmes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!estCaissier && firmeActive) chargerStats();
  }, [onglet, estCaissier, firmeActive]);

  const choisirFirme = (id) => {
    setFirmeActive(id);
    setFirmeChoisie(id);
    setOnglet('invoices');
  };

  const changerFirme = () => {
    setFirmeActive(null);
    setFirmeChoisie(null);
    setMenuLogoOuvert(false);
    setNotifOuverte(false);
  };

  const quitter = async () => {
    setFirmeActive(null);
    setFirmeChoisie(null);
    await logout();
  };

  if (estSuperAdmin && !firmeChoisie) {
    return <ChoixFirme onChoisir={choisirFirme} onDeconnexion={quitter} />;
  }

  const contenu = () => {
    if (!estAdmin && !estCaissier && (onglet === 'validation' || onglet === 'audit' || onglet === 'batches' || onglet === 'proformas')) {
      return (
        <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Accès réservé aux administrateurs
        </p>
      );
    }
    switch (ongletActif) {
      case 'caisse':
        return estAdmin || estCaissier ? (
          <Caisse user={user} />
        ) : (
          <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Accès réservé au caissier
          </p>
        );
      case 'invoices':
        return <Invoices user={user} onChange={chargerStats} />;
      case 'validation':
        return <Validation user={user} onChange={chargerStats} />;
      case 'batches':
        return user?.role === 'super_admin' ? (
          <Batches user={user} onChange={chargerStats} />
        ) : (
          <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Accès réservé aux super administrateurs
          </p>
        );
      case 'proformas':
        return user?.role === 'super_admin' ? (
          <Proformas user={user} />
        ) : (
          <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Accès réservé aux super administrateurs
          </p>
        );
      case 'audit':
        return <AuditLog />;
      case 'utilisateurs':
        return user?.role === 'super_admin' ? (
          <Utilisateurs user={user} />
        ) : (
          <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Accès réservé aux super administrateurs
          </p>
        );
      case 'profile':
        return <Profile user={user} firmeNom={firmeNom} />;
      default:
        return null;
    }
  };

  const cartes = [
    { label: 'En attente de validation', valeur: stats.enAttente },
    { label: 'Factures validées', valeur: stats.validees },
    { label: 'Lots de proformas', valeur: stats.lots },
    { label: 'Total du mois', valeur: formatMontant(stats.totalMois) },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 flex items-center gap-3">
          <div className="relative min-w-0">
            <button onClick={() => setMenuLogoOuvert(!menuLogoOuvert)}
              aria-label="Menu RBC Gestion" aria-expanded={menuLogoOuvert} aria-haspopup="menu"
              className="flex items-center gap-2 sm:gap-3 rounded-lg min-h-[44px] hover:bg-slate-100 px-1 pr-2 min-w-0">
              <img src={logoRbc} alt="Logo RBC Business Center" className="w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0" />
              <span className="font-bold text-base sm:text-lg truncate">RBC Gestion</span>
              <ChevronDown size={16} className={`shrink-0 text-slate-500 transition ${menuLogoOuvert ? 'rotate-180' : ''}`} />
            </button>
            {menuLogoOuvert && (
              <ul role="menu" className="absolute left-0 top-full mt-2 w-64 max-w-[85vw] bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-2">
                {MENU_LOGO.filter((m) => menuVisible(m)).map((m) => (
                  <li key={m.id} role="none">
                    <button role="menuitem" onClick={() => choisirDansMenu(m.id)}
                      className={`w-full text-left min-h-[44px] px-3 rounded-lg transition ${
                        ongletActif === m.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'
                      }`}>
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {firmeNom && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold max-w-[120px] truncate">{firmeNom}</span>
            )}
            {estSuperAdmin && (
              <button onClick={changerFirme} aria-label="Changer de firme"
                className="min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-sm whitespace-nowrap">
                <span className="hidden sm:inline">Changer de firme</span>
                <span className="sm:hidden">Firme</span>
              </button>
            )}
            <div className="relative">
              <button onClick={() => setNotifOuverte(!notifOuverte)}
                aria-label={`Notifications : ${alertes.length} facture(s) en attente depuis plus de ${JOURS_ALERTE} jours`}
                className="relative min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 bg-white flex items-center justify-center">
                <Bell size={18} />
                {alertes.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                    {alertes.length}
                  </span>
                )}
              </button>
              {notifOuverte && (
                <div className="absolute right-0 top-12 w-80 max-w-[85vw] bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-4">
                  <p className="font-semibold mb-2">En attente depuis plus de {JOURS_ALERTE} jours</p>
                  {alertes.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune alerte</p>
                  ) : (
                    <ul className="space-y-2 max-h-72 overflow-y-auto">
                      {alertes.map((f) => (
                        <li key={f.id} className="text-sm border-t border-slate-100 pt-2">
                          <p className="font-semibold">{numeroFacture(f)} · {f.client}</p>
                          <p className="text-slate-500">{joursDepuis(f.created_at)} jours · {formatMontant(f.amount)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {estAdmin && (
                    <button onClick={() => { setOnglet('validation'); setNotifOuverte(false); }}
                      className="mt-3 w-full min-h-[44px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      Ouvrir la validation
                    </button>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setOnglet('profile')} aria-label="Ouvrir Mon profil"
              className="hidden sm:block text-right min-h-[44px] rounded-lg px-2 hover:bg-slate-100">
              <p className="font-semibold text-sm">{user?.name || user?.email}</p>
              <p className="text-xs text-slate-500">Mon profil</p>
            </button>
            <span className={`hidden md:inline px-2.5 py-1 rounded-full text-xs font-semibold ${COULEURS_ROLE[user?.role] || 'bg-slate-100 text-slate-700'}`}>
              {LIBELLES_ROLE[user?.role] || user?.role}
            </span>
            <button onClick={quitter} aria-label="Déconnexion"
              className="min-h-[44px] min-w-[44px] sm:px-4 rounded-lg border border-slate-300 bg-white flex items-center justify-center gap-2 text-[15px]">
              <LogOut size={16} /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        <nav className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 pb-2 flex gap-1 overflow-x-auto">
          {ONGLETS.filter((o) => ongletVisible(o)).map((o) => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              aria-current={ongletActif === o.id ? 'page' : undefined}
              className={`min-h-[44px] px-4 rounded-lg text-[15px] whitespace-nowrap shrink-0 transition ${
                ongletActif === o.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              {o.label}
            </button>
          ))}
        </nav>
      </header>

      <main key={firmeActive ?? 'aucune'} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {!estCaissier && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {cartes.map((c) => (
              <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col gap-1">
                <p className="text-[13px] sm:text-sm text-slate-500 leading-snug">{c.label}</p>
                <p className="text-xl sm:text-3xl font-bold break-words">{c.valeur}</p>
              </div>
            ))}
          </section>
        )}

        {contenu()}
      </main>
    </div>
  );
}
