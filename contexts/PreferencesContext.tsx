import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useEffect } from 'react';
import { UserPreferences } from '@/types/library';
import { trpc } from '@/lib/trpc';

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
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, {
    retry: 0,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
  });
  
  useEffect(() => {
    if (preferencesQuery.error) {
      console.error('[PreferencesContext] Failed to fetch preferences:', preferencesQuery.error);
      console.log('[PreferencesContext] Using default preferences');
    }
    if (preferencesQuery.isSuccess) {
      console.log('[PreferencesContext] Successfully fetched preferences:', preferencesQuery.data);
    }
  }, [preferencesQuery.error, preferencesQuery.isSuccess, preferencesQuery.data]);
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
      console.error('[PreferencesContext] Update mutation failed:', err);
      if (context?.previousData) {
        utils.preferences.get.setData(undefined, context.previousData);
      }
    },
    onSettled: () => {
      utils.preferences.get.invalidate();
    },
  });

  const preferences = useMemo(() => {
    if (preferencesQuery.data) {
      return preferencesQuery.data;
    }
    return DEFAULT_PREFERENCES;
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
