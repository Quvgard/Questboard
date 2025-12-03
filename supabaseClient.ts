import { createClient } from '@supabase/supabase-js';

// ВАЖНО: В Vite используем import.meta.env, а не process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Выводим информацию для отладки
console.log('🔧 Supabase Config Check:');
console.log('URL exists:', !!supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

if (supabaseUrl && supabaseAnonKey) {
  console.log('✅ Supabase credentials loaded successfully');
  console.log('URL starts with:', supabaseUrl.substring(0, Math.min(30, supabaseUrl.length)));
} else {
  console.error('❌ ERROR: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('In Netlify: Site Settings > Environment Variables');
  
  // Показываем всплывающее сообщение в development
  if (import.meta.env.DEV) {
    setTimeout(() => {
      alert('⚠️ Supabase credentials missing!\n\nPlease set:\nVITE_SUPABASE_URL\nVITE_SUPABASE_ANON_KEY\n\nin your .env file');
    }, 1000);
  }
}

// Инициализация клиента
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Экспортируем для проверки
export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  keyConfigured: !!supabaseAnonKey,
  isUsingRealCredentials: !supabaseUrl?.includes('placeholder')
});