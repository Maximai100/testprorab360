import { useState, useCallback, useMemo, useEffect } from 'react';
import { Estimate, Item, LibraryItem, CalculationResults, EstimateStatus, EstimateTemplate } from '../types';
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
        setTemplates(JSON.parse(savedTemplates));
      } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
      }
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

  const saveCurrentEstimate = async () => {
    console.log("--- Запуск saveCurrentEstimate ---");
    if (!currentEstimate || !session?.user) {
      console.error("ОШИБКА: Нет currentEstimate или сессии!");
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
    `);
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
    console.log('Отфильтрованные сметы:', filtered);
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
    createNewEstimate,
    loadEstimate,
    saveEstimate: saveCurrentEstimate,
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
        await supabase.from('estimates').delete().eq('id', id);
        const { data } = await supabase.from('estimates').select(`
          *,
          estimate_items (
            id, name, quantity, price, unit, image_url, type, estimate_id
          )
        `);
        
        // Преобразуем данные из Supabase в нужный формат
        const transformedData = transformSupabaseData(data);
        
        setAllEstimates(transformedData);
    },
    updateEstimateStatus: async (id: string, newStatus: EstimateStatus) => {
        await supabase.from('estimates').update({ status: newStatus }).eq('id', id);
        const { data } = await supabase.from('estimates').select(`
          *,
          estimate_items (
            id, name, quantity, price, unit, image_url, type, estimate_id
          )
        `);
        
        // Преобразуем данные из Supabase в нужный формат
        const transformedData = transformSupabaseData(data);
        
        setAllEstimates(transformedData);
    },
    templates,
    deleteTemplate: (timestamp: number) => {
      setTemplates(prev => prev.filter(t => t.lastModified !== timestamp));
    },
    saveAsTemplate: (estimateId: string) => {
      console.log('🔧 useEstimates: saveAsTemplate вызвана для estimateId:', estimateId);
      console.log('🔧 useEstimates: allEstimates.length:', allEstimates.length);
      console.log('🔧 useEstimates: allEstimates:', allEstimates);
      
      const estimate = allEstimates.find(e => e.id === estimateId);
      console.log('🔧 useEstimates: найденная смета:', estimate);
      
      if (estimate) {
        const template: EstimateTemplate = {
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
          `);

        if (error) {
          console.error('🔧 useEstimates: Ошибка загрузки смет:', error);
          return;
        }
        
        console.log('🔧 useEstimates: fetchAllEstimates успешно, данные:', data);
        console.log('🔧 useEstimates: количество смет:', data?.length || 0);
        
        if (data && data.length > 0) {
          console.log('🔧 useEstimates: первая смета:', data[0]);
          console.log('🔧 useEstimates: estimate_items первой сметы:', data[0].estimate_items);
          console.log('🔧 useEstimates: количество позиций в первой смете:', data[0].estimate_items?.length || 0);
          
          if (data[0].estimate_items && data[0].estimate_items.length > 0) {
            console.log('🔧 useEstimates: первая позиция первой сметы:', data[0].estimate_items[0]);
          }
        }
        
        // Преобразуем данные из Supabase в нужный формат
        const transformedData = transformSupabaseData(data);
        console.log('🔧 useEstimates: преобразованные данные:', transformedData);
        
        setAllEstimates(transformedData);
        console.log('🔧 useEstimates: setAllEstimates вызван');
      } catch (error) {
        console.error('🔧 useEstimates: Ошибка в fetchAllEstimates:', error);
      }
    }, []), // Пустой массив зависимостей для стабильности
  };
};