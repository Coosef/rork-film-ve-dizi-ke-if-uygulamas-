import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { UserPreferences } from '@/types/library';

const STORAGE_KEY = '@cinematch_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  contentLanguage: 'tr-TR',
  uiLanguage: 'tr',
  ageRestriction: false,
  autoPlayTrailers: false,
  hapticsEnabled: true,
  favoriteGenres: [],
};

export const [PreferencesProvider, usePreferences] = createContextHook(() => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      console.log('[Preferences] Loading from storage');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        console.log('[Preferences] Loaded:', parsed);
      }
    } catch (error) {
      console.error('[Preferences] Error loading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      console.log('[Preferences] Saved:', newPreferences);
    } catch (error) {
      console.error('[Preferences] Error saving:', error);
    }
  };

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    savePreferences(updated);
  }, [preferences]);

  const toggleFavoriteGenre = useCallback((genreId: number) => {
    const favoriteGenres = preferences.favoriteGenres.includes(genreId)
      ? preferences.favoriteGenres.filter(id => id !== genreId)
      : [...preferences.favoriteGenres, genreId];
    
    updatePreferences({ favoriteGenres });
  }, [preferences.favoriteGenres, updatePreferences]);

  return useMemo(() => ({
    preferences,
    isLoading,
    updatePreferences,
    toggleFavoriteGenre,
  }), [preferences, isLoading, updatePreferences, toggleFavoriteGenre]);
});
