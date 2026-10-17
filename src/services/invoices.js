import { supabase } from '../config/supabase';

// Journal d'audit : colonnes réelles de la table audit_logs.
// entity_id est un bigint non nul : les lots (uuid) sont journalisés avec entity_id = 0.
export async function logAudit(user, { entityType, entityId, action, before = null, after = null }) {
  const { error } = await supabase.from('audit_logs').insert([
    {
      user_id: user?.id,
      entity_type: entityType,
      entity_id: entityId,
      action,
      before_value: before,
      after_value: after,
    },
  ]);
  if (error) console.error('Audit non enregistré :', error.message);
}

// Lignes saisies : { designation, quantite, prix } (valeurs du formulaire, en texte ou nombre)
export function lignesValides(lignes) {
  return lignes
    .map((l) => ({
      designation: String(l.designation || '').trim(),
      quantite: Math.max(1, Math.round(Number(l.quantite) || 0)),
      prix: Math.max(0, Number(l.prix) || 0),
    }))
    .filter((l) => l.designation && l.prix >= 0);
}

const totalDesLignes = (lignes) => lignes.reduce((s, l) => s + l.quantite * l.prix, 0);

export async function creerFacture(user, { client, lignes }) {
  const lues = lignesValides(lignes);
  if (lues.length === 0) throw new Error('Ajoutez au moins une désignation avec un prix.');

  // Le numéro (invoice_number) est généré par la base à partir de l'identifiant : on ne l'envoie pas
  const { data: facture, error } = await supabase
    .from('invoices')
    .insert([
      {
        client,
        service: lues.map((l) => l.designation).join(', '),
        amount: totalDesLignes(lues),
        status: 'en_attente',
        employee_id: user?.id,
      },
    ])
    .select()
    .single();
  if (error) throw error;

  const { error: errLignes } = await supabase.from('invoice_items').insert(
    lues.map((l) => ({
      invoice_id: facture.id,
      designation: l.designation,
      quantity: l.quantite,
      unit_price: l.prix,
    }))
  );
  if (errLignes) {
    // Annule la facture pour ne pas laisser une facture sans lignes
    await supabase.from('invoices').delete().eq('id', facture.id);
    throw errLignes;
  }

  await logAudit(user, {
    entityType: 'invoice',
    entityId: facture.id,
    action: 'create_invoice',
    after: { invoice_number: facture.invoice_number, client, total: totalDesLignes(lues) },
  });
}

export async function chargerLignes(factureId) {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', factureId)
    .order('id');
  if (error) throw error;
  return data || [];
}

export async function validerFacture(user, facture) {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'validee', validated_at: new Date().toISOString() })
    .eq('id', facture.id);
  if (error) throw error;

  await logAudit(user, {
    entityType: 'invoice',
    entityId: facture.id,
    action: 'validate_invoice',
    before: { status: facture.status },
    after: { status: 'validee' },
  });
}

export async function modifierFacture(user, facture, { client, lignes }) {
  const lues = lignesValides(lignes);
  if (lues.length === 0) throw new Error('Ajoutez au moins une désignation avec un prix.');

  const avant = {
    client: facture.client,
    service: facture.service,
    amount: facture.amount,
    lignes: await chargerLignes(facture.id),
  };

  const { error } = await supabase
    .from('invoices')
    .update({
      client,
      service: lues.map((l) => l.designation).join(', '),
      amount: totalDesLignes(lues),
    })
    .eq('id', facture.id);
  if (error) throw error;

  // Remplace les lignes existantes
  const { error: errSuppr } = await supabase.from('invoice_items').delete().eq('invoice_id', facture.id);
  if (errSuppr) throw errSuppr;
  const { error: errAjout } = await supabase.from('invoice_items').insert(
    lues.map((l) => ({
      invoice_id: facture.id,
      designation: l.designation,
      quantity: l.quantite,
      unit_price: l.prix,
    }))
  );
  if (errAjout) throw errAjout;

  await logAudit(user, {
    entityType: 'invoice',
    entityId: facture.id,
    action: facture.status === 'validee' ? 'edit_validated_invoice' : 'edit_invoice',
    before: avant,
    after: { client, total: totalDesLignes(lues), lignes: lues },
  });
}

export async function supprimerFacture(user, facture) {
  const { error } = await supabase.from('invoices').delete().eq('id', facture.id);
  if (error) throw error;

  await logAudit(user, {
    entityType: 'invoice',
    entityId: facture.id,
    action: 'delete_invoice',
    before: { client: facture.client, service: facture.service, amount: facture.amount, status: facture.status },
  });
}

// Recherche d'une facture validée par son numéro (FAC-001, ou simplement 1 / 001).
// Le caissier ne voit que les factures validées : la base renvoie rien pour les autres.
export async function chercherFactureValidee(saisie) {
  const texte = String(saisie || '').trim().toUpperCase();
  if (!texte) throw new Error('Saisissez le numéro de la facture.');

  const numero = /^\d+$/.test(texte)
    ? `FAC-${texte.padStart(3, '0')}`
    : texte.startsWith('FAC-') ? texte : `FAC-${texte}`;

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', numero)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Aucune facture validée ne porte le numéro ${numero}.`);
  return data;
}

// Confirme l'encaissement d'une facture validée. Une facture ne peut être encaissée qu'une fois.
export async function encaisserFacture(user, facture) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ paid_at: new Date().toISOString(), paid_by: user?.id })
    .eq('id', facture.id)
    .is('paid_at', null)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Cette facture est déjà encaissée.');

  await logAudit(user, {
    entityType: 'invoice',
    entityId: facture.id,
    action: 'encaisser_facture',
    after: { invoice_number: facture.invoice_number, client: facture.client, total: facture.amount },
  });
  return data[0];
}

// Liste des factures validées (encaissées ou non) pour l'espace caissier.
export async function chargerFacturesCaisse() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('status', 'validee')
    .order('validated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
