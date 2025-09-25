import { useState, useCallback, useMemo, useEffect } from 'react';
import { Estimate, Item, LibraryItem, CalculationResults, EstimateStatus, EstimateTemplate } from '../types';
import { dataService } from '../services/storageService';
import { supabase } from '../supabaseClient';
import { generateNewEstimateNumber } from '../utils';
import type { Session } from '@supabase/supabase-js';

// Вспомогательная функция для преобразования данных из Supabase
const transformSupabaseData = (data: any[] | null) => {
  console.log('🔧 transformSupabaseData: входящие данные:', data);
  console.log('🔧 transformSupabaseData: количество смет:', data?.length || 0);
  
  const transformed = (data || []).map((estimate, index) => {
    console.log(`🔧 transformSupabaseData: обрабатываем смету ${index + 1}:`, estimate);
    console.log(`🔧 transformSupabaseData: estimate_items для сметы ${index + 1}:`, estimate.estimate_items);
    
    const transformedEstimate = {
      ...estimate,
      items: estimate.estimate_items || [],
      clientInfo: estimate.client_info || '',
      number: estimate.number || '',
      date: estimate.date || new Date().toISOString(),
      discountType: estimate.discount_type || 'percent',
      createdAt: estimate.created_at || new Date().toISOString(),
      updatedAt: estimate.updated_at || new Date().toISOString()
    };
    
    console.log(`🔧 transformSupabaseData: преобразованная смета ${index + 1}:`, transformedEstimate);
    console.log(`🔧 transformSupabaseData: items в преобразованной смете ${index + 1}:`, transformedEstimate.items);
    
    return transformedEstimate;
  });
  
  console.log('🔧 transformSupabaseData: все преобразованные данные:', transformed);
  return transformed;
};

export const useEstimates = (session: Session | null) => {
  console.log('📊 useEstimates: Хук useEstimates инициализируется');
  const [allEstimates, setAllEstimates] = useState<Estimate[]>([]);
  const [currentEstimate, setCurrentEstimate] = useState<Estimate | null>(null);
  const [clientInfo, setClientInfo] = useState('');
  const [estimateNumber, setEstimateNumber] = useState('');
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Item[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [tax, setTax] = useState(0);
  const [status, setStatus] = useState<EstimateStatus>('draft');
  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);

  // Загружаем шаблоны из localStorage при инициализации
  useEffect(() => {
    const savedTemplates = localStorage.getItem('estimateTemplates');
    if (savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(savedTemplates);
        console.log('🔧 useEstimates: Загружены шаблоны из localStorage:', parsedTemplates);
        
        // Проверяем, есть ли старые шаблоны без новых полей
        const hasOldTemplates = parsedTemplates.some((template: any) => !template.id || !template.name);
        
        if (hasOldTemplates) {
          console.log('🔧 useEstimates: Обнаружены старые шаблоны, очищаем localStorage');
          // Очищаем старые шаблоны - пользователь должен будет создать новые
          localStorage.removeItem('estimateTemplates');
          setTemplates([]);
          return;
        }
        
        console.log('🔧 useEstimates: Шаблоны уже в новом формате:', parsedTemplates);
        setTemplates(parsedTemplates);
      } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
        // При ошибке очищаем localStorage
        localStorage.removeItem('estimateTemplates');
        setTemplates([]);
      }
    }
  }, []);

  // Кеш‑первый показ смет
  useEffect(() => {
    const cached = dataService.getEstimates();
    if (cached && cached.length) {
      setAllEstimates(cached as any);
    }
  }, []);

  // Сохраняем шаблоны в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('estimateTemplates', JSON.stringify(templates));
  }, [templates]);

  const calculation = useMemo((): CalculationResults => {
    const materialsTotal = items
        .filter(item => item.type === 'material')
        .reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const workTotal = items
        .filter(item => item.type === 'work')
        .reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const subtotal = materialsTotal + workTotal;
    const discountAmount = discountType === 'percent' 
        ? subtotal * (discount / 100)
        : discount;
    const totalAfterDiscount = subtotal - discountAmount;
    const taxAmount = totalAfterDiscount * (tax / 100);
    const grandTotal = totalAfterDiscount + taxAmount;
    return {
        subtotal,
        materialsTotal,
        workTotal,
        discountAmount,
        taxAmount,
        grandTotal
    };
  }, [items, discount, discountType, tax]);

  // Загружаем сметы при инициализации
  useEffect(() => {
    console.log('useEffect сработал, session:', session);
    const loadEstimates = async () => {
      if (session?.user) {
        console.log('Загружаем сметы для пользователя:', session.user.id);
        const { data, error } = await supabase
          .from('estimates')
          .select(`
            *,
            estimate_items (
              id, name, quantity, price, unit, image_url, type, estimate_id
            )
          `)
          .eq('user_id', session.user.id);
        
        if (error) {
          console.error('Ошибка загрузки смет:', error);
        } else {
          console.log('Загружено смет:', data?.length || 0, data);
          
          // Преобразуем данные из Supabase в нужный формат
          const transformedData = transformSupabaseData(data);
          
          console.log('Преобразованные данные:', transformedData);
          setAllEstimates(transformedData);
        }
      } else {
        console.log('Session или user не определен');
      }
    };

    loadEstimates();
  }, [session?.user]);

  const createNewEstimate = (projectIdOrObject: string | { projectId: string } | null = null) => {
    console.log('[DEBUG] Шаг 2: Внутри createNewEstimate.');
    console.log('[DEBUG] Полученный projectIdOrObject:', projectIdOrObject);
    console.log('[DEBUG] Тип projectIdOrObject:', typeof projectIdOrObject);
    console.log('[DEBUG] projectIdOrObject === null:', projectIdOrObject === null);
    console.log('[DEBUG] projectIdOrObject === undefined:', projectIdOrObject === undefined);
    
    let finalProjectId: string | null = null;

    console.log('createNewEstimate вызвана с параметром:', projectIdOrObject, 'тип:', typeof projectIdOrObject);

    // "Умная" проверка: исправляем данные, если они пришли в неправильном формате
    if (typeof projectIdOrObject === 'string') {
      finalProjectId = projectIdOrObject;
      console.log('projectId как строка:', finalProjectId);
    } else if (projectIdOrObject && typeof projectIdOrObject === 'object' && 'projectId' in projectIdOrObject) {
      finalProjectId = projectIdOrObject.projectId;
      console.log('projectId из объекта:', finalProjectId);
    } else {
      console.log('projectId не определен, используем null');
    }

    const newTempId = `temp-${crypto.randomUUID()}`;
    const newEstimate: Estimate = {
      id: newTempId,
      project_id: finalProjectId, // Используем исправленный projectId
      user_id: session?.user?.id || '',
      items: [],
      number: generateNewEstimateNumber(allEstimates),
      date: new Date().toISOString(),
      status: 'draft',
      clientInfo: '',
      discount: 0,
      discountType: 'percent',
      tax: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentEstimate(newEstimate);
    setItems(newEstimate.items);
    setClientInfo(newEstimate.clientInfo || '');
    setEstimateNumber(newEstimate.number);
    setEstimateDate(new Date(newEstimate.date).toISOString().split('T')[0]);
    setDiscount(newEstimate.discount);
    setDiscountType(newEstimate.discountType);
    setTax(newEstimate.tax);
    setStatus(newEstimate.status);
    return newEstimate;
  };

  const loadEstimate = (estimateId: string, projectId?: string | null, setIsDirty?: (value: boolean) => void) => {
    console.log('🔧 loadEstimate: начинаем загрузку сметы', estimateId);
    console.log('🔧 loadEstimate: allEstimates:', allEstimates);
    console.log('🔧 loadEstimate: allEstimates.length:', allEstimates.length);
    
    const estimateToLoad = allEstimates.find(e => e.id === estimateId);
    console.log('🔧 loadEstimate: найдена смета:', estimateToLoad);
    
    if (estimateToLoad) {
      console.log('🔧 loadEstimate: полная структура сметы:', JSON.stringify(estimateToLoad, null, 2));
      console.log('🔧 loadEstimate: items сметы:', estimateToLoad.items);
      console.log('🔧 loadEstimate: items тип:', typeof estimateToLoad.items);
      console.log('🔧 loadEstimate: items массив?', Array.isArray(estimateToLoad.items));
      console.log('🔧 loadEstimate: items.length:', estimateToLoad.items?.length || 0);
      
      if (estimateToLoad.items && estimateToLoad.items.length > 0) {
        console.log('🔧 loadEstimate: первая позиция:', estimateToLoad.items[0]);
        console.log('🔧 loadEstimate: все позиции:', estimateToLoad.items.map((item, index) => ({ index, item })));
      } else {
        console.log('🔧 loadEstimate: ВНИМАНИЕ! Позиции сметы пусты или отсутствуют!');
      }
      
      // Создаем копию сметы с обновленным project_id, если он передан
      const updatedEstimate = projectId !== undefined 
        ? { ...estimateToLoad, project_id: projectId }
        : estimateToLoad;
      
      console.log('🔧 loadEstimate: устанавливаем currentEstimate:', updatedEstimate);
      setCurrentEstimate(updatedEstimate);
      
      console.log('🔧 loadEstimate: устанавливаем items:', estimateToLoad.items);
      console.log('🔧 loadEstimate: items.length перед setItems:', estimateToLoad.items?.length || 0);
      setItems(estimateToLoad.items || []);
      console.log('🔧 loadEstimate: setItems вызван');
      
      console.log('🔧 loadEstimate: устанавливаем clientInfo:', estimateToLoad.clientInfo);
      setClientInfo(estimateToLoad.clientInfo || '');
      
      console.log('🔧 loadEstimate: устанавливаем estimateNumber:', estimateToLoad.number);
      setEstimateNumber(estimateToLoad.number || '');
      
      console.log('🔧 loadEstimate: устанавливаем estimateDate:', estimateToLoad.date);
      setEstimateDate(new Date(estimateToLoad.date).toISOString().split('T')[0]);
      
      console.log('🔧 loadEstimate: устанавливаем discount:', estimateToLoad.discount);
      setDiscount(estimateToLoad.discount);
      
      console.log('🔧 loadEstimate: устанавливаем discountType:', estimateToLoad.discountType);
      setDiscountType(estimateToLoad.discountType);
      
      console.log('🔧 loadEstimate: устанавливаем tax:', estimateToLoad.tax);
      setTax(estimateToLoad.tax);
      
      console.log('🔧 loadEstimate: устанавливаем status:', estimateToLoad.status);
      setStatus(estimateToLoad.status);
      
      // Если project_id изменился, помечаем как "грязную" для активации кнопки сохранения
      console.log('loadEstimate: проверяем изменение project_id:', {
        projectId,
        originalProjectId: estimateToLoad.project_id,
        isDifferent: projectId !== undefined && projectId !== estimateToLoad.project_id,
        setIsDirtyExists: !!setIsDirty
      });
      
      if (projectId !== undefined && projectId !== estimateToLoad.project_id && setIsDirty) {
        setIsDirty(true);
        console.log('loadEstimate: смета привязана к новому проекту, активируем кнопку сохранения');
      } else {
        console.log('loadEstimate: project_id не изменился или setIsDirty не передан');
      }
      
      console.log('loadEstimate: загружена смета', estimateId, 'для проекта', projectId);
    } else {
      console.error('loadEstimate: смета не найдена', estimateId);
    }
  };

  const saveEstimateDirectly = async (estimateData: Estimate) => {
    console.log("--- Запуск saveEstimateDirectly ---");
    console.log('[DEBUG] saveEstimateDirectly: estimateData:', estimateData);
    console.log('[DEBUG] saveEstimateDirectly: session:', session);
    console.log('[DEBUG] saveEstimateDirectly: session?.user:', session?.user);
    
    if (!session?.user) {
      console.error("ОШИБКА: Нет сессии!");
      return;
    }

    const isNew = estimateData.id.startsWith('temp-');
    console.log('🔧 saveEstimateDirectly: isNew:', isNew);
    
    const estimateDataForDb = {
      project_id: estimateData.project_id,
      client_info: estimateData.clientInfo,
      number: estimateData.number,
      date: estimateData.date,
      status: estimateData.status,
      discount: estimateData.discount,
      discount_type: estimateData.discountType,
      tax: estimateData.tax,
      user_id: session.user.id,
    };

    console.log('[DEBUG] saveEstimateDirectly: Данные для отправки:', estimateDataForDb);

    let estimateId = estimateData.id;

    if (isNew) {
      console.log("РЕЖИМ: Создание новой сметы через saveEstimateDirectly.");
      const { data: newDbEstimate, error } = await supabase
        .from('estimates')
        .insert(estimateDataForDb)
        .select()
        .single();

      if (error) { 
        console.error("🔧 saveEstimateDirectly: Ошибка создания сметы:", error); 
        throw error;
      }
      
      console.log('🔧 saveEstimateDirectly: смета создана, ID:', newDbEstimate.id);
      estimateId = newDbEstimate.id;

      // Сохраняем позиции сметы
      if (estimateData.items && estimateData.items.length > 0) {
        console.log(`Найдено ${estimateData.items.length} позиций для сохранения.`);
        const itemsToInsert = estimateData.items.map(({ id, image, ...item }) => ({
          ...item,
          image_url: image,
          estimate_id: newDbEstimate.id
        }));
        
        console.log("Данные для вставки в estimate_items:", itemsToInsert);
        const { error: itemsError } = await supabase.from('estimate_items').insert(itemsToInsert);
        
        if (itemsError) {
          console.error("!!! ОШИБКА при сохранении позиций:", itemsError);
          throw itemsError;
        } else {
          console.log("УСПЕХ: Позиции сметы успешно сохранены.");
        }
      }
    }

    console.log("--- Перезагружаем все сметы после сохранения ---");
    const { data } = await supabase.from('estimates').select(`
      *,
      estimate_items (
        id, name, quantity, price, unit, image_url, type, estimate_id
      )
    `).eq('user_id', session.user.id);
    
    console.log('После сохранения загружено смет:', data?.length || 0, data);
    
    // Преобразуем данные из Supabase в нужный формат
    const transformedData = transformSupabaseData(data);
    console.log('Преобразованные данные после сохранения:', transformedData);
    
    setAllEstimates(transformedData);
    
    // Устанавливаем сохраненную смету как currentEstimate
    const savedEstimate = transformedData.find(e => e.id === estimateId);
    if(savedEstimate) {
      console.log('Загружаем сохраненную смету в currentEstimate:', savedEstimate);
      setCurrentEstimate(savedEstimate);
    } else {
      console.error('ОШИБКА: Не удалось найти сохраненную смету с ID:', estimateId);
    }
    
    console.log("--- Завершение saveEstimateDirectly ---");
    return estimateId;
  };

  const saveCurrentEstimate = async () => {
    console.log("--- Запуск saveCurrentEstimate ---");
    console.log('[DEBUG] saveCurrentEstimate: currentEstimate:', currentEstimate);
    console.log('[DEBUG] saveCurrentEstimate: session:', session);
    console.log('[DEBUG] saveCurrentEstimate: session?.user:', session?.user);
    
    if (!currentEstimate || !session?.user) {
      console.error("ОШИБКА: Нет currentEstimate или сессии!");
      console.error("currentEstimate:", currentEstimate);
      console.error("session:", session);
      console.error("session?.user:", session?.user);
      return;
    }

    // Синхронизируем состояния перед сохранением
    const estimateWithLatestData = {
      ...currentEstimate,
      items: items, // <-- Самое важное: берем свежие items из состояния редактора
      clientInfo: clientInfo,
      number: estimateNumber,
      date: estimateDate,
      discount: discount,
      discountType: discountType,
      tax: tax,
      // Добавь здесь другие поля, если они редактируются отдельно
    };

    console.log("Сохраняемая смета (локальное состояние):", currentEstimate);
    console.log("Сохраняемая смета (с актуальными данными):", estimateWithLatestData);

    const isNew = estimateWithLatestData.id.startsWith('temp-');
    console.log('🔧 saveCurrentEstimate: isNew:', isNew);
    
    console.log('🔧 saveCurrentEstimate: estimateWithLatestData.items:', estimateWithLatestData.items);
    console.log('🔧 saveCurrentEstimate: estimateWithLatestData.items.length:', estimateWithLatestData.items?.length || 0);
    console.log('🔧 saveCurrentEstimate: items (состояние):', items);
    console.log('🔧 saveCurrentEstimate: items.length (состояние):', items.length);
    
    if (estimateWithLatestData.items && estimateWithLatestData.items.length > 0) {
      console.log('🔧 saveCurrentEstimate: первая позиция из estimateWithLatestData:', estimateWithLatestData.items[0]);
      console.log('🔧 saveCurrentEstimate: все позиции из estimateWithLatestData:', estimateWithLatestData.items.map((item, index) => ({ index, item })));
    } else {
      console.log('🔧 saveCurrentEstimate: ВНИМАНИЕ! estimateWithLatestData.items пуст!');
    }
    
    if (items.length > 0) {
      console.log('🔧 saveCurrentEstimate: первая позиция из items:', items[0]);
      console.log('🔧 saveCurrentEstimate: все позиции из items:', items.map((item, index) => ({ index, item })));
    } else {
      console.log('🔧 saveCurrentEstimate: ВНИМАНИЕ! items (состояние) пуст!');
    }
    
    console.log('🔧 saveCurrentEstimate: estimateWithLatestData.project_id =', estimateWithLatestData.project_id, 'тип:', typeof estimateWithLatestData.project_id);
    
    // Дополнительная проверка project_id
    if (!estimateWithLatestData.project_id) {
      console.warn('🔧 saveCurrentEstimate: ВНИМАНИЕ! project_id не установлен для сметы:', estimateWithLatestData);
    }
    
    const estimateData = {
      project_id: estimateWithLatestData.project_id,
      client_info: estimateWithLatestData.clientInfo,
      number: estimateWithLatestData.number,
      date: estimateWithLatestData.date,
      status: status,
      discount: estimateWithLatestData.discount,
      discount_type: estimateWithLatestData.discountType,
      tax: estimateWithLatestData.tax,
      user_id: session.user.id,
    };

    console.log('[DEBUG] Шаг 3: Попытка сохранения в Supabase.');
    console.log('[DEBUG] Данные для отправки (estimateData):', estimateData);
    console.log('[DEBUG] project_id в estimateData:', estimateData.project_id);
    console.log('[DEBUG] Тип project_id:', typeof estimateData.project_id);
    console.log('[DEBUG] project_id === null:', estimateData.project_id === null);
    console.log('[DEBUG] project_id === undefined:', estimateData.project_id === undefined);
    console.log('[DEBUG] project_id === "":', estimateData.project_id === "");

    console.log('🔧 saveCurrentEstimate: estimateData =', estimateData);

    let estimateId = estimateWithLatestData.id;

    if (isNew) {
      console.log("РЕЖИМ: Создание новой сметы.");
      console.log('🔧 saveCurrentEstimate: создаем новую смету в БД');
      const { data: newDbEstimate, error } = await supabase
        .from('estimates')
        .insert(estimateData)
        .select()
        .single();

      if (error) { 
        console.error("🔧 saveCurrentEstimate: Ошибка создания сметы:", error); 
        return; 
      }
      
      console.log('🔧 saveCurrentEstimate: смета создана, ID:', newDbEstimate.id);
      estimateId = newDbEstimate.id;
      console.log(`Смета создана, ID: ${estimateId}. Готовим позиции для сохранения.`);

      // --- ВАЖНАЯ ЧАСТЬ ---
      if (estimateWithLatestData.items && estimateWithLatestData.items.length > 0) {
        console.log(`Найдено ${estimateWithLatestData.items.length} позиций для сохранения.`);
        const itemsToInsert = estimateWithLatestData.items.map(({ id, image, ...item }) => ({
          ...item, // все поля позиции: name, quantity, price, unit, etc.
          image_url: image, // <-- Убедись, что здесь используется 'image_url'
          estimate_id: newDbEstimate.id // ID только что созданной сметы
          // НЕ включаем id - Supabase сам сгенерирует
        }));
        
        console.log("Данные для вставки в estimate_items:", itemsToInsert);
        console.log('🔧 saveCurrentEstimate: itemsToInsert для новой сметы:', itemsToInsert);
        console.log('🔧 saveCurrentEstimate: количество позиций для вставки:', itemsToInsert.length);
        console.log('🔧 saveCurrentEstimate: первая позиция для вставки:', itemsToInsert[0]);
        
        console.log('🔧 saveCurrentEstimate: вставляем позиции в estimate_items');
        const { error: itemsError } = await supabase.from('estimate_items').insert(itemsToInsert);
        
        if (itemsError) {
          console.error("!!! ОШИБКА при сохранении позиций:", itemsError);
          console.error("КРИТИЧЕСКАЯ ОШИБКА при сохранении позиций:", itemsError);
          // Тут можно добавить логику отката - удаления только что созданной сметы
        } else {
          console.log("УСПЕХ: Позиции сметы успешно сохранены.");
          console.log('🔧 saveCurrentEstimate: позиции успешно вставлены');
        }
      } else {
        console.log("В смете нет позиций для сохранения.");
        console.log('🔧 saveCurrentEstimate: позиций для вставки нет (estimateWithLatestData.items пуст)');
      }

    } else {
      // --- ЛОГИКА ОБНОВЛЕНИЯ ---
      console.log("РЕЖИМ: Обновление существующей сметы.");
      console.log('🔧 saveCurrentEstimate: обновляем существующую смету');
      const { error } = await supabase
        .from('estimates')
        .update(estimateData)
        .eq('id', estimateWithLatestData.id);

      if (error) { 
        console.error("🔧 saveCurrentEstimate: Ошибка обновления сметы:", error); 
        return; 
      }

      console.log('🔧 saveCurrentEstimate: удаляем старые позиции');
      await supabase.from('estimate_items').delete().eq('estimate_id', estimateWithLatestData.id);
      
      // Проверяем, есть ли позиции в estimateWithLatestData
      if (estimateWithLatestData.items && estimateWithLatestData.items.length > 0) {
        console.log(`Найдено ${estimateWithLatestData.items.length} позиций для обновления.`);
        const itemsToInsert = estimateWithLatestData.items.map(({ id, image, ...item }) => ({
          ...item, // все поля позиции: name, quantity, price, unit, etc.
          image_url: image, // <-- Убедись, что здесь используется 'image_url'
          estimate_id: estimateWithLatestData.id // ID существующей сметы
          // НЕ включаем id - Supabase сам сгенерирует
        }));
        
        console.log("Данные для вставки в estimate_items (обновление):", itemsToInsert);
        console.log('🔧 saveCurrentEstimate: itemsToInsert для обновления:', itemsToInsert);
        console.log('🔧 saveCurrentEstimate: количество позиций для вставки:', itemsToInsert.length);
        console.log('🔧 saveCurrentEstimate: первая позиция для обновления:', itemsToInsert[0]);
        
        console.log('🔧 saveCurrentEstimate: вставляем новые позиции');
        const { error: itemsError } = await supabase.from('estimate_items').insert(itemsToInsert);
        
        if (itemsError) {
          console.error("!!! ОШИБКА при сохранении позиций (обновление):", itemsError);
          console.error("КРИТИЧЕСКАЯ ОШИБКА при сохранении позиций:", itemsError);
        } else {
          console.log("УСПЕХ: Позиции сметы успешно обновлены.");
          console.log('🔧 saveCurrentEstimate: позиции успешно вставлены');
        }
      } else {
        console.log("В смете нет позиций для обновления.");
        console.log('🔧 saveCurrentEstimate: позиций для вставки нет (estimateWithLatestData.items пуст)');
      }
    }

    console.log("--- Перезагружаем все сметы после сохранения ---");
    const { data } = await supabase.from('estimates').select(`
      *,
      estimate_items (
        id, name, quantity, price, unit, image_url, type, estimate_id
      )
    `).eq('user_id', session.user.id);
    console.log('После сохранения загружено смет:', data?.length || 0, data);
    
    if (data && data.length > 0) {
      console.log('Первая смета после сохранения:', data[0]);
      console.log('Позиции первой сметы после сохранения:', data[0].estimate_items);
      console.log('Количество позиций в первой смете:', data[0].estimate_items?.length || 0);
    }
    
    // Преобразуем данные из Supabase в нужный формат
    const transformedData = transformSupabaseData(data);
    console.log('Преобразованные данные после сохранения:', transformedData);
    
    setAllEstimates(transformedData);
    
    // After saving, load the definitive version from the server
    const savedEstimate = transformedData.find(e => e.id === estimateId);
    if(savedEstimate) {
      console.log('Загружаем сохраненную смету в currentEstimate:', savedEstimate);
      setCurrentEstimate(savedEstimate);
    } else {
      console.error('ОШИБКА: Не удалось найти сохраненную смету с ID:', estimateId);
    }
    
    console.log("--- Завершение saveCurrentEstimate ---");
  };

  const addItem = useCallback(() => {
    const newItem: Item = {
        id: `temp-item-${Date.now()}`,
        name: '',
        quantity: 1,
        price: 0,
        unit: 'шт',
        image: null,
        type: 'work'
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, field: keyof Item, value: string | number) => {
      setItems(prev => prev.map(item => 
          item.id === id ? { ...item, [field]: value } : item
      ));
  }, []);

  const removeItem = useCallback((id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const getEstimatesByProject = useCallback((projectId: string) => {
    console.log(`[DEBUG] Шаг 5: Фильтрация смет для проекта с ID: ${projectId}`);
    console.log('[DEBUG] Всего смет в allEstimates:', allEstimates.length);
    console.log('[DEBUG] Тип projectId:', typeof projectId);
    console.log('[DEBUG] projectId === null:', projectId === null);
    console.log('[DEBUG] projectId === undefined:', projectId === undefined);
    console.log('[DEBUG] projectId === "":', projectId === "");
    
    console.log('getEstimatesByProject вызвана для projectId:', projectId);
    console.log('allEstimates:', allEstimates);
    
    // Проверим структуру данных
    if (allEstimates.length > 0) {
      console.log('Первая смета:', allEstimates[0]);
      console.log('Поля первой сметы:', Object.keys(allEstimates[0]));
      console.log('projectId первой сметы:', allEstimates[0].project_id);
      console.log('project_id первой сметы:', allEstimates[0].project_id);
    }
    
    const filtered = allEstimates.filter(e => e.project_id === projectId);
    console.log('[DEBUG] Результат фильтрации:');
    console.log('[DEBUG] Отфильтрованные сметы:', filtered);
    console.log('[DEBUG] Количество смет для проекта', projectId, ':', filtered.length);
    
    // Дополнительная диагностика фильтрации
    if (allEstimates.length > 0) {
      console.log('[DEBUG] Анализ всех смет:');
      allEstimates.forEach((estimate, index) => {
        console.log(`[DEBUG] Смета ${index + 1}:`, {
          id: estimate.id,
          project_id: estimate.project_id,
          project_id_type: typeof estimate.project_id,
          project_id_equals: estimate.project_id === projectId,
          number: estimate.number
        });
      });
    }
    
    console.log('getEstimatesByProject: отфильтрованные сметы:', filtered);
    console.log('getEstimatesByProject: количество смет для проекта', projectId, ':', filtered.length);
    return filtered;
  }, [allEstimates]);

  const getCurrentEstimateProjectId = useCallback(() => {
    return currentEstimate?.project_id || null;
  }, [currentEstimate]);

  // Обертка для setEstimates с преобразованием данных
  const setEstimatesWithTransform = useCallback((data: any[]) => {
    console.log('🔧 setEstimatesWithTransform: входящие данные:', data);
    console.log('🔧 setEstimatesWithTransform: количество смет:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('🔧 setEstimatesWithTransform: первая смета:', data[0]);
      console.log('🔧 setEstimatesWithTransform: estimate_items первой сметы:', data[0].estimate_items);
    }
    
    // Преобразуем данные из Supabase в нужный формат
    const transformedData = transformSupabaseData(data);
    console.log('🔧 setEstimatesWithTransform: преобразованные данные:', transformedData);
    
    setAllEstimates(transformedData);
    console.log('🔧 setEstimatesWithTransform: setAllEstimates вызван');
  }, []);

  return {
    estimates: allEstimates,
    setEstimates: setEstimatesWithTransform,
    currentEstimate,
    setCurrentEstimate,
    createNewEstimate,
    loadEstimate,
    saveEstimate: saveCurrentEstimate,
    saveEstimateDirectly,
    getEstimatesByProject,
    getCurrentEstimateProjectId,
    clientInfo, setClientInfo,
    estimateNumber, setEstimateNumber,
    estimateDate, setEstimateDate,
    items, setItems,
    discount, setDiscount,
    discountType, setDiscountType,
    tax, setTax,
    status, setStatus,
    calculation,
    addItem,
    updateItem,
    removeItem,
    // Need to re-implement these later if needed
    deleteEstimate: async (id: string) => {
        console.log('[DEBUG] deleteEstimate: удаляем смету с ID:', id);
        
        try {
            // Удаляем смету из базы данных
            const { error: deleteError } = await supabase.from('estimates').delete().eq('id', id);
            
            if (deleteError) {
                console.error('[DEBUG] deleteEstimate: Ошибка удаления сметы:', deleteError);
                throw deleteError;
            }
            
            console.log('[DEBUG] deleteEstimate: смета успешно удалена из БД');
            
            // Перезагружаем все сметы
            const { data, error } = await supabase.from('estimates').select(`
              *,
              estimate_items (
                id, name, quantity, price, unit, image_url, type, estimate_id
              )
            `).eq('user_id', session?.user?.id || '');
            
            if (error) {
                console.error('[DEBUG] deleteEstimate: Ошибка загрузки смет после удаления:', error);
                throw error;
            }
            
            console.log('[DEBUG] deleteEstimate: загружено смет после удаления:', data?.length || 0);
            
            // Преобразуем данные из Supabase в нужный формат
            const transformedData = transformSupabaseData(data);
            console.log('[DEBUG] deleteEstimate: преобразованные данные:', transformedData);
            
            // Обновляем состояние
            setAllEstimates(transformedData);
            
            // Если удаляемая смета была текущей, очищаем currentEstimate
            if (currentEstimate?.id === id) {
                console.log('[DEBUG] deleteEstimate: очищаем currentEstimate');
                setCurrentEstimate(null);
            }
            
            console.log('[DEBUG] deleteEstimate: удаление завершено успешно');
            
        } catch (error) {
            console.error('[DEBUG] deleteEstimate: Ошибка при удалении сметы:', error);
            throw error;
        }
    },
    updateEstimateStatus: async (id: string, newStatus: EstimateStatus) => {
        await supabase.from('estimates').update({ status: newStatus }).eq('id', id);
        const { data } = await supabase.from('estimates').select(`
          *,
          estimate_items (
            id, name, quantity, price, unit, image_url, type, estimate_id
          )
        `).eq('user_id', session?.user?.id || '');
        
        // Преобразуем данные из Supabase в нужный формат
        const transformedData = transformSupabaseData(data);
        
        setAllEstimates(transformedData);
    },
    templates,
    deleteTemplate: (templateId: string) => {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    },
    saveAsTemplate: (estimateId: string) => {
      console.log('🔧 useEstimates: saveAsTemplate вызвана для estimateId:', estimateId);
      console.log('🔧 useEstimates: allEstimates.length:', allEstimates.length);
      console.log('🔧 useEstimates: allEstimates:', allEstimates);
      
      const estimate = allEstimates.find(e => e.id === estimateId);
      console.log('🔧 useEstimates: найденная смета:', estimate);
      
      if (estimate) {
        const template: EstimateTemplate = {
          id: crypto.randomUUID(), // Уникальный ID для шаблона
          name: estimate.number || 'Без названия', // Название сметы
          items: estimate.items || [],
          discount: estimate.discount,
          discountType: estimate.discountType,
          tax: estimate.tax,
          lastModified: Date.now()
        };
        console.log('🔧 useEstimates: созданный шаблон:', template);
        console.log('🔧 useEstimates: количество позиций в шаблоне:', template.items.length);
        
        setTemplates(prev => {
          const newTemplates = [template, ...prev];
          console.log('🔧 useEstimates: обновленные шаблоны:', newTemplates);
          console.log('🔧 useEstimates: количество шаблонов после сохранения:', newTemplates.length);
          return newTemplates;
        });
        
        console.log('🔧 useEstimates: Шаблон успешно сохранен');
      } else {
        console.error('🔧 useEstimates: ОШИБКА - смета не найдена для ID:', estimateId);
      }
    },
    addItemFromLibrary: () => {},
    addItemsFromAI: () => {},
    updateItemImage: () => {},
    reorderItems: () => {},
    fetchAllEstimates: useCallback(async () => {
      if (!session?.user?.id) {
        console.log('🔧 useEstimates: Нет сессии, очищаем данные');
        setAllEstimates([]);
        return;
      }

      try {
        console.log('🔧 useEstimates: fetchAllEstimates запущен');
        const { data, error } = await supabase
          .from('estimates')
          .select(`
            *,
            estimate_items (
              id,
              name,
              quantity,
              price,
              unit,
              image_url, 
              type,
              estimate_id
            )
          `)
          .eq('user_id', session.user.id);

        if (error) {
          console.error('🔧 useEstimates: Ошибка загрузки смет:', error);
          return;
        }
        
        console.log('[DEBUG] Шаг 4: Получены данные из Supabase в fetchAllEstimates.');
        console.log('[DEBUG] "Сырые" данные (data):', data);
        console.log('[DEBUG] Количество смет в data:', data?.length || 0);
        
        if (data && data.length > 0) {
          console.log('[DEBUG] Первая смета из Supabase:', data[0]);
          console.log('[DEBUG] project_id первой сметы:', data[0].project_id);
          console.log('[DEBUG] Тип project_id первой сметы:', typeof data[0].project_id);
        }
        
        // Преобразуем данные из Supabase в нужный формат
        const transformedData = transformSupabaseData(data);
        console.log('🔧 useEstimates: преобразованные данные:', transformedData);
        
        setAllEstimates(transformedData);
        dataService.setEstimates(transformedData as any);
        console.log('🔧 useEstimates: setAllEstimates вызван');
      } catch (error) {
        console.error('🔧 useEstimates: Ошибка в fetchAllEstimates:', error);
      }
    }, [session]), // Добавляем session в зависимости
  };
};
