import { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { LibraryItem } from '../types';

export type NewLibraryItem = Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLibraryItem = Partial<Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>>;

export const useLibrary = (session: Session | null) => {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  const fetchLibraryItems = useCallback(async (sess: Session | null = session) => {
    if (!sess?.user?.id) {
      setLibraryItems([]);
      return;
    }
    const { data, error } = await supabase
      .from('library_items')
      .select('*')
      .eq('user_id', sess.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('useLibrary.fetchLibraryItems error:', error);
      return;
    }
    const mapped: LibraryItem[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price) || 0,
      unit: row.unit || '',
      category: row.category || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    setLibraryItems(mapped);
  }, [session]);

  const addLibraryItem = useCallback(async (item: NewLibraryItem) => {
    if (!session?.user?.id) return;
    const payload = {
      user_id: session.user.id,
      name: item.name,
      price: item.price,
      unit: item.unit,
      category: item.category ?? null,
    };
    const { data, error } = await supabase
      .from('library_items')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('useLibrary.addLibraryItem error:', error);
      return;
    }
    const inserted: LibraryItem = {
      id: data.id,
      name: data.name,
      price: Number(data.price) || 0,
      unit: data.unit,
      category: data.category || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    setLibraryItems(prev => [inserted, ...prev]);
  }, [session]);

  const updateLibraryItem = useCallback(async (id: string, item: UpdateLibraryItem) => {
    if (!session?.user?.id) return;
    const payload: any = {};
    if (item.name !== undefined) payload.name = item.name;
    if (item.price !== undefined) payload.price = item.price;
    if (item.unit !== undefined) payload.unit = item.unit;
    if (item.category !== undefined) payload.category = item.category ?? null;

    const { data, error } = await supabase
      .from('library_items')
      .update(payload)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('*')
      .single();
    if (error) {
      console.error('useLibrary.updateLibraryItem error:', error);
      return;
    }
    setLibraryItems(prev => prev.map(li => li.id === id ? {
      id: data.id,
      name: data.name,
      price: Number(data.price) || 0,
      unit: data.unit,
      category: data.category || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } : li));
  }, [session]);

  const deleteLibraryItem = useCallback(async (id: string) => {
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
    if (error) {
      console.error('useLibrary.deleteLibraryItem error:', error);
      return;
    }
    setLibraryItems(prev => prev.filter(li => li.id !== id));
  }, [session]);

  return {
    libraryItems,
    setLibraryItems,
    fetchLibraryItems,
    addLibraryItem,
    updateLibraryItem,
    deleteLibraryItem,
  };
};

export default useLibrary;

