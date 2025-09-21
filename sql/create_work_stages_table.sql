-- Создание таблицы work_stages для хранения этапов работ по проектам
-- Эта таблица будет использоваться для планирования и отслеживания прогресса выполнения работ

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ WORK_STAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.work_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    start_date timestamptz,
    end_date timestamptz,
    status text CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    progress numeric CHECK (progress >= 0 AND progress <= 100),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_work_stages_user_id ON public.work_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_work_stages_project_id ON public.work_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_work_stages_status ON public.work_stages(status);
CREATE INDEX IF NOT EXISTS idx_work_stages_start_date ON public.work_stages(start_date);
CREATE INDEX IF NOT EXISTS idx_work_stages_end_date ON public.work_stages(end_date);
CREATE INDEX IF NOT EXISTS idx_work_stages_progress ON public.work_stages(progress);

-- =====================================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- =====================================================

CREATE TRIGGER trigger_work_stages_updated_at
    BEFORE UPDATE ON public.work_stages
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- ВКЛЮЧЕНИЕ ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.work_stages ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои этапы работ
CREATE POLICY "Users can view their own work stages" ON public.work_stages
    FOR SELECT USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать только свои этапы работ
CREATE POLICY "Users can insert their own work stages" ON public.work_stages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свои этапы работ
CREATE POLICY "Users can update their own work stages" ON public.work_stages
    FOR UPDATE USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять только свои этапы работ
CREATE POLICY "Users can delete their own work stages" ON public.work_stages
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- КОММЕНТАРИИ К ПОЛЯМ
-- =====================================================

COMMENT ON TABLE public.work_stages IS 'Таблица для хранения этапов работ по проектам';
COMMENT ON COLUMN public.work_stages.title IS 'Название этапа работ';
COMMENT ON COLUMN public.work_stages.description IS 'Подробное описание этапа работ';
COMMENT ON COLUMN public.work_stages.start_date IS 'Дата начала этапа работ';
COMMENT ON COLUMN public.work_stages.end_date IS 'Планируемая дата завершения этапа работ';
COMMENT ON COLUMN public.work_stages.status IS 'Статус этапа: planned (запланирован), in_progress (в работе), completed (завершен), cancelled (отменен)';
COMMENT ON COLUMN public.work_stages.progress IS 'Процент выполнения этапа (от 0 до 100)';
