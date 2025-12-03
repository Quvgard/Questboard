import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables
const getEnv = (key: string, viteKey: string): string => {
  let value = '';
  
  // Try process.env (Standard Node/CRA)
  try {
    if (typeof process !== 'undefined' && process.env) {
      value = process.env[key] || '';
    }
  } catch (e) {
    // process is not defined
  }

  // Try import.meta.env (Vite)
  if (!value) {
    try {
      const meta = import.meta as any;
      if (meta && meta.env) {
        value = meta.env[viteKey] || '';
      }
    } catch (e) {
      // import.meta not available
    }
  }
  
  return value;
};

const supabaseUrl = getEnv('REACT_APP_SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('REACT_APP_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing! Please check your environment variables.");
}

// Initialize Supabase client
// We provide fallback placeholder values to prevent the application from crashing 
// with "supabaseUrl is required" if environment variables are missing.
// API calls will fail gracefully instead of the app failing to load.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
