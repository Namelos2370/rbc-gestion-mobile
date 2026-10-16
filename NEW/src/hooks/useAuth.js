import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

// Le profil (rôle, nom, statut) est dans la table `profiles`, liée à auth.users par l'id.
async function chargerUtilisateur(session) {
  if (!session) return null;

  const { data: profil, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Profil introuvable :', error.message);
  }

  if (profil?.status === 'bloque') {
    await supabase.auth.signOut();
    throw new Error('Votre compte est bloqué. Contactez un administrateur.');
  }

  return { ...session.user, ...(profil || {}) };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let actif = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => chargerUtilisateur(session))
      .then((u) => actif && setUser(u))
      .catch((err) => actif && setError(err.message))
      .finally(() => actif && setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      chargerUtilisateur(session)
        .then((u) => actif && setUser(u))
        .catch((err) => actif && setError(err.message));
    });

    return () => {
      actif = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      throw err;
    }
    return data;
  };

  const logout = async () => {
    const { error: err } = await supabase.auth.signOut();
    if (err) {
      setError(err.message);
      throw err;
    }
    setUser(null);
  };

  return { user, loading, error, login, logout };
}
