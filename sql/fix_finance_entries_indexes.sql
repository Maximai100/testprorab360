-- Исправление проблем с индексами в таблице finance_entries
-- Удаляем проблемные индексы, которые могут вызывать ошибку "index row requires 55584 bytes"

-- Удаляем индексы, которые могут быть проблемными
DROP INDEX IF EXISTS idx_finance_entries_receipt_url;
DROP INDEX IF EXISTS idx_finance_entries_description;

-- Создаем более безопасные индексы
-- Индекс на receipt_url только для коротких URL (до 100 символов)
CREATE INDEX IF NOT EXISTS idx_finance_entries_receipt_url_short 
ON public.finance_entries(receipt_url) 
WHERE receipt_url IS NOT NULL AND length(receipt_url) < 100;

-- Индекс на description только для коротких описаний (до 200 символов)
CREATE INDEX IF NOT EXISTS idx_finance_entries_description_short 
ON public.finance_entries(description) 
WHERE length(description) < 200;

-- Оставляем только безопасные индексы на коротких полях
-- (остальные индексы из create_finance_entries_table.sql должны остаться)
