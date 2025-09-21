import { useState, useCallback, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Note, NoteContext } from '../types';
import { dataService } from '../services/storageService';

export const useNotes = (session: Session | null) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Debouncing для сохранения заметок
    const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Загрузка всех заметок пользователя
    const fetchAllNotes = useCallback(async (session: Session | null) => {
        if (!session?.user?.id) {
            console.log('📝 useNotes: Нет сессии для загрузки заметок');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('📝 useNotes: Загружаем заметки для пользователя:', session.user.id);

            const { data: notesData, error: notesError } = await supabase
                .from('notes')
                .select('*')
                .eq('user_id', session.user.id)
                .order('updated_at', { ascending: false });

            if (notesError) {
                console.error('📝 useNotes: Ошибка загрузки заметок:', notesError);
                throw notesError;
            }

            // Преобразуем данные из Supabase в формат приложения
            const transformedNotes: Note[] = (notesData || []).map(note => ({
                id: note.id,
                userId: note.user_id,
                content: note.content || '',
                context: note.context,
                entityId: note.entity_id || null,
                createdAt: note.created_at,
                updatedAt: note.updated_at,
            }));

            setNotes(transformedNotes);
            // Кешируем для мгновенного старта
            dataService.setNotes(transformedNotes);
            console.log('📝 useNotes: Заметки загружены успешно:', transformedNotes.length);

        } catch (error) {
            console.error('📝 useNotes: Ошибка при загрузке заметок:', error);
            setError(error instanceof Error ? error.message : 'Ошибка загрузки заметок');
        } finally {
            setLoading(false);
        }
    }, []);

    // Кеш‑первый старт
    useEffect(() => {
        const cached = dataService.getNotes();
        if (cached && cached.length) setNotes(cached);
    }, []);

    // Получение заметки по контексту и entity_id
    const getNote = useCallback((context: NoteContext, entityId: string | null = null): string => {
        const note = notes.find(n => n.context === context && n.entityId === entityId);
        return note?.content || '';
    }, [notes]);

    // Сохранение заметки (upsert)
    const saveNote = useCallback(async (
        context: NoteContext, 
        content: string, 
        entityId: string | null = null
    ) => {
        if (!session?.user?.id) {
            console.error('📝 useNotes: Нет сессии для сохранения заметки');
            return;
        }

        // Сначала обновляем локальное состояние для мгновенного отображения
        const noteKey = `${context}_${entityId || 'null'}`;
        const existingNote = notes.find(n => n.context === context && n.entityId === entityId);
        
        if (existingNote) {
            // Обновляем существующую заметку в состоянии
            setNotes(prev => prev.map(note => 
                note.id === existingNote.id 
                    ? { ...note, content }
                    : note
            ));
        } else {
            // Создаем временную заметку для отображения
            const tempNote: Note = {
                id: `temp_${Date.now()}`,
                userId: session.user.id,
                content,
                context,
                entityId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setNotes(prev => [tempNote, ...prev]);
        }

        // Создаем ключ для debouncing
        const debounceKey = `${context}_${entityId || 'null'}`;
        
        // Очищаем предыдущий таймаут
        const existingTimeout = saveTimeouts.current.get(debounceKey);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Устанавливаем новый таймаут
        const timeout = setTimeout(async () => {
            try {
                console.log('📝 useNotes: Сохраняем заметку:', { context, entityId, contentLength: content.length });

                // Ищем существующую заметку (не временную)
                const existingNote = notes.find(n => 
                    n.context === context && 
                    n.entityId === entityId && 
                    !n.id.startsWith('temp_')
                );

                if (existingNote) {
                    // Обновляем существующую заметку
                    const { data, error } = await supabase
                        .from('notes')
                        .update({ content })
                        .eq('id', existingNote.id)
                        .eq('user_id', session.user.id)
                        .select()
                        .single();

                    if (error) {
                        console.error('📝 useNotes: Ошибка обновления заметки:', error);
                        throw error;
                    }

                    // Обновляем состояние
                    setNotes(prev => prev.map(note => 
                        note.id === existingNote.id 
                            ? { ...note, content, updatedAt: data.updated_at }
                            : note
                    ));

                    console.log('📝 useNotes: Заметка обновлена:', existingNote.id);

                } else {
                    // Создаем новую заметку
                    const { data, error } = await supabase
                        .from('notes')
                        .insert({
                            user_id: session.user.id,
                            content,
                            context,
                            entity_id: entityId,
                        })
                        .select()
                        .single();

                    if (error) {
                        console.error('📝 useNotes: Ошибка создания заметки:', error);
                        throw error;
                    }

                    // Заменяем временную заметку на реальную
                    const newNote: Note = {
                        id: data.id,
                        userId: data.user_id,
                        content: data.content,
                        context: data.context,
                        entityId: data.entity_id || null,
                        createdAt: data.created_at,
                        updatedAt: data.updated_at,
                    };

                    setNotes(prev => prev.map(note => 
                        note.context === context && note.entityId === entityId && note.id.startsWith('temp_')
                            ? newNote
                            : note
                    ));
                    console.log('📝 useNotes: Заметка создана:', newNote.id);
                }

            } catch (error) {
                console.error('📝 useNotes: Ошибка при сохранении заметки:', error);
                setError(error instanceof Error ? error.message : 'Ошибка сохранения заметки');
            }
        }, 500); // Debounce 500ms для более быстрого сохранения

        // Сохраняем таймаут
        saveTimeouts.current.set(debounceKey, timeout);

    }, [session, notes]);

    // Очистка таймаутов при размонтировании
    const cleanup = useCallback(() => {
        saveTimeouts.current.forEach(timeout => clearTimeout(timeout));
        saveTimeouts.current.clear();
    }, []);

    return {
        notes,
        loading,
        error,
        fetchAllNotes,
        getNote,
        saveNote,
        cleanup,
    };
};
