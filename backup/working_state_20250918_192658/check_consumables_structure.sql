-- Проверка структуры таблицы consumables
-- Выполните этот скрипт в Supabase SQL Editor для диагностики

-- Показываем все колонки таблицы consumables
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'consumables' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Показываем существующие записи в таблице consumables
SELECT 
    id,
    name,
    quantity,
    unit,
    location,
    project_id,
    created_at,
    updated_at
FROM public.consumables
LIMIT 10;

-- Проверяем, есть ли поле location
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'consumables' 
            AND column_name = 'location'
            AND table_schema = 'public'
        ) 
        THEN 'Поле location существует' 
        ELSE 'Поле location НЕ существует' 
    END as location_field_status;
