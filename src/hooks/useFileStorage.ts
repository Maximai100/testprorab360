import { useState } from 'react';
import { supabase } from '../supabaseClient';

export interface FileUploadResult {
  publicUrl: string;
  path: string;
  error?: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  project_id?: string;
  name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoReportRecord {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  photos: Array<{
    url: string;
    path: string;
    caption: string;
  }>;
  date: string;
  created_at: string;
  updated_at: string;
}

export const useFileStorage = () => {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Загружает файл в Supabase Storage
   * @param bucketName - имя бакета ('documents' или 'photos')
   * @param file - файл для загрузки
   * @returns результат загрузки с публичным URL и путем
   */
  const uploadFile = async (bucketName: string, file: File): Promise<FileUploadResult> => {
    try {
      setIsUploading(true);

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Загружаем файл в Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Ошибка загрузки файла:', error);
        return { publicUrl: '', path: '', error: error.message };
      }

      // Получаем публичный URL
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return {
        publicUrl: publicData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      return { 
        publicUrl: '', 
        path: '', 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Создает запись документа в базе данных
   * @param name - название документа
   * @param file_url - URL файла
   * @param storage_path - путь к файлу в Storage
   * @param project_id - ID проекта (null для глобальных документов)
   * @returns созданная запись или ошибка
   */
  const createDocument = async (
    name: string,
    file_url: string,
    storage_path: string,
    project_id: string | null // project_id теперь явный параметр
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        project_id: project_id, // Используем явный параметр
        name: name,
        file_url: file_url,
        storage_path: storage_path,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании записи о документе:', error);
      throw error;
    }

    return data;
  };

  /**
   * Создает запись фотоотчета в базе данных
   * @param photoReportData - данные фотоотчета
   * @returns созданная запись или ошибка
   */
  const createPhotoReport = async (photoReportData: {
    project_id: string;
    title: string;
    photos: Array<{
      url: string;
      path: string;
      caption: string;
    }>;
    date?: string;
  }) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Ошибка получения пользователя:', authError);
        throw new Error(`Ошибка авторизации: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      console.log('🔧 Создание фотоотчета для пользователя:', user.id);

      const { data, error } = await supabase
        .from('photoreports')
        .insert({
          user_id: user.id,
          project_id: photoReportData.project_id,
          title: photoReportData.title,
          photos: photoReportData.photos,
          date: photoReportData.date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания фотоотчета:', error);
        throw error;
      }

      return data as PhotoReportRecord;
    } catch (error) {
      console.error('Ошибка при создании фотоотчета:', error);
      throw error;
    }
  };

  /**
   * Получает документы пользователя
   * @param projectId - опциональный ID проекта для фильтрации
   * @returns список документов
   */
  const getDocuments = async (projectId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Ошибка получения документов:', error);
        throw error;
      }

      return data as DocumentRecord[];
    } catch (error) {
      console.error('Ошибка при получении документов:', error);
      throw error;
    }
  };

  /**
   * Получает фотоотчеты проекта
   * @param projectId - ID проекта
   * @returns список фотоотчетов
   */
  const getPhotoReports = async (projectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data, error } = await supabase
        .from('photoreports')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Ошибка получения фотоотчетов:', error);
        throw error;
      }

      return data as PhotoReportRecord[];
    } catch (error) {
      console.error('Ошибка при получении фотоотчетов:', error);
      throw error;
    }
  };

  /**
   * Удаляет документ из базы данных и Storage
   * @param documentId - ID документа
   * @returns результат удаления
   */
  const deleteDocument = async (documentId: string) => {
    try {
      // Сначала получаем информацию о документе
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Удаляем файл из Storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path]);

      if (storageError) {
        console.warn('Ошибка удаления файла из Storage:', storageError);
      }

      // Удаляем запись из базы данных
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      return true;
    } catch (error) {
      console.error('Ошибка при удалении документа:', error);
      throw error;
    }
  };

  /**
   * Удаляет фотоотчет из базы данных и все связанные файлы из Storage
   * @param photoReportId - ID фотоотчета
   * @returns результат удаления
   */
  const deletePhotoReport = async (photoReportId: string) => {
    try {
      // Сначала получаем информацию о фотоотчете
      const { data: photoReport, error: fetchError } = await supabase
        .from('photoreports')
        .select('photos')
        .eq('id', photoReportId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Удаляем все фотографии из Storage
      const pathsToDelete = photoReport.photos.map((photo: any) => photo.path);
      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove(pathsToDelete);

        if (storageError) {
          console.warn('Ошибка удаления фотографий из Storage:', storageError);
        }
      }

      // Удаляем запись из базы данных
      const { error: dbError } = await supabase
        .from('photoreports')
        .delete()
        .eq('id', photoReportId);

      if (dbError) {
        throw dbError;
      }

      return true;
    } catch (error) {
      console.error('Ошибка при удалении фотоотчета:', error);
      throw error;
    }
  };

  return {
    isUploading,
    uploadFile,
    createDocument,
    createPhotoReport,
    getDocuments,
    getPhotoReports,
    deleteDocument,
    deletePhotoReport,
  };
};
