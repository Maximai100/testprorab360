-- Этап 5 миграции: Создание таблицы tasks
-- Таблица для хранения задач с разделением на общие задачи и задачи проекта

-- Создание таблицы tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL CHECK (length(trim(title)) > 0),
    is_completed boolean DEFAULT false NOT NULL,
    priority text DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags text[] DEFAULT '{}' NOT NULL,
    due_date timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_project ON public.tasks(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON public.tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Включение Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: Пользователь может видеть только свои задачи
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Политика INSERT: Пользователь может создавать задачи только для себя
-- и только в свои проекты (или без проекта)
CREATE POLICY "Users can create tasks for themselves" ON public.tasks
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        (
            project_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_id AND user_id = auth.uid()
            )
        )
    );

-- Политика UPDATE: Пользователь может обновлять только свои задачи
-- и не может сменить project_id на чужой проект
CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id AND
        (
            project_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_id AND user_id = auth.uid()
            )
        )
    );

-- Политика DELETE: Пользователь может удалять только свои задачи
CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Комментарии для документации
COMMENT ON TABLE public.tasks IS 'Таблица задач с разделением на общие задачи и задачи проекта';
COMMENT ON COLUMN public.tasks.id IS 'Уникальный идентификатор задачи';
COMMENT ON COLUMN public.tasks.user_id IS 'Идентификатор пользователя-владельца задачи';
COMMENT ON COLUMN public.tasks.project_id IS 'Идентификатор проекта (NULL для общих задач)';
COMMENT ON COLUMN public.tasks.title IS 'Название задачи (обязательное поле)';
COMMENT ON COLUMN public.tasks.is_completed IS 'Статус выполнения задачи';
COMMENT ON COLUMN public.tasks.priority IS 'Приоритет задачи: low, medium, high, urgent';
COMMENT ON COLUMN public.tasks.tags IS 'Массив тегов для категоризации задач';
COMMENT ON COLUMN public.tasks.due_date IS 'Дата и время выполнения задачи';
COMMENT ON COLUMN public.tasks.created_at IS 'Дата и время создания задачи';
COMMENT ON COLUMN public.tasks.updated_at IS 'Дата и время последнего обновления задачи';
