import { createClient } from '@supabase/supabase-js'

// Используем переменные окружения или fallback значения
// ВАЖНО: Замените эти значения на реальные данные вашего Supabase проекта!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here'

// Логи для проверки
console.log('🔧 Supabase конфигурация:');
console.log('🔧 URL:', supabaseUrl);
console.log('🔧 Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('🔧 Используется переменная окружения:', !!import.meta.env.VITE_SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔧 Supabase клиент создан:', supabase);