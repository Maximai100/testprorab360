-- SQL-скрипт для создания таблиц tools и consumables
-- Этап 4 миграции: перенос Инвентаря

-- Создание таблицы tools
CREATE TABLE IF NOT EXISTS public.tools (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    name text NOT NULL,
    category text,
    condition text,
    location text,
    notes text,
    image_url text,
    purchase_date timestamptz,
    purchase_price numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Создание таблицы consumables
CREATE TABLE IF NOT EXISTS public.consumables (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    name text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    unit text,
    location text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tools_user_id ON public.tools(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_project_id ON public.tools(project_id);
CREATE INDEX IF NOT EXISTS idx_consumables_user_id ON public.consumables(user_id);
CREATE INDEX IF NOT EXISTS idx_consumables_project_id ON public.consumables(project_id);

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER trigger_tools_updated_at
    BEFORE UPDATE ON public.tools
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_consumables_updated_at
    BEFORE UPDATE ON public.consumables
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Включение Row Level Security (RLS)
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;

-- Политики RLS для таблицы tools
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

-- Политики RLS для таблицы consumables
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
