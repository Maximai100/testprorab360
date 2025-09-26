import { createClient } from '@supabase/supabase-js'

// Получаем переменные окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Проверяем наличие обязательных переменных окружения
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 ОШИБКА: Отсутствуют обязательные переменные окружения!')
  console.error('📋 Необходимо настроить:')
  console.error('1. VITE_SUPABASE_URL - URL вашего Supabase проекта')
  console.error('2. VITE_SUPABASE_ANON_KEY - anon public ключ из Supabase Dashboard')
  console.error('3. Добавьте эти переменные в .env файл или в настройки Vercel')
  throw new Error('Отсутствуют обязательные переменные окружения Supabase')
}


// Проверяем, используется ли демо-ключ
if (supabaseAnonKey.includes('supabase-demo')) {
  console.error('🚨 ВНИМАНИЕ: Используется ДЕМО-ключ Supabase!')
  console.error('📋 Для исправления:')
  console.error('1. Откройте Supabase Dashboard → Settings → API')
  console.error('2. Скопируйте "anon public" ключ')
  console.error('3. Добавьте переменную окружения VITE_SUPABASE_ANON_KEY в Vercel')
  console.error('4. Передеплойте проект')
}

// Диагностика для продакшена
if (typeof window !== 'undefined') {
  console.log('🔍 Supabase диагностика:')
  console.log('🔍 URL:', supabaseUrl)
  console.log('🔍 Key (первые 20 символов):', supabaseAnonKey.substring(0, 20) + '...')
  console.log('🔍 Environment:', import.meta.env.MODE)
  console.log('🔍 Is Demo Key:', supabaseAnonKey.includes('supabase-demo'))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Увеличиваем таймауты для продакшена
    flowType: 'pkce',
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  // Настройки для продакшена
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
