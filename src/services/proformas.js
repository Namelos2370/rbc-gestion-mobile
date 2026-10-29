import { supabase } from '../config/supabase';
import { logAudit, quantiteValide } from './invoices';
import { getFirmeActive, pourFirme } from './firme';
import { avecCache } from './cache';

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
  return avecCache(`rbc_c_proformas_${getFirmeActive() || 'toutes'}`, async () => {
    const { data, error } = await pourFirme(supabase.from('proformas').select('*'))
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  });
}

export async function chargerLignesProforma(proformaId) {
  return avecCache(`rbc_c_lignes_p_${proformaId}`, async () => {
    const { data, error } = await supabase
      .from('proforma_items')
      .select('*')
      .eq('proforma_id', proformaId)
      .order('id');
    if (error) throw error;
    return data || [];
  });
}

// Le numéro (PRO-0001) est généré par la base : on ne l'envoie pas
export async function creerProforma(user, { client, clientPhone, lignes }) {
  const lues = lignesProformaValides(lignes);
  if (lues.length === 0) throw new Error('Ajoutez au moins une désignation avec un prix.');
  const montant = lues.reduce((s, l) => s + l.quantite * l.prix, 0);

  const { data: proforma, error } = await supabase
    .from('proformas')
    .insert([{ client, client_phone: (clientPhone || '').trim() || null, amount: montant, created_by: user?.id, company_id: getFirmeActive() }])
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
    after: { proforma_number: proforma.proforma_number, client, client_phone: proforma.client_phone, total: montant, lignes: lues },
  });
  return proforma;
}

// Suivi du règlement : marque la proforma comme payée (ou la remet en attente)
export async function definirPaiementProforma(user, proforma, payee) {
  const paid_at = payee ? new Date().toISOString() : null;
  const { error } = await supabase.from('proformas').update({ paid_at }).eq('id', proforma.id);
  if (error) throw error;
  await logAudit(user, {
    entityType: 'proforma',
    entityId: proforma.id,
    action: payee ? 'proforma_payee' : 'proforma_impayee',
    before: { proforma_number: proforma.proforma_number, paid: !!proforma.paid_at },
    after: { proforma_number: proforma.proforma_number, paid: payee },
  });
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
