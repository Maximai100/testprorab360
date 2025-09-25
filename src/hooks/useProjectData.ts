import { useState, useEffect, useCallback } from 'react';
import { FinanceEntry, WorkStage, ProjectFinancials } from '../types';
import { supabase } from '../supabaseClient';
import { useFileStorage } from './useFileStorage';

export const useProjectData = () => {
    console.log('useProjectData: Хук useProjectData инициализируется');
    
    const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
    const [workStages, setWorkStages] = useState<WorkStage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Инициализируем хук для работы с файлами
    const { uploadFileWithFallback } = useFileStorage();
    
    // Загрузка данных проекта из Supabase с retry логикой
    const loadProjectData = useCallback(async (projectId: string, retryCount = 0) => {
        if (!projectId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('🔄 useProjectData: Загружаем данные проекта:', projectId, retryCount > 0 ? `(попытка ${retryCount + 1})` : '');
            
            // Добавляем задержку для предотвращения слишком частых запросов
            await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
            
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) {
                console.error('useProjectData: Ошибка получения пользователя:', userError);
                throw userError;
            }
            if (!user) {
                console.log('useProjectData: Пользователь не авторизован');
                setLoading(false);
                return;
            }

            // Загружаем параллельно: финансы и этапы работ
            const [financeRes, stagesRes] = await Promise.allSettled([
                supabase
                    .from('finance_entries')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('work_stages')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
            ]);

            // Обрабатываем результаты Promise.allSettled
            const financeData = financeRes.status === 'fulfilled' ? financeRes.value : null;
            const stagesData = stagesRes.status === 'fulfilled' ? stagesRes.value : null;
            
            if (financeRes.status === 'rejected') {
                console.error('useProjectData: Ошибка загрузки финансовых записей:', financeRes.reason);
                throw financeRes.reason;
            }
            if (stagesRes.status === 'rejected') {
                console.error('useProjectData: Ошибка загрузки этапов работ:', stagesRes.reason);
                throw stagesRes.reason;
            }
            
            if (financeData?.error) {
                console.error('useProjectData: Ошибка загрузки финансовых записей:', financeData.error);
                throw financeData.error;
            }
            if (stagesData?.error) {
                console.error('useProjectData: Ошибка загрузки этапов работ:', stagesData.error);
                throw stagesData.error;
            }

            // Преобразуем данные в формат приложения
            const mappedFinanceEntries: FinanceEntry[] = ((financeData?.data as any[]) || []).map((row: any) => ({
                id: row.id,
                projectId: row.project_id,
                type: row.type,
                amount: row.amount,
                description: row.description,
                date: row.date,
                category: row.category || undefined,
                receipt_url: row.receipt_url || undefined,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            const mappedWorkStages: WorkStage[] = ((stagesData?.data as any[]) || []).map((row: any) => ({
                id: row.id,
                projectId: row.project_id,
                title: row.title,
                description: row.description || '',
                startDate: row.start_date || '',
                endDate: row.end_date || undefined,
                status: row.status || 'planned',
                progress: row.progress || 0,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }));

            setFinanceEntries(mappedFinanceEntries);
            setWorkStages(mappedWorkStages);
            
            console.log('✅ useProjectData: Данные загружены:', {
                financeEntries: mappedFinanceEntries.length,
                workStages: mappedWorkStages.length
            });
            
        } catch (error) {
            console.error('❌ useProjectData: Ошибка при загрузке данных проекта:', error);
            
            // Retry логика для сетевых ошибок
            if (retryCount < 2 && error instanceof Error && 
                (error.message.includes('NetworkError') || error.message.includes('fetch'))) {

                setTimeout(() => {
                    loadProjectData(projectId, retryCount + 1);
                }, 1000 * (retryCount + 1));
                return;
            }
            
            // Более детальная обработка ошибок
            if (error instanceof Error) {
                if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
                    setError('Ошибка сети. Проверьте подключение к интернету.');
                } else if (error.message.includes('auth')) {
                    setError('Ошибка авторизации. Попробуйте перезайти в приложение.');
                } else {
                    setError(`Ошибка загрузки данных: ${error.message}`);
                }
            } else {
                setError('Неизвестная ошибка при загрузке данных');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Финансовые операции
    const addFinanceEntry = useCallback(async (projectId: string, entryData: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>, receiptFile?: File) => {
        let receiptUrl: string | undefined;
        
        // Если передан файл чека, загружаем его
        if (receiptFile) {
            try {

                const uploadResult = await uploadFileWithFallback('receipts', receiptFile);
                
                if (uploadResult.error) {
                    console.error('Ошибка загрузки чека:', uploadResult.error);
                    throw new Error(`Не удалось загрузить чек: ${uploadResult.error}`);
                }
                
                receiptUrl = uploadResult.publicUrl;

            } catch (error) {
                console.error('Ошибка при загрузке чека:', error);
                throw error;
            }
        }
        
        // Оптимистично добавляем
        const id = generateUUID();
        const now = new Date().toISOString();
        const optimistic: FinanceEntry = {
            id,
            projectId,
            type: entryData.type,
            amount: entryData.amount,
            description: entryData.description,
            date: entryData.date,
            category: entryData.category,
            receipt_url: receiptUrl,
            createdAt: now,
            updatedAt: now,
        };
        setFinanceEntries(prev => [optimistic, ...prev]);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Пользователь не авторизован');
            const { error } = await supabase
                .from('finance_entries')
                .insert({
                    id,
                    user_id: user.id,
                    project_id: projectId,
                    type: entryData.type,
                    amount: entryData.amount,
                    description: entryData.description,
                    date: entryData.date,
                    category: entryData.category || null,
                    receipt_url: receiptUrl || null,
                    created_at: now,
                    updated_at: now,
                })
                .select('id')
                .single();
            if (error) throw error;
            return optimistic;
        } catch (error) {
            // Откат
            setFinanceEntries(prev => prev.filter(e => e.id !== id));
            console.error('Ошибка при создании финансовой записи:', error);
            throw error;
        }
    }, [uploadFileWithFallback]);
    
    const updateFinanceEntry = useCallback(async (id: string, updates: Partial<FinanceEntry>, receiptFile?: File) => {
        let receiptUrl: string | undefined = updates.receipt_url;
        
        // Если передан новый файл чека, загружаем его
        if (receiptFile) {
            try {

                const uploadResult = await uploadFileWithFallback('receipts', receiptFile);
                
                if (uploadResult.error) {
                    console.error('Ошибка загрузки чека:', uploadResult.error);
                    throw new Error(`Не удалось загрузить чек: ${uploadResult.error}`);
                }
                
                receiptUrl = uploadResult.publicUrl;

            } catch (error) {
                console.error('Ошибка при обновлении чека:', error);
                throw error;
            }
        }
        
        try {
            // Получаем текущего пользователя
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            // Оптимистичное обновление
            let prevEntry: FinanceEntry | undefined;
            setFinanceEntries(prev => {
                prevEntry = prev.find(e => e.id === id);
                return prev.map(e => e.id === id ? ({ ...e, ...updates, receipt_url: receiptUrl ?? e.receipt_url, updatedAt: new Date().toISOString() } as FinanceEntry) : e);
            });

            // Обновляем запись в Supabase
            const updateData: any = {};
            if (updates.type !== undefined) updateData.type = updates.type;
            if (updates.amount !== undefined) updateData.amount = updates.amount;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.date !== undefined) updateData.date = updates.date;
            if (updates.category !== undefined) updateData.category = updates.category;
            if (receiptUrl !== undefined) updateData.receipt_url = receiptUrl;
            
            const { error } = await supabase
                .from('finance_entries')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', user.id)
                .select('id')
                .single();
            if (error) throw error;
            console.log('📄 Финансовая запись обновлена (оптимистично):', id);
            
        } catch (error) {
            console.error('Ошибка при обновлении финансовой записи:', error);
            // Откатываем локально
            setFinanceEntries(prev => prev.map(e => e.id === id ? (prevEntry as FinanceEntry) : e));
            throw error;
        }
    }, [uploadFileWithFallback]);
    
    const deleteFinanceEntry = useCallback(async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            const { error } = await supabase
                .from('finance_entries')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            
            if (error) {
                console.error('Ошибка удаления финансовой записи:', error);
                throw error;
            }
            
            setFinanceEntries(prev => prev.filter(f => f.id !== id));

        } catch (error) {
            console.error('Ошибка при удалении финансовой записи:', error);
            throw error;
        }
    }, []);
    
    const getFinanceEntriesByProject = useCallback((projectId: string) => {
        return financeEntries.filter(f => f.projectId === projectId);
    }, [financeEntries]);

    // Операции с этапами работ
    const addWorkStage = useCallback(async (projectId: string, stageData: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            const { data, error } = await supabase
                .from('work_stages')
                .insert({
                    user_id: user.id,
                    project_id: projectId,
                    title: stageData.title,
                    description: stageData.description || null,
                    start_date: stageData.startDate || null,
                    end_date: stageData.endDate || null,
                    status: stageData.status || 'planned',
                    progress: stageData.progress || 0,
                })
                .select()
                .single();
            
            if (error) {
                console.error('Ошибка создания этапа работ:', error);
                throw error;
            }
            
            const newStage: WorkStage = {
                id: data.id,
                projectId: data.project_id,
                title: data.title,
                description: data.description || '',
                startDate: data.start_date || '',
                endDate: data.end_date || undefined,
                status: data.status || 'planned',
                progress: data.progress || 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
            
            setWorkStages(prev => [...prev, newStage]);

            return newStage;
            
        } catch (error) {
            console.error('Ошибка при создании этапа работ:', error);
            throw error;
        }
    }, []);
    
    const updateWorkStage = useCallback(async (id: string, updates: Partial<WorkStage>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            const updateData: any = {};
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
            if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
            if (updates.status !== undefined) updateData.status = updates.status;
            if (updates.progress !== undefined) updateData.progress = updates.progress;
            
            const { data, error } = await supabase
                .from('work_stages')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();
            
            if (error) {
                console.error('Ошибка обновления этапа работ:', error);
                throw error;
            }
            
            const updatedStage: WorkStage = {
                id: data.id,
                projectId: data.project_id,
                title: data.title,
                description: data.description || '',
                startDate: data.start_date || '',
                endDate: data.end_date || undefined,
                status: data.status || 'planned',
                progress: data.progress || 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
            
            setWorkStages(prev => prev.map(stage => 
                stage.id === id ? updatedStage : stage
            ));

        } catch (error) {
            console.error('Ошибка при обновлении этапа работ:', error);
            throw error;
        }
    }, []);
    
    const deleteWorkStage = useCallback(async (id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            const { error } = await supabase
                .from('work_stages')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            
            if (error) {
                console.error('Ошибка удаления этапа работ:', error);
                throw error;
            }
            
            setWorkStages(prev => prev.filter(w => w.id !== id));

        } catch (error) {
            console.error('Ошибка при удалении этапа работ:', error);
            throw error;
        }
    }, []);
    
    const getWorkStagesByProject = useCallback((projectId: string) => {
        return workStages.filter(w => w.projectId === projectId);
    }, [workStages]);

    // Финансовые расчеты
    const calculateProjectFinancials = useCallback((projectId: string, estimates: any[]): ProjectFinancials => {
        const projectEstimates = estimates.filter(e => e.project_id === projectId);
        const projectFinances = getFinanceEntriesByProject(projectId);
        
        const estimateTotal = projectEstimates.reduce((sum, est) => {
            // Проверяем, что est.items существует и является массивом
            if (!est.items || !Array.isArray(est.items)) {
                console.warn('Estimate items is undefined or not an array:', est);
                return sum;
            }
            
            const subtotal = est.items.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
            const discountAmount = est.discountType === 'percent' ? subtotal * (est.discount / 100) : est.discount;
            const totalAfterDiscount = subtotal - discountAmount;
            const taxAmount = totalAfterDiscount * (est.tax / 100);
            return sum + totalAfterDiscount + taxAmount;
        }, 0);
        
        const paidTotal = projectFinances
            .filter(f => f.type === 'income')
            .reduce((sum, f) => sum + f.amount, 0);
        
        const expensesTotal = projectFinances
            .filter(f => f.type === 'expense')
            .reduce((sum, f) => sum + f.amount, 0);
        
        const expensesBreakdown = projectFinances
            .filter(f => f.type === 'expense')
            .reduce((acc, f) => {
                const categoryName = f.category || 'Другое';
                acc[categoryName] = (acc[categoryName] || 0) + f.amount;
                return acc;
            }, {} as Record<string, number>);
        
        const profit = paidTotal - expensesTotal;
        const profitability = estimateTotal > 0 ? (profit / estimateTotal) * 100 : 0;
        
        const cashFlowEntries = projectFinances.map(f => ({
            date: f.date,
            type: f.type as 'income' | 'expense',
            amount: f.amount,
            description: f.description
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return {
            estimateTotal,
            paidTotal,
            expensesTotal,
            expensesBreakdown: Object.entries(expensesBreakdown).map(([categoryName, amount]) => ({
                categoryName,
                amount
            })),
            profit,
            profitability,
            cashFlowEntries
        };
    }, [getFinanceEntriesByProject]);

    return {
        // Состояние
        financeEntries,
        workStages,
        loading,
        error,
        
        // Основные функции
        loadProjectData,
        
        // Финансовые операции
        addFinanceEntry,
        updateFinanceEntry,
        deleteFinanceEntry,
        getFinanceEntriesByProject,
        
        // Операции с этапами работ
        addWorkStage,
        updateWorkStage,
        deleteWorkStage,
        getWorkStagesByProject,
        
        // Утилиты
        calculateProjectFinancials,
    };
};
