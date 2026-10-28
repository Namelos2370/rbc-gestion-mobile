import { supabase } from '../config/supabase';
import { getFirmeActive, pourFirme } from './firme';
import { logAudit } from './invoices';

// Date du jour à Douala, au format AAAA-MM-JJ
export const aujourdhui = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });

// Une dépense ne se modifie ou ne se supprime que le jour même, sauf pour le super administrateur
export const estDuJour = (depense) =>
  new Date(depense.created_at).toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' }) === aujourdhui();

// Valide la saisie et renvoie les données prêtes pour la base, ou lève une erreur lisible
export function depenseValide(saisie) {
  const libelle = (saisie.libelle || '').trim();
  const montant = Number(String(saisie.montant).replace(/\s/g, '').replace(',', '.'));
  if (!libelle) throw new Error('Indiquez le libellé de la dépense.');
  if (!Number.isFinite(montant) || montant <= 0) throw new Error('Indiquez un montant supérieur à 0.');
  return {
    date_depense: saisie.date_depense || aujourdhui(),
    libelle,
    montant: Math.round(montant * 100) / 100,
    note: (saisie.note || '').trim() || null,
  };
}

export async function chargerDepenses() {
  const { data, error } = await pourFirme(
    supabase
      .from('depenses')
      .select('*')
      .order('date_depense', { ascending: false })
      .order('created_at', { ascending: false })
  );
  if (error) throw new Error(error.message);
  return data || [];
}

export async function ajouterDepense(user, saisie) {
  const donnees = depenseValide(saisie);
  const { data, error } = await supabase
    .from('depenses')
    .insert([{ ...donnees, company_id: getFirmeActive(), created_by: user.id }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logAudit(user, { entityType: 'depense', entityId: data.id, action: 'create_depense', after: donnees });
  return data;
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
