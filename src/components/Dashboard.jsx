import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { Bell, LogOut } from 'lucide-react';
import Invoices from './Invoices';
import Validation from './Validation';
import Batches from './Batches';
import AuditLog from './AuditLog';
import Profile from './Profile';
import { formatMontant, joursDepuis, numeroFacture } from '../utils/format';
import logoRbc from '../assets/logo-rbc.jpeg';

const JOURS_ALERTE = 3;

const ONGLETS = [
  { id: 'invoices', label: 'Factures' },
  { id: 'validation', label: 'Validation' },
  { id: 'batches', label: 'Proformas' },
  { id: 'audit', label: 'Audit' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [onglet, setOnglet] = useState('invoices');
  const [stats, setStats] = useState({ enAttente: 0, validees: 0, lots: 0, totalMois: 0 });
  const [alertes, setAlertes] = useState([]);
  const [notifOuverte, setNotifOuverte] = useState(false);

  const chargerStats = async () => {
    const [{ data: factures }, { count: nbLots }] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, client, service, amount, status, created_at'),
      supabase.from('batches').select('id', { count: 'exact', head: true }),
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
    chargerStats();
  }, [onglet]);

  const allerAccueil = () => {
    setOnglet('invoices');
    setNotifOuverte(false);
  };

  const contenu = () => {
    switch (onglet) {
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
      case 'audit':
        return <AuditLog />;
      case 'profile':
        return <Profile user={user} />;
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
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap items-center gap-4 lg:gap-8 relative">
        <button onClick={allerAccueil} aria-label="Retour à l'accueil"
          className="flex items-center gap-3 rounded-lg min-h-[44px] hover:opacity-80">
          <img src={logoRbc} alt="Logo RBC Business Center" className="w-11 h-11 object-contain" />
          <span className="font-bold text-lg">RBC Gestion</span>
        </button>

        <nav className="flex gap-1 flex-wrap">
          {ONGLETS.map((o) => (
            <button key={o.id} onClick={() => setOnglet(o.id)}
              aria-current={onglet === o.id ? 'page' : undefined}
              className={`min-h-[44px] px-4 rounded-lg text-[15px] transition ${
                onglet === o.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              {o.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="relative">
            <button onClick={() => setNotifOuverte(!notifOuverte)}
              aria-label={`Notifications : ${alertes.length} facture(s) en attente depuis plus de ${JOURS_ALERTE} jours`}
              className="relative min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 bg-white flex items-center justify-center">
              <Bell size={18} />
              {alertes.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                  {alertes.length}
                </span>
              )}
            </button>
            {notifOuverte && (
              <div className="absolute right-0 top-12 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-3">
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
                <button onClick={() => { setOnglet('validation'); setNotifOuverte(false); }}
                  className="mt-3 w-full min-h-[44px] rounded-lg bg-blue-600 text-white font-semibold">
                  Ouvrir la validation
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setOnglet('profile')} aria-label="Ouvrir Mon profil"
            className="text-right min-h-[44px] rounded-lg px-2 hover:bg-slate-100">
            <p className="font-semibold text-sm">{user?.name || user?.email}</p>
            <p className="text-xs text-slate-500">Mon profil</p>
          </button>
          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold">
            {user?.role}
          </span>
          <button onClick={logout}
            className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white flex items-center gap-2 text-[15px]">
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cartes.map((c) => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 break-words">{c.valeur}</p>
            </div>
          ))}
        </section>

        {contenu()}
      </main>
    </div>
  );
}
