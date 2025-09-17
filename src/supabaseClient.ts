import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://prorab360.online' // Возвращаем к исходному URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE' // Замени на реальный ключ

console.log('🔧 Supabase конфигурация:');
console.log('🔧 URL:', supabaseUrl);
console.log('🔧 Key:', supabaseAnonKey.substring(0, 20) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🔧 Supabase клиент создан:', supabase);
