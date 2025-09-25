import { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { CompanyProfile } from '../types';
import { useFileStorage } from './useFileStorage';

export const useCompanyProfile = (session: Session | null) => {
  const [profile, setProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
  const [loading, setLoading] = useState(false);
  const { uploadFileWithFallback } = useFileStorage();

  const mapRowToProfile = (row: any): CompanyProfile => ({
    name: row?.name || '',
    details: row?.details || '',
    logo: row?.logo_url || null,
  });

  const fetchProfile = useCallback(async (sess: Session | null = session, retryCount = 0) => {
    if (!sess?.user?.id) {

      setProfile({ name: '', details: '', logo: null });
      return;
    }

    setLoading(true);
    try {
      // Добавляем задержку перед запросом (следуем SUPABASE_SAFETY_GUIDE)
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
      
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', sess.user.id)
        .maybeSingle();
      
      if (error) {
        console.error('🔧 useCompanyProfile.fetchProfile error:', error);
        
        // Retry логика для ошибок подключения (следуем SUPABASE_SAFETY_GUIDE)
        if (retryCount < 2 && error.message.includes('Database connection error')) {

          setTimeout(() => {
            fetchProfile(sess, retryCount + 1);
          }, 2000 * (retryCount + 1));
          return;
        }
        
        return;
      }

      if (data) {
        const mappedProfile = mapRowToProfile(data);

        setProfile(mappedProfile);
      } else {

      }
    } catch (error) {
      console.error('🔧 useCompanyProfile.fetchProfile: Критическая ошибка:', error);
      // Показываем пустые данные вместо краха
      setProfile({ name: '', details: '', logo: null });
    } finally {
      setLoading(false);
    }
  }, [session]);

  const saveProfile = useCallback(async (data: Partial<CompanyProfile>, retryCount = 0) => {
    if (!session?.user?.id) {

      return;
    }

    setLoading(true);
    try {
      // Добавляем задержку перед запросом (следуем SUPABASE_SAFETY_GUIDE)
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
      
      const row = {
        id: undefined as string | undefined, // let DB default/keep existing
        user_id: session.user.id,
        name: data.name ?? profile.name,
        details: data.details ?? profile.details,
        logo_url: data.logo === undefined ? profile.logo : data.logo,
        updated_at: new Date().toISOString(),
      } as any;

      const { data: upserted, error } = await supabase
        .from('company_profiles')
        .upsert(row, { onConflict: 'user_id' })
        .select('*')
        .single();
      
      if (error) {
        console.error('🔧 useCompanyProfile.saveProfile error:', error);
        
        // Retry логика для ошибок подключения (следуем SUPABASE_SAFETY_GUIDE)
        if (retryCount < 2 && error.message.includes('Database connection error')) {

          setTimeout(() => {
            saveProfile(data, retryCount + 1);
          }, 2000 * (retryCount + 1));
          return;
        }
        
        return;
      }

      const mappedProfile = mapRowToProfile(upserted);

      setProfile(mappedProfile);
    } catch (error) {
      console.error('🔧 useCompanyProfile.saveProfile: Критическая ошибка:', error);
      // Не обновляем состояние при ошибке
    } finally {
      setLoading(false);
    }
  }, [session, profile]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!session?.user?.id) return;

    try {
      // Используем ТОЧНО ТУ ЖЕ логику, что и в фотоотчетах
      const uploadResult = await uploadFileWithFallback('logos', file);
      
      if (uploadResult.error) {
        throw new Error(`Ошибка загрузки логотипа "${file.name}": ${uploadResult.error}`);
      }

      // Сохраняем профиль с новым логотипом
      await saveProfile({ logo: uploadResult.publicUrl });

    } catch (error) {
      console.error('🔧 uploadLogo: Критическая ошибка при загрузке логотипа:', error);
    }
  }, [session, saveProfile, uploadFileWithFallback]);

  const removeLogo = useCallback(async () => {
    await saveProfile({ logo: null });
  }, [saveProfile]);

  // Диагностическая функция для проверки логотипа
  const diagnoseLogo = useCallback(async () => {

    if (profile.logo) {

      // Проверяем тип URL
      if (profile.logo.includes('multipart') || profile.logo.includes('form-data')) {
        console.error('❌ URL содержит multipart/form-data - это неправильный URL!');
        console.error('❌ Нужно использовать getPublicUrl() для получения изображения');
        return;
      }
      
      try {
        // Проверяем доступность изображения
        const img = new Image();
        img.onload = () => {
          console.log('✅ Логотип загружается успешно!');
          console.log('✅ Размеры:', img.width, 'x', img.height);
        };
        img.onerror = (error) => {
          console.error('❌ Ошибка загрузки логотипа:', error);
          console.error('❌ URL недоступен:', profile.logo);
        };
        img.src = profile.logo;
        
        // Также проверяем через fetch
        try {
          const response = await fetch(profile.logo, { method: 'HEAD' });

          console.log('🔍 Content-Type:', response.headers.get('content-type'));
          
          if (response.status === 200) {
            console.log('✅ Логотип доступен по HTTP');
          } else if (response.status === 544) {
            console.error('❌ DatabaseTimeout - таймаут подключения к базе данных');
            console.error('📋 Это временная проблема с Supabase Storage');
            console.error('📋 Попробуйте обновить страницу через несколько секунд');
          } else {
            console.error('❌ Логотип недоступен, статус:', response.status);
          }
        } catch (fetchError) {
          console.error('❌ Ошибка fetch логотипа:', fetchError);
          if (fetchError.message.includes('timeout') || fetchError.message.includes('DatabaseTimeout')) {
            console.error('📋 Возможно, проблема с таймаутом базы данных');
          }
        }
      } catch (error) {
        console.error('❌ Критическая ошибка при проверке логотипа:', error);
      }
    } else {

    }
  }, [profile]);

  // Диагностическая функция для проверки Supabase Storage
  const diagnoseStorage = useCallback(async () => {

    if (!session?.user?.id) {
      console.error('❌ Нет сессии пользователя');
      return;
    }
    
    try {
      // 1. Проверяем конфигурацию Supabase

      console.log('🔍 Supabase Key:', supabase.supabaseKey?.substring(0, 20) + '...');
      
      // 2. Проверяем доступность bucket "logos" с принудительным обновлением

      // Попробуем несколько способов получения buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Ошибка получения списка buckets:', bucketsError);
        console.error('❌ Код ошибки:', bucketsError.statusCode);
        console.error('❌ Сообщение:', bucketsError.message);
        
        // Попробуем альтернативный способ

        try {
          const { data: testData, error: testError } = await supabase.storage.from('logos').list('', { limit: 1 });
          if (testError) {
            console.error('❌ Альтернативный способ тоже не работает:', testError);
          } else {
            console.log('✅ Bucket "logos" доступен через альтернативный способ!');
            console.log('✅ Тестовые данные:', testData);
          }
        } catch (altError) {
          console.error('❌ Критическая ошибка альтернативного способа:', altError);
        }
        return;
      }

      const logosBucket = buckets.find(bucket => bucket.name === 'logos');
      
      if (!logosBucket) {
        console.error('❌ Bucket "logos" не найден в списке!');
        console.error('📋 Доступные buckets:', buckets.map(b => b.name));
        console.error('📋 Для решения проблемы:');
        console.error('1. Убедитесь, что bucket "logos" создан в Supabase Dashboard');
        console.error('2. Проверьте, что bucket публичный');
        console.error('3. Обновите страницу и попробуйте снова');
        
        // Попробуем проверить доступ к bucket напрямую

        try {
          const { data: directData, error: directError } = await supabase.storage.from('logos').list('', { limit: 1 });
          if (directError) {
            console.error('❌ Прямой доступ к bucket "logos" не работает:', directError);
          } else {
            console.log('✅ Прямой доступ к bucket "logos" работает!');
            console.log('✅ Данные:', directData);
          }
        } catch (directErr) {
          console.error('❌ Критическая ошибка прямого доступа:', directErr);
        }
        return;
      }
      
      console.log('✅ Bucket "logos" найден:', logosBucket);
      
      // 2. Проверяем файлы в bucket

      const { data: files, error: filesError } = await supabase.storage
        .from('logos')
        .list(session.user.id);
      
      if (filesError) {
        console.error('❌ Ошибка получения списка файлов:', filesError);
        return;
      }

      // 3. Проверяем конкретный файл
      if (profile.logo) {
        const urlParts = profile.logo.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const userFolder = urlParts[urlParts.length - 2];

        const { data: fileData, error: fileError } = await supabase.storage
          .from('logos')
          .download(`${userFolder}/${fileName}`);
        
        if (fileError) {
          console.error('❌ Ошибка загрузки файла:', fileError);
          console.error('❌ Файл не найден или недоступен');
        } else {
          console.log('✅ Файл найден и доступен!');
          console.log('✅ Размер файла:', fileData.size, 'байт');
        }
      }
      
    } catch (error) {
      console.error('❌ Критическая ошибка при диагностике Storage:', error);
    }
  }, [session, profile]);

  // Функция для принудительного обновления кеша Supabase
  const refreshSupabaseCache = useCallback(async () => {

    try {
      // Очищаем кеш браузера для Supabase
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const supabaseCaches = cacheNames.filter(name => name.includes('supabase'));
        for (const cacheName of supabaseCaches) {
          await caches.delete(cacheName);

        }
      }
      
      // Принудительно обновляем сессию
      const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Ошибка обновления сессии:', sessionError);
      } else {
        console.log('✅ Сессия обновлена');
      }
      
      // Принудительно проверяем доступ к bucket
      const { data: testData, error: testError } = await supabase.storage.from('logos').list('', { limit: 1 });
      if (testError) {
        console.error('❌ Bucket "logos" все еще недоступен:', testError);
      } else {
        console.log('✅ Bucket "logos" доступен после обновления кеша!');
      }
      
    } catch (error) {
      console.error('❌ Ошибка обновления кеша:', error);
    }
  }, []);

  // Функция для исправления неправильных URL логотипа
  const fixLogoUrl = useCallback(async () => {

    if (!profile.logo) {

      return;
    }
    
    // Проверяем, является ли URL неправильным
    if (profile.logo.includes('multipart') || profile.logo.includes('form-data')) {
      console.error('❌ Обнаружен неправильный URL с multipart/form-data');
      console.error('❌ Текущий URL:', profile.logo);
      
      // Извлекаем путь к файлу из URL
      const urlParts = profile.logo.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const userFolder = urlParts[urlParts.length - 2];

      // Получаем правильный URL
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(`${userFolder}/${fileName}`);
      const correctUrl = urlData.publicUrl;
      
      console.log('✅ Правильный URL:', correctUrl);
      
      // Проверяем доступность правильного URL
      try {
        const testResponse = await fetch(correctUrl, { method: 'HEAD' });

        
        if (testResponse.headers.get('content-type')?.includes('image/')) {
          console.log('✅ Правильный URL возвращает изображение');

          await saveProfile({ logo: correctUrl });
          console.log('✅ Профиль обновлен с правильным URL');
        } else {
          console.error('❌ Правильный URL тоже не возвращает изображение');
        }
      } catch (testError) {
        console.error('❌ Ошибка тестирования правильного URL:', testError);
      }
    } else {
      console.log('✅ URL логотипа выглядит правильно');
    }
  }, [profile, saveProfile]);

  return {
    profile,
    setProfile,
    loading,
    fetchProfile,
    saveProfile,
    uploadLogo,
    removeLogo,
    diagnoseLogo, // Диагностическая функция для логотипа
    diagnoseStorage, // Диагностическая функция для Storage
    refreshSupabaseCache, // Функция обновления кеша
    fixLogoUrl, // Функция исправления URL логотипа
  };
};

export default useCompanyProfile;

