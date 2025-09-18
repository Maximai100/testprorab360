-- Исправление ограничения для поля location в таблице tools
-- Выполните этот скрипт в Supabase SQL Editor

-- Удаляем старое ограничение
ALTER TABLE public.tools DROP CONSTRAINT IF EXISTS tools_location_check;

-- Добавляем новое ограничение, которое разрешает 'on_project'
ALTER TABLE public.tools 
ADD CONSTRAINT tools_location_check 
CHECK (location IN ('on_base', 'in_repair', 'on_project') OR location LIKE 'project_%');

-- Проверяем, что ограничение добавлено
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'tools' 
AND tc.constraint_name = 'tools_location_check'
AND tc.table_schema = 'public';
