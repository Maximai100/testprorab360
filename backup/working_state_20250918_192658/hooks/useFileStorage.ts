import { useState } from 'react';
import { supabase } from '../supabaseClient';

export interface FileUploadResult {
  publicUrl: string;
  path: string;
  error?: string;
  base64Data?: string; // Для base64 хранения
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
   * Конвертирует файл в base64 строку
   * @param file - файл для конвертации
   * @returns base64 строка
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Ошибка конвертации файла в base64'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Сжимает изображение для уменьшения размера файла
   * @param file - файл изображения
   * @param maxWidth - максимальная ширина
   * @param maxHeight - максимальная высота
   * @param quality - качество сжатия (0-1)
   * @returns сжатый файл
   */
  const compressImage = async (file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Рисуем изображение на canvas
        ctx?.drawImage(img, 0, 0, width, height);

        // Конвертируем в blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Создаем новый файл с тем же именем
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Ошибка сжатия изображения'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * Загружает файл с fallback на base64 хранение
   * @param bucketName - имя бакета ('documents' или 'photos')
   * @param file - файл для загрузки
   * @returns результат загрузки с публичным URL и путем
   */
  const uploadFileWithFallback = async (bucketName: string, file: File): Promise<FileUploadResult> => {
    try {
      // Сначала пробуем загрузить в Supabase Storage
      const storageResult = await uploadFile(bucketName, file);
      if (!storageResult.error) {
        return storageResult;
      }
      
      // Если ошибка, пробуем base64 fallback
      console.log('🔄 Fallback на base64 хранение для файла:', file.name);
      return await uploadFileAsBase64(file);
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      return await uploadFileAsBase64(file);
    }
  };

  /**
   * Загружает файл как base64 в базу данных
   * @param file - файл для загрузки
   * @returns результат загрузки с base64 данными
   */
  const uploadFileAsBase64 = async (file: File): Promise<FileUploadResult> => {
    try {
      console.log('🔧 Загружаем файл как base64:', file.name);
      
      // Сжимаем изображение если нужно
      let fileToProcess = file;
      if (file.type.startsWith('image/') && file.size > 1 * 1024 * 1024) {
        try {
          const isWhatsAppImage = file.name.toLowerCase().includes('whatsapp');
          const quality = isWhatsAppImage ? 0.4 : 0.6;
          const maxWidth = isWhatsAppImage ? 1024 : 1280;
          const maxHeight = isWhatsAppImage ? 576 : 720;
          
          fileToProcess = await compressImage(file, maxWidth, maxHeight, quality);
          console.log('🔧 Файл сжат для base64:', (fileToProcess.size / 1024).toFixed(2) + 'KB');
        } catch (compressError) {
          console.warn('Ошибка сжатия для base64:', compressError);
        }
      }
      
      // Конвертируем в base64
      const base64Data = await fileToBase64(fileToProcess);
      
      // Создаем уникальный ID для файла
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      
      return {
        publicUrl: base64Data,
        path: `base64://${fileId}`,
        base64Data: base64Data
      };
    } catch (error) {
      console.error('Ошибка при загрузке файла как base64:', error);
      return { 
        publicUrl: '', 
        path: '', 
        error: error instanceof Error ? error.message : 'Ошибка загрузки файла' 
      };
    }
  };

  /**
   * Загружает файл в Supabase Storage
   * @param bucketName - имя бакета ('documents' или 'photos')
   * @param file - файл для загрузки
   * @returns результат загрузки с публичным URL и путем
   */
  const uploadFile = async (bucketName: string, file: File): Promise<FileUploadResult> => {
    try {
      setIsUploading(true);

      let fileToUpload = file;

      // Если это изображение и оно больше 1MB, сжимаем его
      if (file.type.startsWith('image/') && file.size > 1 * 1024 * 1024) {
        console.log('🔧 Сжимаем изображение:', file.name, 'Размер до:', (file.size / 1024).toFixed(2) + 'KB');
        try {
          // Для чеков используем более агрессивное сжатие
          const isReceipt = bucketName === 'receipts';
          const isWhatsAppImage = file.name.toLowerCase().includes('whatsapp');
          
          let quality, maxWidth, maxHeight;
          
          if (isReceipt) {
            // Для чеков используем очень агрессивное сжатие
            quality = 0.4;
            maxWidth = 1024;
            maxHeight = 768;
          } else if (isWhatsAppImage) {
            quality = 0.5;
            maxWidth = 1280;
            maxHeight = 720;
          } else {
            quality = 0.6;
            maxWidth = 1600;
            maxHeight = 900;
          }
          
          fileToUpload = await compressImage(file, maxWidth, maxHeight, quality);
          console.log('🔧 Изображение сжато. Размер после:', (fileToUpload.size / 1024).toFixed(2) + 'KB');
        } catch (compressError) {
          console.warn('Ошибка сжатия изображения, загружаем оригинал:', compressError);
        }
      }

      // Проверяем размер файла (максимум 5MB для чеков, 10MB для остальных)
      const maxFileSize = bucketName === 'receipts' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (fileToUpload.size > maxFileSize) {
        const fileSizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = bucketName === 'receipts' ? '5MB' : '10MB';
        throw new Error(`Файл слишком большой: ${fileSizeMB}MB. Максимальный размер: ${maxSizeMB}`);
      }

      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated for file upload");

      // Генерируем уникальное имя файла
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Создаем путь в формате: user_id/имя_файла
      const filePath = `${user.id}/${fileName}`;

      console.log('🔧 Загрузка файла в путь:', filePath, 'Размер:', (fileToUpload.size / 1024).toFixed(2) + 'KB');

      // Загружаем файл в Storage с повторными попытками
      let uploadResult;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount <= maxRetries) {
        try {
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, fileToUpload, {
              cacheControl: '3600',
              upsert: false,
              contentType: fileToUpload.type || 'application/octet-stream'
            });

          if (error) {
            console.error(`Ошибка загрузки файла (попытка ${retryCount + 1}):`, error);
            
            // Если это ошибка сети или CORS, пробуем еще раз
            if ((error.message.includes('CORS') || error.message.includes('NetworkError') || error.message.includes('413')) && retryCount < maxRetries) {
              retryCount++;
              console.log(`Повторная попытка загрузки через 2 секунды... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            // Обрабатываем специфичные ошибки
            if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
              return { 
                publicUrl: '', 
                path: '', 
                error: 'Файл слишком большой. Максимальный размер: 10MB' 
              };
            }
            
            if (error.message.includes('CORS') || error.message.includes('NetworkError')) {
              return { 
                publicUrl: '', 
                path: '', 
                error: 'Ошибка сети. Проверьте подключение к интернету и попробуйте снова' 
              };
            }
            
            return { publicUrl: '', path: '', error: error.message };
          }

          uploadResult = { data, error: null };
          break;
        } catch (uploadError) {
          console.error(`Исключение при загрузке файла (попытка ${retryCount + 1}):`, uploadError);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Повторная попытка загрузки через 2 секунды... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          throw uploadError;
        }
      }

      if (!uploadResult) {
        throw new Error('Не удалось загрузить файл после всех попыток');
      }

      // Получаем публичный URL
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log('🔧 Файл успешно загружен:', { filePath, publicUrl: publicData.publicUrl });

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
    project_id: string | null
  ) => {
    console.log('🔧 createDocument вызвана с параметрами:', { name, file_url, storage_path, project_id });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }
    
    console.log('🔧 Пользователь авторизован:', user.id);

    const insertData = {
      user_id: user.id, // <-- Ключевое исправление
      project_id: project_id,
      name: name,
      file_url: file_url,
      storage_path: storage_path,
    };
    
    console.log('🔧 Данные для вставки:', insertData);

    const { data, error } = await supabase
      .from('documents')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании записи о документе:', error);
      throw error;
    }

    console.log("Запись о документе успешно создана:", data);
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
    uploadFileWithFallback,
    uploadFileAsBase64,
    compressImage,
    fileToBase64,
    createDocument,
    createPhotoReport,
    getDocuments,
    getPhotoReports,
    deleteDocument,
    deletePhotoReport,
  };
};
