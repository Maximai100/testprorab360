import { useState, useCallback, useMemo, useEffect } from 'react';
import { Estimate, Item, LibraryItem, CalculationResults, EstimateStatus, EstimateTemplate } from '../types';
import { dataService } from '../services/storageService';
import { supabase } from '../supabaseClient';
import { generateNewEstimateNumber } from '../utils';
import type { Session } from '@supabase/supabase-js';

// Вспомогательная функция для преобразования данных из Supabase
const transformSupabaseData = (data: any[] | null) => {

  const transformed = (data || []).map((estimate, index) => {

    // Исправляем единицы измерения и цены для позиций сметы
    const correctedItems = (estimate.estimate_items || []).map((item: any) => {

      // Если единица измерения "комплект", пытаемся определить правильную единицу по названию
      let correctedUnit = item.unit;
      if (item.unit === 'комплект') {
        if (item.name.includes('штукатурка') || item.name.includes('шпаклевка')) {
          correctedUnit = 'меш.';
        } else if (item.name.includes('краска') || item.name.includes('грунтовка')) {
          correctedUnit = 'банка';
        } else if (item.name.includes('обои')) {
          correctedUnit = 'рулон';
        } else if (item.name.includes('ламинат') || item.name.includes('плитка')) {
          correctedUnit = 'упаковка';
        } else if (item.name.includes('плинтус')) {
          correctedUnit = 'планка';
        } else if (item.name.includes('гипсокартон')) {
          correctedUnit = 'лист';
        }
      }
      
      // Если цена 0, оставляем её как есть (не устанавливаем примерные цены)
      let correctedPrice = item.price;

      return {
        ...item,
        unit: correctedUnit,
        price: correctedPrice
      };
    });
    
    const transformedEstimate = {
      ...estimate,
      items: correctedItems,
      clientInfo: estimate.client_info || '',
      number: estimate.number || '',
      date: estimate.date || new Date().toISOString(),
      discountType: estimate.discount_type || 'percent',
      createdAt: estimate.created_at || new Date().toISOString(),
      updatedAt: estimate.updated_at || new Date().toISOString()
    };

    return transformedEstimate;
  });

  return transformed;
};

export const useEstimates = (session: Session | null) => {

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

        // Проверяем, есть ли старые шаблоны без новых полей
        const hasOldTemplates = parsedTemplates.some((template: any) => !template.id || !template.name);
        
        if (hasOldTemplates) {

          // Очищаем старые шаблоны - пользователь должен будет создать новые
          localStorage.removeItem('estimateTemplates');
          setTemplates([]);
          return;
        }

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
    const loadEstimates = async () => {
      if (session?.user) {
        try {

          // Добавляем небольшую задержку для предотвращения слишком частых запросов
          await new Promise(resolve => setTimeout(resolve, 50));
          
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
            // Не выбрасываем ошибку, чтобы не ломать приложение
            return;
          } else {
            
            // Преобразуем данные из Supabase в нужный формат
            const transformedData = transformSupabaseData(data);
            
            setAllEstimates(transformedData);
          }
        } catch (error) {
          console.error('Критическая ошибка при загрузке смет:', error);
          // В случае критической ошибки показываем пустой массив
          setAllEstimates([]);
        }
      } else {
      }
    };

    loadEstimates();
  }, [session?.user]);

  const createNewEstimate = (projectIdOrObject: string | { projectId: string } | null = null) => {
    
    let finalProjectId: string | null = null;


    // "Умная" проверка: исправляем данные, если они пришли в неправильном формате
    if (typeof projectIdOrObject === 'string') {
      finalProjectId = projectIdOrObject;
    } else if (projectIdOrObject && typeof projectIdOrObject === 'object' && 'projectId' in projectIdOrObject) {
      finalProjectId = projectIdOrObject.projectId;
    } else {
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

    const estimateToLoad = allEstimates.find(e => e.id === estimateId);

    if (estimateToLoad) {


      if (estimateToLoad.items && estimateToLoad.items.length > 0) {

        
        // Проверяем каждую позицию на наличие данных
        estimateToLoad.items.forEach((item, index) => {

        });
      } else {

      }
      
      // Создаем копию сметы с обновленным project_id, если он передан
      const updatedEstimate = projectId !== undefined 
        ? { ...estimateToLoad, project_id: projectId }
        : estimateToLoad;

      setCurrentEstimate(updatedEstimate);

      setItems(estimateToLoad.items || []);

      setClientInfo(estimateToLoad.clientInfo || '');

      setEstimateNumber(estimateToLoad.number || '');

      setEstimateDate(new Date(estimateToLoad.date).toISOString().split('T')[0]);

      setDiscount(estimateToLoad.discount);

      setDiscountType(estimateToLoad.discountType);

      setTax(estimateToLoad.tax);

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

    if (!session?.user) {
      console.error("ОШИБКА: Нет сессии!");
      return;
    }

    const isNew = estimateData.id.startsWith('temp-');

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

    let estimateId = estimateData.id;

    if (isNew) {
      console.log("РЕЖИМ: Создание новой сметы через saveEstimateDirectly.");
      
      // Используем транзакцию для атомарности операций
      const { data: newDbEstimate, error } = await supabase
        .from('estimates')
        .insert(estimateDataForDb)
        .select()
        .single();

      if (error) { 
        console.error("🔧 saveEstimateDirectly: Ошибка создания сметы:", error); 
        throw error;
      }

      estimateId = newDbEstimate.id;

      // Сохраняем позиции сметы одним запросом
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

    // Оптимизированное обновление данных - используем кеш если доступен
    console.log("--- Оптимизированное обновление данных ---");
    
    // Сначала обновляем локальный кеш
    const currentEstimates = allEstimates.filter(e => e.id !== estimateId);
    const updatedEstimate = { ...estimateData, id: estimateId };
    const newEstimates = [...currentEstimates, updatedEstimate];
    setAllEstimates(newEstimates);
    
    // Затем обновляем данные из Supabase в фоне
    setTimeout(async () => {
      try {
        const { data } = await supabase.from('estimates').select(`
          *,
          estimate_items (
            id, name, quantity, price, unit, image_url, type, estimate_id
          )
        `).eq('user_id', session.user.id);
        
        if (data) {
          const transformedData = transformSupabaseData(data);
          setAllEstimates(transformedData);
          
          // Устанавливаем сохраненную смету как currentEstimate
          const savedEstimate = transformedData.find(e => e.id === estimateId);
          if(savedEstimate) {
            setCurrentEstimate(savedEstimate);
          }
        }
      } catch (error) {
        console.error('Ошибка при фоновом обновлении данных:', error);
      }
    }, 0);
    
    console.log("--- Завершение saveEstimateDirectly ---");
    return estimateId;
  };

  const saveCurrentEstimate = async () => {
    console.log("--- Запуск saveCurrentEstimate ---");

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

    
    if (estimateWithLatestData.items && estimateWithLatestData.items.length > 0) {

    } else {

    }
    
    if (items.length > 0) {

    } else {
    }

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


    let estimateId = estimateWithLatestData.id;

    if (isNew) {
      console.log("РЕЖИМ: Создание новой сметы.");

      const { data: newDbEstimate, error } = await supabase
        .from('estimates')
        .insert(estimateData)
        .select()
        .single();

      if (error) { 
        console.error("🔧 saveCurrentEstimate: Ошибка создания сметы:", error); 
        return; 
      }

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

        const { error: itemsError } = await supabase.from('estimate_items').insert(itemsToInsert);
        
        if (itemsError) {
          console.error("!!! ОШИБКА при сохранении позиций:", itemsError);
          console.error("КРИТИЧЕСКАЯ ОШИБКА при сохранении позиций:", itemsError);
          // Тут можно добавить логику отката - удаления только что созданной сметы
        } else {
          console.log("УСПЕХ: Позиции сметы успешно сохранены.");

        }
      } else {
        console.log("В смете нет позиций для сохранения.");
      }

    } else {
      // --- ЛОГИКА ОБНОВЛЕНИЯ ---
      console.log("РЕЖИМ: Обновление существующей сметы.");

      const { error } = await supabase
        .from('estimates')
        .update(estimateData)
        .eq('id', estimateWithLatestData.id);

      if (error) { 
        console.error("🔧 saveCurrentEstimate: Ошибка обновления сметы:", error); 
        return; 
      }

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

        const { error: itemsError } = await supabase.from('estimate_items').insert(itemsToInsert);
        
        if (itemsError) {
          console.error("!!! ОШИБКА при сохранении позиций (обновление):", itemsError);
          console.error("КРИТИЧЕСКАЯ ОШИБКА при сохранении позиций:", itemsError);
        } else {
          console.log("УСПЕХ: Позиции сметы успешно обновлены.");

        }
      } else {
        console.log("В смете нет позиций для обновления.");
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

    }
    
    // Преобразуем данные из Supabase в нужный формат
    const transformedData = transformSupabaseData(data);
    console.log('Преобразованные данные после сохранения:', transformedData);
    
    setAllEstimates(transformedData);
    
    // After saving, load the definitive version from the server
    const savedEstimate = transformedData.find(e => e.id === estimateId);
    if(savedEstimate) {

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

    // Дополнительная диагностика фильтрации
    if (allEstimates.length > 0) {

      allEstimates.forEach((estimate, index) => {

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

    if (data && data.length > 0) {

    }
    
    // Преобразуем данные из Supabase в нужный формат
    const transformedData = transformSupabaseData(data);

    setAllEstimates(transformedData);

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

        try {
            // Оптимизированное удаление - сначала обновляем локальный кеш

            const updatedEstimates = allEstimates.filter(e => e.id !== id);
            setAllEstimates(updatedEstimates);
            
            // Если удаляемая смета была текущей, очищаем currentEstimate
            if (currentEstimate?.id === id) {

                setCurrentEstimate(null);
            }
            
            // Затем удаляем из базы данных в фоне
            setTimeout(async () => {
                try {

                    const { error: deleteError } = await supabase.from('estimates').delete().eq('id', id);
                    
                    if (deleteError) {
                        // В случае ошибки восстанавливаем данные
                        const { data } = await supabase.from('estimates').select(`
                          *,
                          estimate_items (
                            id, name, quantity, price, unit, image_url, type, estimate_id
                          )
                        `).eq('user_id', session?.user?.id || '');
                        
                        if (data) {
                            const transformedData = transformSupabaseData(data);
                            setAllEstimates(transformedData);
                        }
                        throw deleteError;
                    }

                } catch (error) {
                    // Восстанавливаем данные из БД
                    try {
                        const { data } = await supabase.from('estimates').select(`
                          *,
                          estimate_items (
                            id, name, quantity, price, unit, image_url, type, estimate_id
                          )
                        `).eq('user_id', session?.user?.id || '');
                        
                        if (data) {
                            const transformedData = transformSupabaseData(data);
                            setAllEstimates(transformedData);
                        }
                    } catch (restoreError) {
                    }
                }
            }, 0);
            
            
        } catch (error) {
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

      const estimate = allEstimates.find(e => e.id === estimateId);

      if (estimate) {
        const template: EstimateTemplate = {
          id: crypto.randomUUID(), // Уникальный ID для шаблона
          name: estimate.clientInfo || estimate.number || 'Без названия', // Название сметы
          items: estimate.items || [],
          discount: estimate.discount,
          discountType: estimate.discountType,
          tax: estimate.tax,
          lastModified: Date.now()
        };

        setTemplates(prev => {
          const newTemplates = [template, ...prev];

          return newTemplates;
        });

      } else {
        console.error('🔧 useEstimates: ОШИБКА - смета не найдена для ID:', estimateId);
      }
    },
    addItemFromLibrary: () => {},
    addItemsFromAI: () => {},
    updateItemImage: () => {},
    reorderItems: () => {},
    fetchAllEstimates: useCallback(async (retryCount = 0) => {
      if (!session?.user?.id) {

        setAllEstimates([]);
        return;
      }

      try {

        // Добавляем задержку перед запросом (следуем SUPABASE_SAFETY_GUIDE)
        await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
        
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
          
          // Retry логика для ошибок подключения (следуем SUPABASE_SAFETY_GUIDE)
          if (retryCount < 2 && error.message.includes('Database connection error')) {

            setTimeout(() => {
              setAllEstimates([]);
            }, 2000 * (retryCount + 1));
            return;
          }
          
          return;
        }


        if (data && data.length > 0) {

        }
        
        // Преобразуем данные из Supabase в нужный формат
        const transformedData = transformSupabaseData(data);

        setAllEstimates(transformedData);
        dataService.setEstimates(transformedData as any);

      } catch (error) {
        console.error('🔧 useEstimates: Ошибка в fetchAllEstimates:', error);
        
        // Retry логика для критических ошибок
        if (retryCount < 2) {

          setTimeout(() => {
            setAllEstimates([]);
          }, 2000 * (retryCount + 1));
          return;
        }
        
        // В случае критической ошибки показываем пустой массив
        setAllEstimates([]);
      }
    }, [session]), // Добавляем session в зависимости
  };
};
