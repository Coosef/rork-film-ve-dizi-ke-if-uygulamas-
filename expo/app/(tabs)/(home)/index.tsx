import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Plus, Info, Search, Clock, Sparkles } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  TextInput,
  RefreshControl,
} from 'react-native';

import Colors from '@/constants/colors';
import MovieShelf from '@/components/MovieShelf';

import { useLibrary } from '@/contexts/LibraryContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getTrending,
  getPopular,
  getTopRated,
  convertMovieToMediaItem,
  searchMovies,
  getUpcoming,
  getMovieDetails,
} from '@/services/tmdb';
import { MediaItem, Movie } from '@/types/tmdb';
// import { getAIRecommendations } from '@/services/ai-recommendations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { addInteraction, getInteractionsByType, interactions } = useLibrary();
  const { isLoading: preferencesLoading, preferences } = usePreferences();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const trendingQuery = useQuery({
    queryKey: ['trending'],
    queryFn: () => getTrending(),
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 12,
  });

  const popularQuery = useQuery({
    queryKey: ['popular'],
    queryFn: () => getPopular(),
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 12,
  });

  const topRatedQuery = useQuery({
    queryKey: ['topRated'],
    queryFn: () => getTopRated(),
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 12,
  });

  const newReleasesQuery = useQuery({
    queryKey: ['newReleases'],
    queryFn: () => getUpcoming(),
    staleTime: 1000 * 60 * 60 * 1,
    gcTime: 1000 * 60 * 60 * 6,
  });

  const searchQuery_data = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchMovies(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const heroShows = (trendingQuery.data?.results || []).slice(0, 5);
  const currentHero = heroShows[0];

  const watchingInteractions = useMemo(() => {
    return getInteractionsByType('watching');
  }, [getInteractionsByType]);

  const continueWatchingQuery = useQuery({
    queryKey: ['continueWatching', watchingInteractions.map(i => i.mediaId), watchingInteractions.length],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      console.log('[ContinueWatching] Fetching movies for', watchingInteractions.length, 'interactions');
      const movies = await Promise.all(
        watchingInteractions.map(async (interaction) => {
          try {
            const movie = await getMovieDetails(interaction.mediaId);
            console.log('[ContinueWatching] Fetched movie:', movie.title, 'Image:', movie.poster_path);
            return { movie, interaction };
          } catch (error) {
            console.error('[ContinueWatching] Error fetching movie:', error);
            return null;
          }
        })
      );
      const filtered = movies.filter(Boolean);
      console.log('[ContinueWatching] Total movies fetched:', filtered.length);
      return filtered.sort((a, b) => {
        const dateA = new Date(a!.interaction.watchProgress?.lastWatchedAt || 0).getTime();
        const dateB = new Date(b!.interaction.watchProgress?.lastWatchedAt || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: watchingInteractions.length > 0,
  });

  const continueWatchingMovies = continueWatchingQuery.data || [];

  const [useAIRecommendations] = useState(true);

  const recommendedQuery = useQuery({
    queryKey: ['recommended', interactions.map(i => i.mediaId).join(','), preferences.favoriteGenres?.join(',') || '', useAIRecommendations],
    staleTime: 1000 * 60 * 60 * 1,
    gcTime: 1000 * 60 * 60 * 6,
    queryFn: async () => {
      const favoriteInteractions = getInteractionsByType('favorite');
      const watchedInteractions = getInteractionsByType('watched');
      const watchingInteractionsList = getInteractionsByType('watching');
      const allInteractions = [...favoriteInteractions, ...watchedInteractions, ...watchingInteractionsList];
      
      console.log('[Recommended] Using genre-based recommendations');
      const genreCounts: Record<number, number> = {};
      
      if (preferences.favoriteGenres && preferences.favoriteGenres.length > 0) {
        console.log('[Recommended] Using onboarding genres:', preferences.favoriteGenres);
        preferences.favoriteGenres.forEach((genreId: number) => {
          genreCounts[genreId] = (genreCounts[genreId] || 0) + 5;
        });
      }
      
      for (const interaction of allInteractions.slice(0, 15)) {
        try {
          const movie = await getMovieDetails(interaction.mediaId);
          
          movie.genres?.forEach((genre) => {
            const weight = interaction.type === 'favorite' ? 3 : interaction.type === 'watching' ? 2 : 1;
            genreCounts[genre.id] = (genreCounts[genre.id] || 0) + weight;
          });
        } catch (error) {
          console.error('[Recommended] Error fetching movie:', error);
        }
      }

      const topGenreIds = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genreId]) => parseInt(genreId));

      if (topGenreIds.length === 0) {
        return [];
      }

      console.log('[Recommended] Top genre IDs:', topGenreIds);

      const [popularMovies, topRatedMovies, trendingMovies] = await Promise.all([
        getPopular(),
        getTopRated(),
        getTrending(),
      ]);
      
      const allMovies = [...popularMovies.results, ...topRatedMovies.results, ...trendingMovies.results];
      const uniqueMovies = Array.from(new Map(allMovies.map(movie => [movie.id, movie])).values());
      const watchedIds = new Set(interactions.map(i => i.mediaId));
      
      const recommended = uniqueMovies
        .filter(movie => !watchedIds.has(movie.id))
        .filter(movie => movie.genre_ids.some(genreId => topGenreIds.includes(genreId)))
        .map(movie => {
          const genreMatchCount = movie.genre_ids.filter(g => topGenreIds.includes(g)).length;
          const genreScore = genreMatchCount * 10;
          const ratingScore = movie.vote_average || 0;
          const popularityScore = Math.min(movie.popularity / 100, 10);
          
          return {
            ...movie,
            recommendationScore: genreScore + ratingScore + popularityScore,
          };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 20);

      console.log('[Recommended] Generated', recommended.length, 'recommendations');
      return recommended;
    },
    enabled: true,
  });

  const recommendedMovies = recommendedQuery.data || [];

  const handleShowPress = (movie: MediaItem) => {
    console.log('[Home] Movie pressed:', movie.title);
    router.push(`/movie/${movie.id}` as any);
  };

  const handleAddToWatchlist = async () => {
    if (currentHero) {
      await addInteraction(currentHero.id, 'movie', 'watchlist');
      console.log('[Home] Added to watchlist:', currentHero.title);
    }
  };

  const handlePlayTrailer = () => {
    if (currentHero) {
      router.push(`/movie/${currentHero.id}` as any);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      trendingQuery.refetch(),
      popularQuery.refetch(),
      topRatedQuery.refetch(),
      newReleasesQuery.refetch(),
      recommendedQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const getMovieImageUrl = (path: string | null, size: 'w200' | 'w500' | 'w780' | 'original' = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const isSearching = searchQuery.length > 2;
  const searchResults = searchQuery_data.data?.results || [];

  const isLoading = trendingQuery.isLoading || popularQuery.isLoading || topRatedQuery.isLoading || preferencesLoading;
  const hasError = trendingQuery.error || popularQuery.error || topRatedQuery.error;
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Bir hata oluştu</Text>
        <Text style={styles.errorText}>İçerik yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.</Text>
        <Pressable style={styles.retryButton} onPress={() => void handleRefresh()}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      >
        {isSearching ? (
          <View style={styles.searchResults}>
            <Text style={styles.searchTitle}>{t('home.searchResults')}</Text>
            {searchQuery_data.isLoading ? (
              <Text style={styles.loadingText}>{t('home.searching')}</Text>
            ) : searchResults.length === 0 ? (
              <Text style={styles.emptyText}>{t('home.noResults')}</Text>
            ) : (
              <MovieShelf
                title=""
                movies={searchResults.map((movie) => convertMovieToMediaItem(movie))}
                onMoviePress={handleShowPress}
              />
            )}
          </View>
        ) : (
          <>
        {currentHero && (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: getMovieImageUrl(currentHero.backdrop_path, 'original') }}
              style={styles.heroImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', Colors.dark.background]}
              style={styles.heroGradient}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>{currentHero.title}</Text>
                <Text style={styles.heroOverview} numberOfLines={3}>
                  {currentHero.overview || ''}
                </Text>
                <View style={styles.heroActions}>
                  <Pressable style={styles.playButton} onPress={handlePlayTrailer}>
                    <Play size={20} color={Colors.dark.background} fill={Colors.dark.background} />
                    <Text style={styles.playButtonText}>{t('home.watchTrailer')}</Text>
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={handleAddToWatchlist}>
                    <Plus size={24} color={Colors.dark.text} />
                  </Pressable>
                  <Pressable 
                    style={styles.iconButton}
                    onPress={() => handleShowPress(convertMovieToMediaItem(currentHero))}
                  >
                    <Info size={24} color={Colors.dark.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {continueWatchingMovies.length > 0 && (
          <View style={styles.continueWatchingSection}>
            <Text style={styles.continueWatchingTitle}>{t('home.continueWatching')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.continueWatchingScroll}
            >
              {continueWatchingMovies.map((item: any) => {
                const { movie, interaction } = item;
                const progress = interaction.watchProgress;
                const progressPercentage = progress
                  ? (progress.watchedEpisodes / progress.totalEpisodes) * 100
                  : 0;

                const imageUrl = getMovieImageUrl(movie.poster_path, 'w500');
                console.log('[ContinueWatching] Rendering card for:', movie.title, 'Image URL:', imageUrl);

                return (
                  <Pressable
                    key={movie.id}
                    style={styles.continueWatchingCard}
                    onPress={() => router.push(`/movie/${movie.id}` as any)}
                  >
                    {movie.poster_path ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.continueWatchingImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.continueWatchingImage, { backgroundColor: Colors.dark.surfaceLight }]} />
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0, 0, 0, 0.9)']}
                      style={styles.continueWatchingGradient}
                    />
                    <View style={styles.continueWatchingContent}>
                      <View style={styles.continueWatchingBadge}>
                        <Clock size={12} color={Colors.dark.primary} />
                        <Text style={styles.continueWatchingBadgeText}>{t('home.continue')}</Text>
                      </View>
                      <Text style={styles.continueWatchingShowTitle} numberOfLines={2}>
                        {movie.title}
                      </Text>
                      <View style={styles.continueWatchingProgress}>
                        <View style={styles.continueWatchingProgressBar}>
                          <View
                            style={[
                              styles.continueWatchingProgressFill,
                              { width: `${progressPercentage}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.continueWatchingProgressText}>
                          {progress?.watchedEpisodes || 0}/{progress?.totalEpisodes || 0}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.continueWatchingButton}
                        onPress={() => router.push(`/movie/${movie.id}` as any)}
                      >
                        <Play
                          size={16}
                          color={Colors.dark.background}
                          fill={Colors.dark.background}
                        />
                        <Text style={styles.continueWatchingButtonText}>{t('home.continue')}</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.shelvesContainer}>
          {(!trendingQuery.data?.results?.length && !popularQuery.data?.results?.length) && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>İçerik yüklenemedi</Text>
              <Text style={styles.emptyDescription}>Şu anda içerik gösterilemiyor. İnternet bağlantınızı kontrol edin ve tekrar deneyin.</Text>
              <Pressable style={styles.retryButton} onPress={() => void handleRefresh()}>
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </Pressable>
            </View>
          )}
          {recommendedMovies.length > 0 && (
            <View>
              <View style={styles.shelfHeader}>
                <View style={styles.shelfTitleContainer}>
                  <Sparkles size={20} color={Colors.dark.primary} />
                  <Text style={styles.shelfTitle}>{t('home.forYou')}</Text>
                </View>
              </View>
              <MovieShelf
                title=""
                movies={recommendedMovies.filter(Boolean).map((movie: Movie) => convertMovieToMediaItem(movie))}
                onMoviePress={handleShowPress}
              />
            </View>
          )}
          {newReleasesQuery.data && 'results' in newReleasesQuery.data && newReleasesQuery.data.results.length > 0 && (
            <MovieShelf
              title={t('home.newReleases')}
              movies={newReleasesQuery.data.results.map(convertMovieToMediaItem)}
              onMoviePress={handleShowPress}
            />
          )}
          {trendingQuery.data?.results && trendingQuery.data.results.length > 0 && (
            <MovieShelf
              title={t('home.trending')}
              movies={trendingQuery.data.results.map(convertMovieToMediaItem)}
              onMoviePress={handleShowPress}
            />
          )}
          {popularQuery.data?.results && popularQuery.data.results.length > 0 && (
            <MovieShelf
              title={t('home.popular')}
              movies={popularQuery.data.results.map(convertMovieToMediaItem)}
              onMoviePress={handleShowPress}
            />
          )}
          {topRatedQuery.data?.results && topRatedQuery.data.results.length > 0 && (
            <MovieShelf
              title={t('home.topRated')}
              movies={topRatedQuery.data.results.map(convertMovieToMediaItem)}
              onMoviePress={handleShowPress}
            />
          )}
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  heroInfo: {
    padding: 16,
    gap: 12,
  },
  heroTitle: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroOverview: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.text,
    paddingVertical: 12,
    borderRadius: 8,
  },
  playButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
  },
  shelvesContainer: {
    paddingVertical: 24,
  },
  shelfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  shelfTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 8,
  },
  shelfTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  aiPoweredBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiPoweredText: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  toggleAIButton: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  toggleAIText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: Colors.dark.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
  },
  searchResults: {
    padding: 16,
  },
  searchTitle: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 32,
  },
  errorTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyDescription: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 20,
  },
  continueWatchingSection: {
    marginBottom: 24,
  },
  continueWatchingTitle: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  continueWatchingScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  continueWatchingCard: {
    width: 280,
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  continueWatchingImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  continueWatchingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  continueWatchingContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 12,
  },
  continueWatchingBadge: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: `${Colors.dark.primary}30`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start' as const,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  continueWatchingBadgeText: {
    color: Colors.dark.primary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  continueWatchingShowTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  continueWatchingProgress: {
    gap: 8,
  },
  continueWatchingProgressBar: {
    height: 6,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  continueWatchingProgressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 3,
  },
  continueWatchingProgressText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  continueWatchingButton: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.dark.text,
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueWatchingButtonText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
