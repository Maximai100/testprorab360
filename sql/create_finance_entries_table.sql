-- Создание таблицы finance_entries для хранения финансовых транзакций
-- Эта таблица будет использоваться для хранения доходов и расходов по проектам

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ FINANCE_ENTRIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.finance_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    amount numeric NOT NULL CHECK (amount >= 0),
    description text NOT NULL,
    date timestamptz NOT NULL DEFAULT now(),
    category text CHECK (category IN ('materials', 'labor', 'transport', 'tools_rental', 'other')),
    receipt_url text, -- URL чека или изображения
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_finance_entries_user_id ON public.finance_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_project_id ON public.finance_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_type ON public.finance_entries(type);
CREATE INDEX IF NOT EXISTS idx_finance_entries_date ON public.finance_entries(date);
CREATE INDEX IF NOT EXISTS idx_finance_entries_category ON public.finance_entries(category);
CREATE INDEX IF NOT EXISTS idx_finance_entries_receipt_url ON public.finance_entries(receipt_url) WHERE receipt_url IS NOT NULL;

-- =====================================================
-- ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- =====================================================

CREATE TRIGGER trigger_finance_entries_updated_at
    BEFORE UPDATE ON public.finance_entries
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- ВКЛЮЧЕНИЕ ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои финансовые записи
CREATE POLICY "Users can view their own finance entries" ON public.finance_entries
    FOR SELECT USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать только свои финансовые записи
CREATE POLICY "Users can insert their own finance entries" ON public.finance_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свои финансовые записи
CREATE POLICY "Users can update their own finance entries" ON public.finance_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Политика: пользователи могут удалять только свои финансовые записи
CREATE POLICY "Users can delete their own finance entries" ON public.finance_entries
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- КОММЕНТАРИИ К ПОЛЯМ
-- =====================================================

COMMENT ON TABLE public.finance_entries IS 'Таблица для хранения финансовых транзакций (доходы и расходы) по проектам';
COMMENT ON COLUMN public.finance_entries.type IS 'Тип транзакции: income (доход) или expense (расход)';
COMMENT ON COLUMN public.finance_entries.amount IS 'Сумма транзакции в рублях';
COMMENT ON COLUMN public.finance_entries.description IS 'Описание транзакции';
COMMENT ON COLUMN public.finance_entries.category IS 'Категория расхода (только для расходов)';
COMMENT ON COLUMN public.finance_entries.receipt_url IS 'URL чека или изображения, прикрепленного к финансовой транзакции';
