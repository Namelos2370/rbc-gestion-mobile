import { createClient } from '@supabase/supabase-js';

// Les variables du fichier .env (VITE_*) sont prioritaires.
// Les valeurs de secours évitent l'erreur « Failed to fetch » si .env est absent.
// La clé anon est publique par conception : la sécurité repose sur les règles RLS.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://vawnhnstinsbgfosjoag.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd25obnN0aW5zYmdmb3Nqb2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjE0OTIsImV4cCI6MjEwNTAzNzQ5Mn0.6bIfyehGvKk6dcBkrObrJuJhiHaE2fpRpjGvShBQ37g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EMPLOYE: 'employe',
};
