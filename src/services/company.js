import { supabase } from '../config/supabase';
import { pourFirme } from './firme';

// Coordonnées de l'entreprise, stockées dans la table settings (clé / valeur).
export const CHAMPS_ENTREPRISE = [
  { key: 'company_name', label: 'Nom de l\'entreprise' },
  { key: 'company_location', label: 'Ville et pays (ex. Yaoundé, Cameroun)' },
  { key: 'company_address', label: 'Adresse' },
  { key: 'company_phone', label: 'Téléphone' },
  { key: 'company_email', label: 'Email' },
  { key: 'company_director', label: 'Libellé sous le cachet (ex. La Direction)' },
  { key: 'company_footer', label: 'Pied de page de la facture' },
  { key: 'invoice_prefix', label: 'Préfixe des numéros de facture (ex. FAC)' },
];

export async function chargerEntreprise() {
  const { data, error } = await pourFirme(supabase.from('settings').select('key, value'))
    .in('key', CHAMPS_ENTREPRISE.map((c) => c.key));
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
}

export async function enregistrerEntreprise(user, valeurs) {
  for (const { key } of CHAMPS_ENTREPRISE) {
    const { error } = await pourFirme(
      supabase
        .from('settings')
        .update({ value: valeurs[key] ?? '', updated_by: user?.id, updated_at: new Date().toISOString() })
    ).eq('key', key);
    if (error) throw error;
  }
}
