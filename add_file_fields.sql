-- Добавление полей для файлов в таблицы finance_entries и tools
-- Этот скрипт добавляет поддержку прикрепления чеков к финансовым транзакциям
-- и изображений к инструментам

-- ВНИМАНИЕ: Перед выполнением этого скрипта убедитесь, что таблицы finance_entries и tools существуют!
-- Если таблица finance_entries не существует, сначала выполните create_finance_entries_table.sql
-- Если таблица tools не существует, сначала выполните create_inventory_tables_complete.sql

-- Проверяем существование таблиц и добавляем поля только если они существуют
DO $$
BEGIN
    -- Проверяем существование таблицы finance_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finance_entries') THEN
        -- Добавляем поле для URL чека в таблицу финансовых записей
        ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS receipt_url TEXT;
        
        -- Добавляем комментарий к полю
        COMMENT ON COLUMN public.finance_entries.receipt_url IS 'URL чека или изображения, прикрепленного к финансовой транзакции';
        
        -- Создаем индекс для оптимизации поиска
        CREATE INDEX IF NOT EXISTS idx_finance_entries_receipt_url ON public.finance_entries(receipt_url) WHERE receipt_url IS NOT NULL;
        
        RAISE NOTICE 'Поле receipt_url добавлено в таблицу finance_entries';
    ELSE
        RAISE WARNING 'Таблица finance_entries не существует! Сначала выполните create_finance_entries_table.sql';
    END IF;
    
    -- Проверяем существование таблицы tools
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tools') THEN
        -- Добавляем поле для URL изображения в таблицу инструментов
        ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS image_url TEXT;
        
        -- Добавляем комментарий к полю
        COMMENT ON COLUMN public.tools.image_url IS 'URL изображения инструмента';
        
        -- Создаем индекс для оптимизации поиска
        CREATE INDEX IF NOT EXISTS idx_tools_image_url ON public.tools(image_url) WHERE image_url IS NOT NULL;
        
        RAISE NOTICE 'Поле image_url добавлено в таблицу tools';
    ELSE
        RAISE WARNING 'Таблица tools не существует! Сначала выполните create_inventory_tables_complete.sql';
    END IF;
END $$;
