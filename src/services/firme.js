import { supabase } from '../config/supabase';

// Firme active : celle de l'utilisateur (admin, employé, caissier) ou celle choisie par le super administrateur.
// Gardée pendant la session du navigateur, effacée à la déconnexion.
const CLE = 'rbc_firme_active';
let active = null;
try {
  active = Number(sessionStorage.getItem(CLE)) || null;
} catch {
  active = null;
}

export const getFirmeActive = () => active;

export function setFirmeActive(id) {
  active = id ? Number(id) : null;
  try {
    if (active) sessionStorage.setItem(CLE, String(active));
    else sessionStorage.removeItem(CLE);
  } catch {
    // Pas de stockage disponible : la firme reste en mémoire pour la page en cours
  }
}

// Restreint une requête à la firme active. La base vérifie déjà les droits ; ceci évite de mélanger les firmes à l'écran.
export function pourFirme(requete) {
  return active ? requete.eq('company_id', active) : requete;
}

export async function chargerFirmes() {
  const { data, error } = await supabase.from('companies').select('id, name').order('id');
  if (error) throw error;
  return data || [];
}
