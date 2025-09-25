import { createClient } from '@supabase/supabase-js'

// Получаем переменные окружения или используем значения по умолчанию
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://prorab360.online'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'


// Проверяем, используется ли демо-ключ
if (supabaseAnonKey.includes('supabase-demo')) {
  console.error('🚨 ВНИМАНИЕ: Используется ДЕМО-ключ Supabase!')
  console.error('📋 Для исправления:')
  console.error('1. Откройте Supabase Dashboard → Settings → API')
  console.error('2. Скопируйте "anon public" ключ')
  console.error('3. Создайте файл .env с VITE_SUPABASE_ANON_KEY=ваш_ключ')
  console.error('4. Перезапустите приложение')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
})
