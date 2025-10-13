import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { UserPreferences } from '@/types/library';

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
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
        console.log('[PreferencesContext] Successfully loaded preferences:', parsed);
      } else {
        console.log('[PreferencesContext] No preferences found, using defaults');
      }
    } catch (error) {
      console.error('[PreferencesContext] Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      console.log('[PreferencesContext] Successfully saved preferences');
    } catch (error) {
      console.error('[PreferencesContext] Failed to save preferences:', error);
    }
  };

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    console.log('[Preferences] Updating:', updates);
    setPreferences(prev => {
      const newPreferences = { ...prev, ...updates };
      savePreferences(newPreferences);
      return newPreferences;
    });
  }, []);

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
