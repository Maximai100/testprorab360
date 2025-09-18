-- SQL-скрипт для создания универсальной таблицы заметок
-- Выполните этот скрипт в Supabase SQL Editor

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ NOTES
-- =====================================================

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL DEFAULT '',
    context text NOT NULL CHECK (context IN ('global', 'project', 'inventory_tools', 'inventory_consumables')),
    entity_id uuid NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================

-- Уникальный индекс для предотвращения дублирования заметок
CREATE UNIQUE INDEX idx_notes_user_context_entity 
ON public.notes(user_id, context, entity_id);

-- Индексы для оптимизации запросов
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_context ON public.notes(context);
CREATE INDEX idx_notes_entity_id ON public.notes(entity_id);

-- =====================================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- =====================================================

CREATE TRIGGER trigger_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Включение RLS для таблицы notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ПОЛИТИКИ RLS ДЛЯ ТАБЛИЦЫ NOTES
-- =====================================================

-- SELECT политика
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

-- INSERT политика
CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE политика
CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

-- DELETE политика
CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- КОММЕНТАРИИ К ПОЛЯМ
-- =====================================================

COMMENT ON TABLE public.notes IS 'Универсальная таблица заметок для всех блокнотов в приложении';
COMMENT ON COLUMN public.notes.content IS 'Содержимое заметки (текст блокнота)';
COMMENT ON COLUMN public.notes.context IS 'Контекст заметки: global, project, inventory_tools, inventory_consumables';
COMMENT ON COLUMN public.notes.entity_id IS 'ID связанной сущности (например, project_id для контекста project)';

-- =====================================================
-- ПРОВЕРКА СОЗДАНИЯ ТАБЛИЦЫ
-- =====================================================

-- Проверяем, что таблица создана
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Таблица notes создана успешно';
    ELSE
        RAISE EXCEPTION '❌ Ошибка: таблица notes не создана';
    END IF;
    
    RAISE NOTICE '🎉 Универсальная система заметок готова к работе!';
END $$;

-- Показываем структуру созданной таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notes' AND table_schema = 'public'
ORDER BY ordinal_position;
