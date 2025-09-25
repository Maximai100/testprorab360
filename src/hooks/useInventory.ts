import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Tool, Consumable } from '../types';
import type { Session } from '@supabase/supabase-js';
import { useFileStorage } from './useFileStorage';
import { dataService } from '../services/storageService';

export const useInventory = (session: Session | null) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Инициализируем хук для работы с файлами
    const { uploadFileWithFallback } = useFileStorage();

    // Загрузка всех данных инвентаря для текущего пользователя
    const fetchAllInventory = useCallback(async (session: Session | null) => {
        if (!session?.user?.id) {

            setTools([]);
            setConsumables([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {

            // Загружаем инструменты и расходники параллельно
            const [toolsRes, consumablesRes] = await Promise.all([
                supabase
                    .from('tools')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('consumables')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false })
            ]);

            if (toolsRes.error) {
                console.error('🔧 useInventory: Ошибка загрузки инструментов:', toolsRes.error);
                throw toolsRes.error;
            }
            if (consumablesRes.error) {
                console.error('🔧 useInventory: Ошибка загрузки расходников:', consumablesRes.error);
                throw consumablesRes.error;
            }

            // Преобразуем данные из Supabase в формат приложения
            const transformedTools: Tool[] = ((toolsRes.data as any[]) || []).map(tool => {
                // Преобразуем location из формата базы данных в формат приложения
                let appLocation = tool.location || undefined;
                if (tool.location && tool.location.startsWith('project_')) {
                    appLocation = 'on_project';
                }

                return {
                    id: tool.id,
                    name: tool.name,
                    category: tool.category || undefined,
                    condition: tool.condition || undefined,
                    location: appLocation,
                    notes: tool.notes || undefined,
                    image_url: tool.image_url || undefined,
                    purchase_date: tool.purchase_date || undefined,
                    purchase_price: tool.purchase_price || undefined,
                    projectId: tool.project_id || null,
                    createdAt: tool.created_at,
                    updatedAt: tool.updated_at,
                };
            });

            const transformedConsumables: Consumable[] = ((consumablesRes.data as any[]) || []).map(consumable => ({
                id: consumable.id,
                name: consumable.name,
                quantity: consumable.quantity || 0,
                unit: consumable.unit || undefined,
                location: consumable.location || undefined,
                projectId: consumable.project_id || null,
                createdAt: consumable.created_at,
                updatedAt: consumable.updated_at,
            }));

            setTools(transformedTools);
            setConsumables(transformedConsumables);
            // Кешируем
            dataService.setTools(transformedTools);
            dataService.setConsumables(transformedConsumables);

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при загрузке данных:', error);
            setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    }, []);

    // Кеш‑первый показ
    useEffect(() => {
        const cachedTools = dataService.getTools();
        if (cachedTools && cachedTools.length) setTools(cachedTools);
        const cachedConsumables = dataService.getConsumables();
        if (cachedConsumables && cachedConsumables.length) setConsumables(cachedConsumables);
    }, []);

    // Добавление нового инструмента
    const addTool = useCallback(async (toolData: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>, imageFile?: File) => {
        if (!session?.user?.id) {
            console.error('🔧 useInventory: Нет сессии для добавления инструмента');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let imageUrl: string | undefined = toolData.image_url;
            
            // Если передан файл изображения, загружаем его
            if (imageFile) {
                try {

                    const uploadResult = await uploadFileWithFallback('tools-images', imageFile);
                    
                    if (uploadResult.error) {
                        console.error('Ошибка загрузки изображения:', uploadResult.error);
                        throw new Error(`Не удалось загрузить изображение: ${uploadResult.error}`);
                    }
                    
                    imageUrl = uploadResult.publicUrl;

                } catch (error) {
                    console.error('Ошибка при загрузке изображения:', error);
                    throw error;
                }
            }
            
            // Определяем правильное значение location для базы данных
            let dbLocation = toolData.location || null;
            if (toolData.location === 'on_project' && toolData.projectId) {
                dbLocation = `project_${toolData.projectId}`;
            }

            const insertPayload = {
                user_id: session.user.id,
                name: toolData.name,
                category: toolData.category || null,
                condition: toolData.condition || null,
                location: dbLocation,
                notes: toolData.notes || null,
                image_url: imageUrl || null,
                purchase_date: toolData.purchase_date || null,
                purchase_price: toolData.purchase_price || null,
                project_id: toolData.projectId || null,
            };

            const { data, error } = await supabase
                .from('tools')
                .insert(insertPayload)
                .select()
                .single();

            if (error) {
                console.error('🔧 useInventory: Ошибка добавления инструмента:', error);
                throw error;
            }

            // Преобразуем данные обратно в формат приложения
            const newTool: Tool = {
                id: data.id,
                name: data.name,
                category: data.category || undefined,
                condition: data.condition || undefined,
                location: data.location || undefined,
                notes: data.notes || undefined,
                image_url: data.image_url || undefined,
                purchase_date: data.purchase_date || undefined,
                purchase_price: data.purchase_price || undefined,
                projectId: data.project_id || null,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setTools(prev => [newTool, ...prev]);

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при добавлении инструмента:', error);
            setError(error instanceof Error ? error.message : 'Ошибка добавления инструмента');
        } finally {
            setLoading(false);
        }
    }, [session, uploadFileWithFallback]);

    // Обновление инструмента
    const updateTool = useCallback(async (toolData: Tool, imageFile?: File) => {
        if (!session?.user?.id) {
            console.error('🔧 useInventory: Нет сессии для обновления инструмента');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let imageUrl: string | undefined = toolData.image_url;
            
            // Если передан новый файл изображения, загружаем его
            if (imageFile) {
                try {

                    const uploadResult = await uploadFileWithFallback('tools-images', imageFile);
                    
                    if (uploadResult.error) {
                        console.error('Ошибка загрузки изображения:', uploadResult.error);
                        throw new Error(`Не удалось загрузить изображение: ${uploadResult.error}`);
                    }
                    
                    imageUrl = uploadResult.publicUrl;

                } catch (error) {
                    console.error('Ошибка при обновлении изображения:', error);
                    throw error;
                }
            }
            
            // Определяем правильное значение location для базы данных
            let dbLocation = toolData.location || null;
            if (toolData.location === 'on_project' && toolData.projectId) {
                dbLocation = `project_${toolData.projectId}`;
            }

            const updatePayload: any = {
                name: toolData.name,
                category: toolData.category || null,
                condition: toolData.condition || null,
                location: dbLocation,
                notes: toolData.notes || null,
                image_url: imageUrl || null,
                purchase_date: toolData.purchase_date || null,
                purchase_price: toolData.purchase_price || null,
                project_id: toolData.projectId || null,
            };

            const { data, error } = await supabase
                .from('tools')
                .update(updatePayload)
                .eq('id', toolData.id)
                .eq('user_id', session.user.id)
                .select()
                .single();

            if (error) {
                console.error('🔧 useInventory: Ошибка обновления инструмента:', error);
                throw error;
            }

            // Преобразуем данные обратно в формат приложения
            const updatedTool: Tool = {
                id: data.id,
                name: data.name,
                category: data.category || undefined,
                condition: data.condition || undefined,
                location: data.location || undefined,
                notes: data.notes || undefined,
                image_url: data.image_url || undefined,
                purchase_date: data.purchase_date || undefined,
                purchase_price: data.purchase_price || undefined,
                projectId: data.project_id || null,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setTools(prev => prev.map(tool => tool.id === toolData.id ? updatedTool : tool));

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при обновлении инструмента:', error);
            setError(error instanceof Error ? error.message : 'Ошибка обновления инструмента');
        } finally {
            setLoading(false);
        }
    }, [session, uploadFileWithFallback]);

    // Удаление инструмента
    const deleteTool = useCallback(async (toolId: string) => {
        if (!session?.user?.id) {
            console.error('🔧 useInventory: Нет сессии для удаления инструмента');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('tools')
                .delete()
                .eq('id', toolId)
                .eq('user_id', session.user.id);

            if (error) {
                console.error('🔧 useInventory: Ошибка удаления инструмента:', error);
                throw error;
            }

            setTools(prev => prev.filter(tool => tool.id !== toolId));

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при удалении инструмента:', error);
            setError(error instanceof Error ? error.message : 'Ошибка удаления инструмента');
        } finally {
            setLoading(false);
        }
    }, [session]);

    // Добавление нового расходника
    const addConsumable = useCallback(async (consumableData: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!session?.user?.id) {
            console.error('🔧 useInventory: Нет сессии для добавления расходника');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const insertPayload = {
                user_id: session.user.id,
                name: consumableData.name,
                quantity: consumableData.quantity || 0,
                unit: consumableData.unit || null,
                location: consumableData.location || null,
                project_id: consumableData.projectId || null,
            };

            const { data, error } = await supabase
                .from('consumables')
                .insert(insertPayload)
                .select()
                .single();

            if (error) {
                console.error('🔧 useInventory: Ошибка добавления расходника:', error);
                throw error;
            }

            // Преобразуем данные обратно в формат приложения
            const newConsumable: Consumable = {
                id: data.id,
                name: data.name,
                quantity: data.quantity || 0,
                unit: data.unit || undefined,
                location: data.location || undefined,
                projectId: data.project_id || null,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setConsumables(prev => [newConsumable, ...prev]);

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при добавлении расходника:', error);
            setError(error instanceof Error ? error.message : 'Ошибка добавления расходника');
        } finally {
            setLoading(false);
        }
    }, [session]);

    // Обновление расходника
    const updateConsumable = useCallback(async (consumableData: Consumable) => {
        if (!session?.user?.id) {
            console.error('🔧 useInventory: Нет сессии для обновления расходника');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const updatePayload = {
                name: consumableData.name,
                quantity: consumableData.quantity || 0,
                unit: consumableData.unit || null,
                location: consumableData.location || null,
                project_id: consumableData.projectId || null,
            };

            const { data, error } = await supabase
                .from('consumables')
                .update(updatePayload)
                .eq('id', consumableData.id)
                .eq('user_id', session.user.id)
                .select()
                .single();

            if (error) {
                console.error('🔧 useInventory: Ошибка обновления расходника:', error);
                throw error;
            }

            // Преобразуем данные обратно в формат приложения
            const updatedConsumable: Consumable = {
                id: data.id,
                name: data.name,
                quantity: data.quantity || 0,
                unit: data.unit || undefined,
                location: data.location || undefined,
                projectId: data.project_id || null,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setConsumables(prev => prev.map(consumable => 
                consumable.id === consumableData.id ? updatedConsumable : consumable
            ));

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при обновлении расходника:', error);
            setError(error instanceof Error ? error.message : 'Ошибка обновления расходника');
        } finally {
            setLoading(false);
        }
    }, [session]);

    // Удаление расходника
    const deleteConsumable = useCallback(async (consumableId: string) => {
        if (!session?.user?.id) {
            console.error('🔧 useInventory: Нет сессии для удаления расходника');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('consumables')
                .delete()
                .eq('id', consumableId)
                .eq('user_id', session.user.id);

            if (error) {
                console.error('🔧 useInventory: Ошибка удаления расходника:', error);
                throw error;
            }

            setConsumables(prev => prev.filter(consumable => consumable.id !== consumableId));

        } catch (error) {
            console.error('🔧 useInventory: Ошибка при удалении расходника:', error);
            setError(error instanceof Error ? error.message : 'Ошибка удаления расходника');
        } finally {
            setLoading(false);
        }
    }, [session]);

    return {
        // Состояния
        tools,
        consumables,
        loading,
        error,
        
        // Функции
        fetchAllInventory,
        addTool,
        updateTool,
        deleteTool,
        addConsumable,
        updateConsumable,
        deleteConsumable,
    };
};
