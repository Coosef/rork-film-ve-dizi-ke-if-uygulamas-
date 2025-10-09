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

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    console.log('[Preferences] Updating:', updates);
    updateMutation.mutate(updates);
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
