import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import { UserPreferences } from '@/types/library';
import { trpc } from '@/lib/trpc';

export const [PreferencesProvider, usePreferences] = createContextHook(() => {
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.preferences.get.useQuery();
  const updateMutation = trpc.preferences.update.useMutation({
    onMutate: async (updates) => {
      await utils.preferences.get.cancel();
      const previousData = utils.preferences.get.getData();
      utils.preferences.get.setData(undefined, (old) => ({
        ...old!,
        ...updates,
      }));
      return { previousData };
    },
    onError: (err, updates, context) => {
      if (context?.previousData) {
        utils.preferences.get.setData(undefined, context.previousData);
      }
    },
    onSettled: () => {
      utils.preferences.get.invalidate();
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
    try {
      await updateMutation.mutateAsync(updates);
      console.log('[Preferences] Update successful');
    } catch (error) {
      console.error('[Preferences] Update failed:', error);
      throw error;
    }
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
