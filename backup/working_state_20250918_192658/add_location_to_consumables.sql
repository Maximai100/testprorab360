-- Миграция: Добавление поля location в таблицу consumables
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем поле location в таблицу consumables
ALTER TABLE public.consumables 
ADD COLUMN IF NOT EXISTS location text;

-- Обновляем существующие записи, устанавливая location = 'on_base' по умолчанию
UPDATE public.consumables 
SET location = 'on_base' 
WHERE location IS NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.consumables.location IS 'Местоположение расходника: on_base, on_project, to_buy';

-- Проверяем, что поле добавлено
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'consumables' 
AND table_schema = 'public'
ORDER BY ordinal_position;
