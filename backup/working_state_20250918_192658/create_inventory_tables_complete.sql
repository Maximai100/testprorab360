-- ПОЛНЫЙ СКРИПТ ДЛЯ СОЗДАНИЯ ТАБЛИЦ ИНВЕНТАРЯ В SUPABASE
-- Выполните этот скрипт в Supabase SQL Editor после удаления таблиц

-- =====================================================
-- СОЗДАНИЕ ФУНКЦИИ handle_updated_at (если не существует)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦ
-- =====================================================

-- Создание таблицы tools (инструменты)
CREATE TABLE public.tools (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    name text NOT NULL,
    category text,
    condition text CHECK (condition IN ('excellent', 'good', 'needs_service')),
    location text CHECK (location IN ('on_base', 'in_repair') OR location LIKE 'project_%'),
    notes text,
    image_url text,
    purchase_date timestamptz,
    purchase_price numeric CHECK (purchase_price >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Создание таблицы consumables (расходники)
CREATE TABLE public.consumables (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    name text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit text,
    location text CHECK (location IN ('on_base', 'on_project', 'to_buy')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================

-- Индексы для таблицы tools
CREATE INDEX idx_tools_user_id ON public.tools(user_id);
CREATE INDEX idx_tools_project_id ON public.tools(project_id);
CREATE INDEX idx_tools_location ON public.tools(location);
CREATE INDEX idx_tools_condition ON public.tools(condition);

-- Индексы для таблицы consumables
CREATE INDEX idx_consumables_user_id ON public.consumables(user_id);
CREATE INDEX idx_consumables_project_id ON public.consumables(project_id);
CREATE INDEX idx_consumables_location ON public.consumables(location);

-- =====================================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- =====================================================

-- Триггер для таблицы tools
CREATE TRIGGER trigger_tools_updated_at
    BEFORE UPDATE ON public.tools
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Триггер для таблицы consumables
CREATE TRIGGER trigger_consumables_updated_at
    BEFORE UPDATE ON public.consumables
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Включение RLS для обеих таблиц
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ПОЛИТИКИ RLS ДЛЯ ТАБЛИЦЫ TOOLS
-- =====================================================

-- SELECT политика
CREATE POLICY "Users can view their own tools" ON public.tools
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT политика
CREATE POLICY "Users can insert their own tools" ON public.tools
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE политика
CREATE POLICY "Users can update their own tools" ON public.tools
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE политика
CREATE POLICY "Users can delete their own tools" ON public.tools
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- ПОЛИТИКИ RLS ДЛЯ ТАБЛИЦЫ CONSUMABLES
-- =====================================================

-- SELECT политика
CREATE POLICY "Users can view their own consumables" ON public.consumables
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT политика
CREATE POLICY "Users can insert their own consumables" ON public.consumables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE политика
CREATE POLICY "Users can update their own consumables" ON public.consumables
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE политика
CREATE POLICY "Users can delete their own consumables" ON public.consumables
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- КОММЕНТАРИИ К ПОЛЯМ
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
-- ПРОВЕРКА СОЗДАНИЯ ТАБЛИЦ
-- =====================================================

-- Проверяем, что таблицы созданы
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tools' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Таблица tools создана успешно';
    ELSE
        RAISE EXCEPTION '❌ Ошибка: таблица tools не создана';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consumables' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Таблица consumables создана успешно';
    ELSE
        RAISE EXCEPTION '❌ Ошибка: таблица consumables не создана';
    END IF;
END $$;

-- Показываем структуру созданных таблиц
SELECT 
    'tools' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'tools' AND table_schema = 'public'
UNION ALL
SELECT 
    'consumables' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'consumables' AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

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

-- Показываем все политики RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('tools', 'consumables')
AND schemaname = 'public'
ORDER BY tablename, policyname;
