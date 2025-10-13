import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Interaction, InteractionType, LibraryStats, WatchProgress, Review } from '@/types/library';
import { MediaType } from '@/types/tvmaze';

const LIBRARY_KEY = '@library_interactions';

export const [LibraryProvider, useLibrary] = createContextHook(() => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const stored = await AsyncStorage.getItem(LIBRARY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setInteractions(parsed);
        console.log('[LibraryContext] Successfully loaded library:', parsed.length, 'items');
      } else {
        console.log('[LibraryContext] No library data found, starting fresh');
      }
    } catch (error) {
      console.error('[LibraryContext] Failed to load library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLibrary = async (newInteractions: Interaction[]) => {
    try {
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(newInteractions));
      console.log('[LibraryContext] Successfully saved library:', newInteractions.length, 'items');
    } catch (error) {
      console.error('[LibraryContext] Failed to save library:', error);
    }
  };

  const addInteraction = useCallback((
    mediaId: number,
    mediaType: MediaType,
    type: InteractionType,
    rating?: number,
    note?: string,
    watchProgress?: WatchProgress,
    review?: Review
  ) => {
    console.log('[Library] Adding interaction for', mediaId, 'type:', type);
    setInteractions(prev => {
      const filtered = prev.filter(i => !(i.mediaId === mediaId && i.mediaType === mediaType));
      const newInteraction: Interaction = {
        id: `${mediaType}-${mediaId}-${Date.now()}`,
        mediaId,
        mediaType,
        type,
        rating,
        note,
        watchProgress,
        review,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newInteractions = [...filtered, newInteraction];
      saveLibrary(newInteractions);
      return newInteractions;
    });
  }, []);

  const removeInteraction = useCallback((mediaId: number, mediaType: MediaType) => {
    console.log('[Library] Removing interaction for', mediaId);
    setInteractions(prev => {
      const newInteractions = prev.filter(i => !(i.mediaId === mediaId && i.mediaType === mediaType));
      saveLibrary(newInteractions);
      return newInteractions;
    });
  }, []);

  const getInteraction = useCallback((mediaId: number, mediaType: MediaType): Interaction | undefined => {
    return interactions.find(i => i.mediaId === mediaId && i.mediaType === mediaType);
  }, [interactions]);

  const getInteractionsByType = useCallback((type: InteractionType): Interaction[] => {
    return interactions.filter(i => i.type === type);
  }, [interactions]);

  const isInWatchlist = useCallback((mediaId: number, mediaType: MediaType): boolean => {
    return interactions.some(i => i.mediaId === mediaId && i.mediaType === mediaType && i.type === 'watchlist');
  }, [interactions]);

  const isWatched = useCallback((mediaId: number, mediaType: MediaType): boolean => {
    return interactions.some(i => i.mediaId === mediaId && i.mediaType === mediaType && i.type === 'watched');
  }, [interactions]);

  const isFavorite = useCallback((mediaId: number, mediaType: MediaType): boolean => {
    return interactions.some(i => i.mediaId === mediaId && i.mediaType === mediaType && i.type === 'favorite');
  }, [interactions]);

  const getStats = useCallback((): LibraryStats => {
    const watched = interactions.filter(i => i.type === 'watched' || i.type === 'watching');
    const watchlist = interactions.filter(i => i.type === 'watchlist');
    const favorites = interactions.filter(i => i.type === 'favorite');

    const ratingsSum = watched.reduce((sum, i) => sum + (i.rating || 0), 0);
    const ratingsCount = watched.filter(i => i.rating).length;

    const totalEpisodesWatched = interactions.reduce((sum, i) => {
      return sum + (i.watchProgress?.watchedEpisodes || 0);
    }, 0);

    const allWatchDates = interactions
      .filter(i => i.watchProgress?.lastWatchedAt)
      .map(i => i.watchProgress!.lastWatchedAt!)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (allWatchDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const uniqueDates = [...new Set(allWatchDates.map(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      }))].sort((a, b) => b - a);

      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        
        if (i === 0) {
          const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 1) {
            currentStreak = 1;
            tempStreak = 1;
          }
        } else {
          const prevDate = new Date(uniqueDates[i - 1]);
          const daysDiff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            tempStreak++;
            if (i === 1 || currentStreak > 0) {
              currentStreak++;
            }
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
            if (currentStreak > 0) {
              currentStreak = 0;
            }
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    }

    return {
      totalWatched: watched.length,
      totalWatchlist: watchlist.length,
      totalFavorites: favorites.length,
      totalEpisodesWatched,
      genreDistribution: {},
      averageRating: ratingsCount > 0 ? ratingsSum / ratingsCount : 0,
      monthlyWatchTime: 0,
      currentStreak,
      longestStreak,
      lastWatchDate: allWatchDates[0],
    };
  }, [interactions]);

  const updateWatchProgress = useCallback((
    mediaId: number,
    mediaType: MediaType,
    watchProgress: WatchProgress
  ) => {
    const existing = getInteraction(mediaId, mediaType);
    const isFullyWatched = watchProgress.watchedEpisodes === watchProgress.totalEpisodes;
    const isPartiallyWatched = watchProgress.watchedEpisodes > 0 && watchProgress.watchedEpisodes < watchProgress.totalEpisodes;
    const hasNoWatchedEpisodes = watchProgress.watchedEpisodes === 0;
    
    const completionPercentage = (watchProgress.watchedEpisodes / watchProgress.totalEpisodes) * 100;
    const isNearlyComplete = completionPercentage >= 90;
    
    if (hasNoWatchedEpisodes && existing) {
      removeInteraction(mediaId, mediaType);
      return;
    }
    
    let newType: InteractionType = 'watched';
    if (isFullyWatched || isNearlyComplete) {
      newType = 'watched';
      console.log(`[Library] Auto-completing ${mediaId} at ${completionPercentage.toFixed(1)}% completion`);
    } else if (isPartiallyWatched) {
      newType = 'watching';
    } else if (existing?.type === 'watchlist') {
      newType = 'watchlist';
    }
    
    if (existing) {
      addInteraction(mediaId, mediaType, newType, existing.rating, existing.note, watchProgress, existing.review);
    } else {
      addInteraction(mediaId, mediaType, newType, undefined, undefined, watchProgress);
    }
  }, [getInteraction, addInteraction, removeInteraction]);

  const toggleEpisodeWatched = useCallback((
    mediaId: number,
    mediaType: MediaType,
    episodeId: number,
    totalEpisodes: number
  ) => {
    const existing = getInteraction(mediaId, mediaType);
    const currentProgress = existing?.watchProgress;
    const watchedIds = currentProgress?.watchedEpisodeIds || [];
    
    const isWatched = watchedIds.includes(episodeId);
    const newWatchedIds = isWatched
      ? watchedIds.filter(id => id !== episodeId)
      : [...watchedIds, episodeId];
    
    const newProgress: WatchProgress = {
      totalEpisodes,
      watchedEpisodes: newWatchedIds.length,
      watchedEpisodeIds: newWatchedIds,
      lastWatchedAt: new Date().toISOString(),
    };
    
    updateWatchProgress(mediaId, mediaType, newProgress);
  }, [getInteraction, updateWatchProgress]);

  const markAllEpisodesWatched = useCallback((
    mediaId: number,
    mediaType: MediaType,
    allEpisodeIds: number[]
  ) => {
    const newProgress: WatchProgress = {
      totalEpisodes: allEpisodeIds.length,
      watchedEpisodes: allEpisodeIds.length,
      watchedEpisodeIds: allEpisodeIds,
      lastWatchedAt: new Date().toISOString(),
    };
    
    updateWatchProgress(mediaId, mediaType, newProgress);
  }, [updateWatchProgress]);

  const isWatching = useCallback((mediaId: number, mediaType: MediaType): boolean => {
    return interactions.some(i => i.mediaId === mediaId && i.mediaType === mediaType && i.type === 'watching');
  }, [interactions]);

  const isEpisodeWatched = useCallback((mediaId: number, mediaType: MediaType, episodeId: number): boolean => {
    const interaction = getInteraction(mediaId, mediaType);
    return interaction?.watchProgress?.watchedEpisodeIds?.includes(episodeId) || false;
  }, [getInteraction]);

  const addReview = useCallback((
    mediaId: number,
    mediaType: MediaType,
    rating: number,
    text?: string
  ) => {
    const existing = getInteraction(mediaId, mediaType);
    const now = new Date().toISOString();
    
    const review: Review = {
      rating,
      text,
      createdAt: existing?.review?.createdAt || now,
      updatedAt: now,
    };
    
    if (existing) {
      addInteraction(
        mediaId,
        mediaType,
        existing.type,
        rating,
        existing.note,
        existing.watchProgress,
        review
      );
    } else {
      addInteraction(mediaId, mediaType, 'watched', rating, undefined, undefined, review);
    }
  }, [getInteraction, addInteraction]);

  const getReview = useCallback((mediaId: number, mediaType: MediaType): Review | undefined => {
    const interaction = getInteraction(mediaId, mediaType);
    return interaction?.review;
  }, [getInteraction]);

  return useMemo(() => ({
    interactions,
    isLoading,
    addInteraction,
    removeInteraction,
    getInteraction,
    getInteractionsByType,
    isInWatchlist,
    isWatched,
    isWatching,
    isFavorite,
    getStats,
    updateWatchProgress,
    toggleEpisodeWatched,
    markAllEpisodesWatched,
    isEpisodeWatched,
    addReview,
    getReview,
  }), [interactions, isLoading, addInteraction, removeInteraction, getInteraction, getInteractionsByType, isInWatchlist, isWatched, isWatching, isFavorite, getStats, updateWatchProgress, toggleEpisodeWatched, markAllEpisodesWatched, isEpisodeWatched, addReview, getReview]);
});
