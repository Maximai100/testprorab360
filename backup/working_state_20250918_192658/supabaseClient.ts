import { createClient } from '@supabase/supabase-js'

// Используем переменные окружения или fallback значения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://prorab360.online'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

// Логи для проверки
console.log('🔧 Supabase конфигурация:');
console.log('🔧 URL:', supabaseUrl);
console.log('🔧 Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('🔧 Используется переменная окружения:', !!import.meta.env.VITE_SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
})

console.log('🔧 Supabase клиент создан:', supabase);