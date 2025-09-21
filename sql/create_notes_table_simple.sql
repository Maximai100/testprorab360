-- Простой SQL-скрипт для создания таблицы notes
-- Универсальная система заметок

-- Создание таблицы notes
CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL DEFAULT '',
    context text NOT NULL CHECK (context IN ('global', 'project', 'inventory_tools', 'inventory_consumables')),
    entity_id uuid, -- NULLABLE, для projectId в контексте 'project'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Уникальный индекс по (user_id, context, entity_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_note_context_entity 
ON public.notes (user_id, context, (COALESCE(entity_id, '00000000-0000-0000-0000-000000000000')));

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
CREATE TRIGGER trigger_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Включение RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);
