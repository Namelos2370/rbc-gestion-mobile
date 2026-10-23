import { supabase } from '../config/supabase';
import { logAudit, quantiteValide } from './invoices';
import { getFirmeActive, pourFirme } from './firme';

// Lignes valides : désignation renseignée, quantité obligatoire (entier ≥ 1), prix ≥ 0
export function lignesProformaValides(lignes) {
  const lues = lignes
    .filter((l) => String(l.designation || '').trim() !== '')
    .map((l) => ({
      designation: String(l.designation).trim(),
      quantite: quantiteValide(l.quantite),
      prix: Math.max(0, Number(l.prix) || 0),
    }));
  if (lues.some((l) => l.quantite === null)) {
    throw new Error('Indiquez la quantité (au moins 1) pour chaque désignation.');
  }
  return lues;
}

export async function chargerProformas() {
  const { data, error } = await pourFirme(supabase.from('proformas').select('*'))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function chargerLignesProforma(proformaId) {
  const { data, error } = await supabase
    .from('proforma_items')
    .select('*')
    .eq('proforma_id', proformaId)
    .order('id');
  if (error) throw error;
  return data || [];
}

// Le numéro (PRO-0001) est généré par la base : on ne l'envoie pas
export async function creerProforma(user, { client, lignes }) {
  const lues = lignesProformaValides(lignes);
  if (lues.length === 0) throw new Error('Ajoutez au moins une désignation avec un prix.');
  const montant = lues.reduce((s, l) => s + l.quantite * l.prix, 0);

  const { data: proforma, error } = await supabase
    .from('proformas')
    .insert([{ client, amount: montant, created_by: user?.id, company_id: getFirmeActive() }])
    .select()
    .single();
  if (error) throw error;

  const { error: errLignes } = await supabase.from('proforma_items').insert(
    lues.map((l) => ({
      proforma_id: proforma.id,
      designation: l.designation,
      quantity: l.quantite,
      unit_price: l.prix,
    }))
  );
  if (errLignes) throw errLignes;

  await logAudit(user, {
    entityType: 'proforma',
    entityId: proforma.id,
    action: 'create_proforma',
    after: { proforma_number: proforma.proforma_number, client, total: montant, lignes: lues },
  });
  return proforma;
}

export async function supprimerProforma(user, proforma) {
  const { error } = await supabase.from('proformas').delete().eq('id', proforma.id);
  if (error) throw error;
  await logAudit(user, {
    entityType: 'proforma',
    entityId: proforma.id,
    action: 'delete_proforma',
    before: { proforma_number: proforma.proforma_number, client: proforma.client, total: proforma.amount },
  });
}
