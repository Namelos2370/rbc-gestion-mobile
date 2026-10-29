// Cache local (navigateur) pour pouvoir consulter et imprimer hors ligne.
// Une lecture réussie est gardée ; hors ligne, la dernière copie reçue est utilisée.
// Toute panne de stockage est ignorée : l'application fonctionne alors comme avant.

export const estErreurReseau = (err) =>
  !navigator.onLine || /fetch|network|load failed|failed to/i.test(err?.message || '');

export function lireCache(cle) {
  try {
    const brut = localStorage.getItem(cle);
    return brut === null ? undefined : JSON.parse(brut);
  } catch {
    return undefined;
  }
}

export function ecrireCache(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage plein ou indisponible : on ne bloque pas l'affichage
  }
}

// Exécute la lecture réseau ; en cas de coupure, renvoie la dernière copie gardée pour cette clé
export async function avecCache(cle, lectureReseau) {
  try {
    const valeur = await lectureReseau();
    ecrireCache(cle, valeur);
    return valeur;
  } catch (err) {
    if (estErreurReseau(err)) {
      const copie = lireCache(cle);
      if (copie !== undefined) return copie;
    }
    throw err;
  }
}
