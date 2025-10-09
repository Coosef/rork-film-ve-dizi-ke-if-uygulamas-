import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import { UserPreferences } from '@/types/library';
import { trpc } from '@/lib/trpc';

export const [PreferencesProvider, usePreferences] = createContextHook(() => {
  const preferencesQuery = trpc.preferences.get.useQuery();
  const updateMutation = trpc.preferences.update.useMutation({
    onSuccess: () => {
      preferencesQuery.refetch();
    },
  });

  const preferences = useMemo(() => preferencesQuery.data || {
    theme: 'dark' as const,
    contentLanguage: 'tr-TR',
    uiLanguage: 'tr',
    ageRestriction: false,
    autoPlayTrailers: false,
    hapticsEnabled: true,
    favoriteGenres: [],
    hasCompletedOnboarding: false,
  }, [preferencesQuery.data]);
  const isLoading = preferencesQuery.isLoading;

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    console.log('[Preferences] Updating:', updates);
    return new Promise<void>((resolve, reject) => {
      updateMutation.mutate(updates, {
        onSuccess: () => {
          console.log('[Preferences] Update successful');
          resolve();
        },
        onError: (error) => {
          console.error('[Preferences] Update failed:', error);
          reject(error);
        },
      });
    });
  }, [updateMutation]);

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
