import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vawnh nstinsbgfosjog.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd25obnN0aW5zYmdmb3Nqb2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjE0OTIsImV4cCI6MjEwNTAzNzQ5Mn0.6bIfyehGvKk6dcBkrObrJuJhiHaE2fpRpjGvShBQ37g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EMPLOYE: 'employe'
};
