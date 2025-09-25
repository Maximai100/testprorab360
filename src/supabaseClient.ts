import { createClient } from '@supabase/supabase-js'

// ВРЕМЕННОЕ РЕШЕНИЕ: Полностью офлайн-режим
// Сервер prorab360.online недоступен (503 ошибка)
// Приложение работает только с localStorage до восстановления сервера

const supabaseUrl = 'https://prorab360.online' // Оригинальный URL (недоступен)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'

// Флаг для принудительного офлайн-режима
const FORCE_OFFLINE_MODE = true;

console.log('🔧 Supabase конфигурация (hardcoded):')
console.log('🔧 URL:', supabaseUrl)
console.log('🔧 Key:', supabaseAnonKey.substring(0, 20) + '...')

// Создаем мок-клиент для офлайн-режима
const createMockSupabaseClient = () => {
  console.log('🔧 Создаем мок-клиент Supabase для офлайн-режима');
  
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signUp: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null }),
        limit: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => ({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => ({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({ data: null, error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
};

// Создаем реальный клиент, но он будет работать в офлайн-режиме
const realSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Используем мок-клиент в офлайн-режиме
export const supabase = FORCE_OFFLINE_MODE ? createMockSupabaseClient() : realSupabaseClient;

console.log('🔧 Supabase клиент создан:', FORCE_OFFLINE_MODE ? 'МОК-РЕЖИМ' : 'ОБЫЧНЫЙ РЕЖИМ');
console.log('🔧 Приложение работает в офлайн-режиме с localStorage');