-- Скрипт миграции существующих таблиц инвентаря
-- Выполните этот скрипт, если таблицы tools и consumables уже существуют
-- Добавляет недостающие поля и улучшения

-- =====================================================
-- МИГРАЦИЯ ТАБЛИЦЫ TOOLS
-- =====================================================

-- Добавляем CHECK ограничения для поля condition
DO $$
BEGIN
    -- Проверяем, есть ли уже ограничение
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'tools_condition_check'
    ) THEN
        ALTER TABLE public.tools 
        ADD CONSTRAINT tools_condition_check 
        CHECK (condition IN ('excellent', 'good', 'needs_service'));
        RAISE NOTICE 'Добавлено ограничение для поля condition в таблице tools';
    ELSE
        RAISE NOTICE 'Ограничение для поля condition уже существует в таблице tools';
    END IF;
END $$;

-- Добавляем CHECK ограничения для поля location
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'tools_location_check'
    ) THEN
        ALTER TABLE public.tools 
        ADD CONSTRAINT tools_location_check 
        CHECK (location IN ('on_base', 'in_repair') OR location LIKE 'project_%');
        RAISE NOTICE 'Добавлено ограничение для поля location в таблице tools';
    ELSE
        RAISE NOTICE 'Ограничение для поля location уже существует в таблице tools';
    END IF;
END $$;

-- Добавляем CHECK ограничения для поля purchase_price
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'tools_purchase_price_check'
    ) THEN
        ALTER TABLE public.tools 
        ADD CONSTRAINT tools_purchase_price_check 
        CHECK (purchase_price >= 0);
        RAISE NOTICE 'Добавлено ограничение для поля purchase_price в таблице tools';
    ELSE
        RAISE NOTICE 'Ограничение для поля purchase_price уже существует в таблице tools';
    END IF;
END $$;

-- =====================================================
-- МИГРАЦИЯ ТАБЛИЦЫ CONSUMABLES
-- =====================================================

-- Добавляем CHECK ограничения для поля quantity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'consumables_quantity_check'
    ) THEN
        ALTER TABLE public.consumables 
        ADD CONSTRAINT consumables_quantity_check 
        CHECK (quantity >= 0);
        RAISE NOTICE 'Добавлено ограничение для поля quantity в таблице consumables';
    ELSE
        RAISE NOTICE 'Ограничение для поля quantity уже существует в таблице consumables';
    END IF;
END $$;

-- Добавляем CHECK ограничения для поля location
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'consumables_location_check'
    ) THEN
        ALTER TABLE public.consumables 
        ADD CONSTRAINT consumables_location_check 
        CHECK (location IN ('on_base', 'on_project', 'to_buy'));
        RAISE NOTICE 'Добавлено ограничение для поля location в таблице consumables';
    ELSE
        RAISE NOTICE 'Ограничение для поля location уже существует в таблице consumables';
    END IF;
END $$;

-- =====================================================
-- ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ИНДЕКСОВ
-- =====================================================

-- Индексы для таблицы tools
CREATE INDEX IF NOT EXISTS idx_tools_location ON public.tools(location);
CREATE INDEX IF NOT EXISTS idx_tools_condition ON public.tools(condition);

-- Индексы для таблицы consumables
CREATE INDEX IF NOT EXISTS idx_consumables_location ON public.consumables(location);

-- =====================================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ДАННЫХ
-- =====================================================

-- Обновляем существующие записи consumables, устанавливая location = 'on_base' если NULL
UPDATE public.consumables 
SET location = 'on_base' 
WHERE location IS NULL;

-- Обновляем существующие записи tools, устанавливая condition = 'good' если NULL
UPDATE public.tools 
SET condition = 'good' 
WHERE condition IS NULL;

-- =====================================================
-- ДОБАВЛЕНИЕ КОММЕНТАРИЕВ
-- =====================================================

-- Комментарии для таблицы tools
COMMENT ON TABLE public.tools IS 'Таблица инструментов пользователей';
COMMENT ON COLUMN public.tools.condition IS 'Состояние инструмента: excellent (отличное), good (хорошее), needs_service (требует обслуживания)';
COMMENT ON COLUMN public.tools.location IS 'Местоположение инструмента: on_base (на базе), in_repair (в ремонте), или project_<id> (на проекте)';
COMMENT ON COLUMN public.tools.image_url IS 'URL изображения инструмента (может быть локальным или внешним)';
COMMENT ON COLUMN public.tools.purchase_price IS 'Цена покупки инструмента (должна быть >= 0)';

-- Комментарии для таблицы consumables
COMMENT ON TABLE public.consumables IS 'Таблица расходников пользователей';
COMMENT ON COLUMN public.consumables.location IS 'Местоположение расходника: on_base (на базе), on_project (на проекте), to_buy (купить)';
COMMENT ON COLUMN public.consumables.quantity IS 'Количество расходника (должно быть >= 0)';

-- =====================================================
-- ПРОВЕРКА МИГРАЦИИ
-- =====================================================

-- Показываем все ограничения
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('tools', 'consumables')
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Показываем все индексы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('tools', 'consumables')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Показываем статистику по таблицам
SELECT 
    'tools' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location,
    COUNT(CASE WHEN condition IS NOT NULL THEN 1 END) as with_condition,
    COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as with_image
FROM public.tools
UNION ALL
SELECT 
    'consumables' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location,
    NULL as with_condition,
    NULL as with_image
FROM public.consumables;
