import { supabase } from '../config/supabase';
import { getFirmeActive, pourFirme } from './firme';
import { logAudit } from './invoices';

const CLE_ATTENTE = 'rbc_depenses_attente_v1';
const CLE_CACHE = 'rbc_depenses_cache_v1';

// Date du jour à Douala, au format AAAA-MM-JJ
export const aujourdhui = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });

// Une dépense ne se modifie ou ne se supprime que le jour même, sauf pour le super administrateur
export const estDuJour = (depense) =>
  new Date(depense.created_at).toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' }) === aujourdhui();

// Valide la saisie et renvoie les données prêtes pour la base, ou lève une erreur lisible
export function depenseValide(saisie) {
  const libelle = (saisie.libelle || '').trim();
  const montant = Number(String(saisie.montant).replace(/\s/g, '').replace(',', '.'));
  if (!libelle) throw new Error('Indiquez le motif de la dépense.');
  if (!Number.isFinite(montant) || montant <= 0) throw new Error('Indiquez un montant supérieur à 0.');
  return {
    date_depense: saisie.date_depense || aujourdhui(),
    libelle,
    montant: Math.round(montant * 100) / 100,
    note: (saisie.note || '').trim() || null,
  };
}

// --- Stockage local (hors ligne) : tout est protégé, une panne de stockage ne bloque pas l'application ---

function lireJson(cle, defaut) {
  try {
    return JSON.parse(localStorage.getItem(cle)) ?? defaut;
  } catch {
    return defaut;
  }
}

function ecrireJson(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage plein ou indisponible : la saisie reste dans l'écran en cours
  }
}

// Dépenses saisies sur cet appareil et pas encore envoyées, pour cet utilisateur
export function depensesEnAttente(userId) {
  return lireJson(CLE_ATTENTE, []).filter((d) => d.created_by === userId);
}

const enregistrerAttente = (liste) => ecrireJson(CLE_ATTENTE, liste);

const estErreurReseau = (err) => !navigator.onLine || /fetch|network|load failed|failed to/i.test(err?.message || '');

// --- Lecture ---

export async function chargerDepenses() {
  const firme = getFirmeActive() || 'toutes';
  try {
    const { data, error } = await pourFirme(
      supabase
        .from('depenses')
        .select('*')
        .order('date_depense', { ascending: false })
        .order('created_at', { ascending: false })
    );
    if (error) throw new Error(error.message);
    const liste = data || [];
    const cache = lireJson(CLE_CACHE, {});
    cache[firme] = liste;
    ecrireJson(CLE_CACHE, cache);
    return liste;
  } catch (err) {
    if (estErreurReseau(err)) {
      // Hors ligne : on affiche la dernière liste reçue
      return lireJson(CLE_CACHE, {})[firme] || [];
    }
    throw err;
  }
}

// --- Écriture ---

// Envoie une dépense à la base. Un identifiant (client_ref) créé sur l'appareil empêche tout doublon en cas de nouvel essai.
async function envoyerDepense(user, item) {
  const { data, error } = await supabase
    .from('depenses')
    .upsert([{ ...item.donnees, company_id: item.company_id, created_by: item.created_by, client_ref: item.client_ref }], {
      onConflict: 'client_ref',
      ignoreDuplicates: true,
    })
    .select('id');
  if (error) throw error;
  // Doublon déjà enregistré : rien à journaliser une seconde fois
  if (!data || data.length === 0) return;
  await logAudit(user, {
    entityType: 'depense',
    entityId: data[0].id,
    action: 'create_depense',
    after: { ...item.donnees },
  });
}

// Renvoie { enAttente: true } si la dépense est gardée sur l'appareil (hors ligne)
export async function ajouterDepense(user, saisie) {
  const donnees = depenseValide(saisie);
  const item = {
    client_ref: crypto.randomUUID(),
    company_id: getFirmeActive(),
    created_by: user.id,
    donnees,
    cree_le: new Date().toISOString(),
  };

  if (!navigator.onLine) {
    enregistrerAttente([...lireJson(CLE_ATTENTE, []), item]);
    return { enAttente: true };
  }
  try {
    await envoyerDepense(user, item);
    return { enAttente: false };
  } catch (err) {
    if (estErreurReseau(err)) {
      enregistrerAttente([...lireJson(CLE_ATTENTE, []), item]);
      return { enAttente: true };
    }
    throw new Error(err.message);
  }
}

// Envoie les dépenses en attente de cet utilisateur. Une dépense reste sur l'appareil tant que l'envoi échoue.
export async function synchroniserDepenses(user) {
  if (!user?.id || !navigator.onLine) return { envoyees: 0, erreur: '' };
  let envoyees = 0;
  let erreur = '';
  const tout = lireJson(CLE_ATTENTE, []);
  const restantes = [];
  for (const item of tout) {
    if (item.created_by !== user.id) {
      restantes.push(item);
      continue;
    }
    try {
      await envoyerDepense(user, item);
      envoyees += 1;
    } catch (err) {
      restantes.push(item);
      if (!estErreurReseau(err)) erreur = err.message;
    }
  }
  enregistrerAttente(restantes);
  return { envoyees, erreur };
}

export async function modifierDepense(user, depense, saisie) {
  const donnees = depenseValide(saisie);
  const { error } = await supabase.from('depenses').update(donnees).eq('id', depense.id);
  if (error) throw new Error(error.message);
  await logAudit(user, {
    entityType: 'depense',
    entityId: depense.id,
    action: 'update_depense',
    before: { libelle: depense.libelle, montant: depense.montant, date_depense: depense.date_depense, note: depense.note },
    after: donnees,
  });
}

export async function supprimerDepense(user, depense) {
  const { error } = await supabase.from('depenses').delete().eq('id', depense.id);
  if (error) throw new Error(error.message);
  await logAudit(user, {
    entityType: 'depense',
    entityId: depense.id,
    action: 'delete_depense',
    before: { libelle: depense.libelle, montant: depense.montant, date_depense: depense.date_depense },
  });
}
