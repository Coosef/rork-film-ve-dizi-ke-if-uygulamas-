import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 10;

export const [SearchHistoryProvider, useSearchHistory] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (isAuthenticated && user) {
        console.log('[SearchHistory] Loading from Supabase for user:', user.email);
        const { data, error } = await supabase
          .from('search_history')
          .select('query, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_HISTORY_ITEMS);
        
        if (error) throw error;
        
        const queries = (data || []).map(item => item.query);
        setHistory(queries);
        await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(queries));
        console.log('[SearchHistory] Loaded from Supabase:', queries.length, 'items');
      } else {
        console.log('[SearchHistory] Loading from local storage');
        const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('[SearchHistory] Error loading history:', error instanceof Error ? error.message : String(error));
      console.error('[SearchHistory] Full error:', JSON.stringify(error, null, 2));
      try {
        const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (stored) {
          setHistory(JSON.parse(stored));
          console.log('[SearchHistory] Fallback to local storage successful');
        }
      } catch (localError) {
        console.error('[SearchHistory] Failed to load from local storage:', localError instanceof Error ? localError.message : String(localError));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveHistory = async (newHistory: string[]) => {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('[SearchHistory] Error saving history:', error);
    }
  };

  const syncToSupabase = useCallback(async (query: string) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          query,
          created_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      console.log('[SearchHistory] Synced to Supabase:', query);
    } catch (error) {
      console.error('[SearchHistory] Failed to sync to Supabase:', error instanceof Error ? error.message : String(error));
    }
  }, [isAuthenticated, user]);

  const deleteFromSupabase = useCallback(async (query: string) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id)
        .eq('query', query);
      
      if (error) throw error;
      console.log('[SearchHistory] Deleted from Supabase:', query);
    } catch (error) {
      console.error('[SearchHistory] Failed to delete from Supabase:', error instanceof Error ? error.message : String(error));
    }
  }, [isAuthenticated, user]);

  const clearSupabase = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      console.log('[SearchHistory] Cleared Supabase history');
    } catch (error) {
      console.error('[SearchHistory] Failed to clear Supabase:', error instanceof Error ? error.message : String(error));
    }
  }, [isAuthenticated, user]);

  const addToHistory = useCallback(async (query: string) => {
    const filtered = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    const newHistory = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    setHistory(newHistory);
    await saveHistory(newHistory);
    await syncToSupabase(query);
  }, [history, syncToSupabase]);

  const removeFromHistory = useCallback(async (query: string) => {
    const newHistory = history.filter(item => item !== query);
    setHistory(newHistory);
    await saveHistory(newHistory);
    await deleteFromSupabase(query);
  }, [history, deleteFromSupabase]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await saveHistory([]);
    await clearSupabase();
  }, [clearSupabase]);

  return useMemo(() => ({
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }), [history, isLoading, addToHistory, removeFromHistory, clearHistory]);
});
