import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { UserPreferences } from '@/types/library';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const PREFERENCES_KEY = '@user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark' as const,
  contentLanguage: 'tr-TR',
  uiLanguage: 'tr',
  ageRestriction: false,
  autoPlayTrailers: false,
  hapticsEnabled: true,
  favoriteGenres: [],
  hasCompletedOnboarding: false,
};

export const [PreferencesProvider, usePreferences] = createContextHook(() => {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (isAuthenticated && user) {
        console.log('[PreferencesContext] Loading from Supabase for user:', user.email);
        const { data, error } = await supabase
          .from('preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          const supabasePrefs: UserPreferences = {
            theme: data.theme as 'light' | 'dark',
            contentLanguage: data.content_language,
            uiLanguage: data.ui_language,
            ageRestriction: data.age_restriction,
            autoPlayTrailers: data.auto_play_trailers,
            hapticsEnabled: data.haptics_enabled,
            favoriteGenres: data.favorite_genres || [],
            hasCompletedOnboarding: data.has_completed_onboarding,
            hasSeenBackupWarning: data.has_seen_backup_warning,
          };
          setPreferences(supabasePrefs);
          await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(supabasePrefs));
          console.log('[PreferencesContext] Loaded from Supabase');
        } else {
          console.log('[PreferencesContext] No preferences in Supabase, using defaults');
          const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
          if (stored) {
            setPreferences(JSON.parse(stored));
            console.log('[PreferencesContext] Using local storage preferences');
          } else {
            setPreferences(DEFAULT_PREFERENCES);
            console.log('[PreferencesContext] Using default preferences');
          }
        }
      } else {
        console.log('[PreferencesContext] Loading from local storage');
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('[PreferencesContext] Failed to load preferences:', error);
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      console.log('[PreferencesContext] Saved to local storage');
    } catch (error) {
      console.error('[PreferencesContext] Failed to save to local storage:', error);
    }
  };

  const syncToSupabase = useCallback(async (prefs: UserPreferences) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('preferences')
        .upsert({
          user_id: user.id,
          theme: prefs.theme,
          content_language: prefs.contentLanguage,
          ui_language: prefs.uiLanguage,
          age_restriction: prefs.ageRestriction,
          auto_play_trailers: prefs.autoPlayTrailers,
          haptics_enabled: prefs.hapticsEnabled,
          favorite_genres: prefs.favoriteGenres,
          has_completed_onboarding: prefs.hasCompletedOnboarding,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      console.log('[PreferencesContext] Synced to Supabase');
    } catch (error) {
      console.error('[PreferencesContext] Failed to sync to Supabase:', error);
      console.error('[PreferencesContext] Full error:', JSON.stringify(error, null, 2));
    }
  }, [isAuthenticated, user]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    console.log('[Preferences] Updating:', updates);
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
    await syncToSupabase(newPreferences);
  }, [preferences, syncToSupabase]);

  const toggleFavoriteGenre = useCallback((genreId: number) => {
    const currentGenres = preferences.favoriteGenres || [];
    const favoriteGenres = currentGenres.includes(genreId)
      ? currentGenres.filter(id => id !== genreId)
      : [...currentGenres, genreId];
    
    updatePreferences({ favoriteGenres });
  }, [preferences.favoriteGenres, updatePreferences]);

  return useMemo(() => ({
    preferences,
    isLoading,
    updatePreferences,
    toggleFavoriteGenre,
  }), [preferences, isLoading, updatePreferences, toggleFavoriteGenre]);
});
