import { createClient } from '@supabase/supabase-js';

// NOTE: In a real deployment, these should be environment variables.
// For this generated code to be "ready", the user must populate .env or hardcode them here (not recommended for production).
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Check SQL_SCHEMA.md and set up your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
