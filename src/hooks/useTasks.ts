import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { dataService } from '../services/storageService';

export const useTasks = (session: Session | null) => {
    console.log('useTasks: Хук useTasks инициализируется');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Загрузка всех задач для текущего пользователя
    const fetchAllTasks = useCallback(async (session: Session | null) => {
        if (!session?.user) {
            console.log('useTasks: Нет сессии, очищаем задачи');
            setTasks([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('🔄 useTasks: Загружаем задачи из Supabase...');
            
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ useTasks: Ошибка загрузки задач:', error);
                setError(error.message);
                return;
            }

            console.log('✅ useTasks: Загружено задач:', data?.length || 0);

            if (data) {
                const mappedTasks: Task[] = data.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    projectId: row.project_id,
                    isCompleted: row.is_completed,
                    priority: row.priority,
                    tags: row.tags || [],
                    dueDate: row.due_date,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));

                setTasks(mappedTasks);
                // Кешируем для мгновенного старта
                dataService.setTasks(mappedTasks);
            } else {
                setTasks([]);
            }
        } catch (err) {
            console.error('❌ useTasks: Ошибка при загрузке задач:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    }, []);

    // Кеш‑первый показ задач
    useEffect(() => {
        const cached = dataService.getTasks();
        if (cached && cached.length) setTasks(cached);
    }, []);

    // Добавление новой задачи
    const addTask = useCallback(async (taskData: {
        title: string;
        projectId?: string | null;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        tags?: string[];
        dueDate?: string | null;
    }) => {
        if (!session?.user) {
            console.error('useTasks: Нет сессии для создания задачи');
            return null;
        }

        try {
            console.log('🔄 useTasks: Создаем новую задачу (оптимистично):', taskData);
            const now = new Date().toISOString();
            const optimistic: Task = {
                id: `temp_${Date.now()}`,
                title: taskData.title,
                projectId: taskData.projectId || null,
                isCompleted: false,
                priority: taskData.priority || 'medium',
                tags: taskData.tags || [],
                dueDate: taskData.dueDate || null,
                createdAt: now,
                updatedAt: now,
            };
            setTasks(prev => [optimistic, ...prev]);

            const insertData = {
                user_id: session.user.id,
                project_id: taskData.projectId || null,
                title: taskData.title,
                is_completed: false,
                priority: taskData.priority || 'medium',
                tags: taskData.tags || [],
                due_date: taskData.dueDate || null,
            };

            const { data, error } = await supabase
                .from('tasks')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;

            const newTask: Task = {
                id: data.id,
                title: data.title,
                projectId: data.project_id,
                isCompleted: data.is_completed,
                priority: data.priority,
                tags: data.tags || [],
                dueDate: data.due_date,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setTasks(prev => prev.map(t => t.id === optimistic.id ? newTask : t));
            return newTask;
        } catch (err) {
            console.error('❌ useTasks: Ошибка при создании задачи:', err);
            // Откат
            setTasks(prev => prev.filter(t => !t.id.startsWith('temp_')));
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            return null;
        }
    }, [session]);

    // Обновление задачи
    const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
        if (!session?.user) {
            console.error('useTasks: Нет сессии для обновления задачи');
            return null;
        }

        try {
            console.log('🔄 useTasks: Обновляем задачу:', taskId, updates);

            const updateData: any = {};
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
            if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
            if (updates.priority !== undefined) updateData.priority = updates.priority;
            if (updates.tags !== undefined) updateData.tags = updates.tags;
            if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
            // Оптимистичное обновление
            let prevTask: Task | undefined;
            setTasks(prev => {
                prevTask = prev.find(t => t.id === taskId);
                return prev.map(t => t.id === taskId ? ({ ...t, ...updates, updatedAt: new Date().toISOString() } as Task) : t);
            });

            const { data, error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', taskId)
                .eq('user_id', session.user.id)
                .select()
                .single();

            if (error) {
                console.error('❌ useTasks: Ошибка обновления задачи:', error);
                setError(error.message);
                // Откат
                setTasks(prev => prev.map(t => t.id === taskId ? (prevTask as Task) : t));
                return null;
            }

            console.log('✅ useTasks: Задача обновлена:', data);

            const updatedTask: Task = {
                id: data.id,
                title: data.title,
                projectId: data.project_id,
                isCompleted: data.is_completed,
                priority: data.priority,
                tags: data.tags || [],
                dueDate: data.due_date,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            setTasks(prev => prev.map(task => 
                task.id === taskId ? updatedTask : task
            ));

            return updatedTask;
        } catch (err) {
            console.error('❌ useTasks: Ошибка при обновлении задачи:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            return null;
        }
    }, [session]);

    // Удаление задачи
    const deleteTask = useCallback(async (taskId: string) => {
        if (!session?.user) {
            console.error('useTasks: Нет сессии для удаления задачи');
            return false;
        }

        try {
            console.log('🔄 useTasks: Удаляем задачу:', taskId);
            // Оптимистичное удаление
            const prevTasks = tasks;
            setTasks(prev => prev.filter(task => task.id !== taskId));

            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .eq('user_id', session.user.id);

            if (error) {
                console.error('❌ useTasks: Ошибка удаления задачи:', error);
                setError(error.message);
                // Откат
                setTasks(prevTasks);
                return false;
            }

            console.log('✅ useTasks: Задача удалена');

            setTasks(prev => prev.filter(task => task.id !== taskId));
            return true;
        } catch (err) {
            console.error('❌ useTasks: Ошибка при удалении задачи:', err);
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
            return false;
        }
    }, [session]);

    // Переключение статуса задачи
    const toggleTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('useTasks: Задача не найдена:', taskId);
            return null;
        }

        // Оптимистичный тоггл без ожидания
        const prev = task.isCompleted;
        setTasks(prevState => prevState.map(t => t.id === taskId ? { ...t, isCompleted: !prev } : t));
        try {
            return await updateTask(taskId, { isCompleted: !prev });
        } catch (e) {
            // Откат вернёт updateTask
            return null;
        }
    }, [tasks, updateTask]);

    // Получение задач по проекту
    const getTasksByProject = useCallback((projectId: string | null) => {
        return tasks.filter(task => task.projectId === projectId);
    }, [tasks]);

    // Получение общих задач (без проекта)
    const getGeneralTasks = useCallback(() => {
        return tasks.filter(task => task.projectId === null);
    }, [tasks]);

    // Очистка ошибок
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // Состояние
        tasks,
        loading,
        error,
        
        // Функции
        fetchAllTasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTask,
        getTasksByProject,
        getGeneralTasks,
        clearError,
    };
};
