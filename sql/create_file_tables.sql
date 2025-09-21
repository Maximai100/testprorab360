-- Создание таблиц для работы с файлами
-- Таблица documents для хранения документов
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица photoreports для хранения фотоотчетов
CREATE TABLE IF NOT EXISTS photoreports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    photos JSONB[] NOT NULL DEFAULT '{}',
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_photoreports_user_id ON photoreports(user_id);
CREATE INDEX IF NOT EXISTS idx_photoreports_project_id ON photoreports(project_id);
CREATE INDEX IF NOT EXISTS idx_photoreports_date ON photoreports(date);
CREATE INDEX IF NOT EXISTS idx_photoreports_created_at ON photoreports(created_at);

-- Триггер для обновления updated_at в таблице documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Триггер для обновления updated_at в таблице photoreports
CREATE OR REPLACE FUNCTION update_photoreports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_photoreports_updated_at
    BEFORE UPDATE ON photoreports
    FOR EACH ROW
    EXECUTE FUNCTION update_photoreports_updated_at();

-- Настройка RLS для таблицы documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Политика RLS для documents: пользователи могут видеть только свои документы
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);

-- Политика RLS для documents: пользователи могут создавать документы
CREATE POLICY "Users can create documents" ON documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика RLS для documents: пользователи могут обновлять свои документы
CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid() = user_id);

-- Политика RLS для documents: пользователи могут удалять свои документы
CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (auth.uid() = user_id);

-- Настройка RLS для таблицы photoreports
ALTER TABLE photoreports ENABLE ROW LEVEL SECURITY;

-- Политика RLS для photoreports: пользователи могут видеть только свои фотоотчеты
CREATE POLICY "Users can view their own photoreports" ON photoreports
    FOR SELECT USING (auth.uid() = user_id);

-- Политика RLS для photoreports: пользователи могут создавать фотоотчеты
CREATE POLICY "Users can create photoreports" ON photoreports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика RLS для photoreports: пользователи могут обновлять свои фотоотчеты
CREATE POLICY "Users can update their own photoreports" ON photoreports
    FOR UPDATE USING (auth.uid() = user_id);

-- Политика RLS для photoreports: пользователи могут удалять свои фотоотчеты
CREATE POLICY "Users can delete their own photoreports" ON photoreports
    FOR DELETE USING (auth.uid() = user_id);

-- Комментарии к таблицам
COMMENT ON TABLE documents IS 'Таблица для хранения документов проектов';
COMMENT ON COLUMN documents.name IS 'Название документа';
COMMENT ON COLUMN documents.file_url IS 'Публичный URL файла в Supabase Storage';
COMMENT ON COLUMN documents.storage_path IS 'Путь к файлу в бакете Storage';

COMMENT ON TABLE photoreports IS 'Таблица для хранения фотоотчетов проектов';
COMMENT ON COLUMN photoreports.title IS 'Заголовок фотоотчета';
COMMENT ON COLUMN photoreports.photos IS 'Массив объектов с информацией о фотографиях: {url, path, caption}';
COMMENT ON COLUMN photoreports.date IS 'Дата фотоотчета';
