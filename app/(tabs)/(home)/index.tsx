import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Plus, Info, Search, Clock } from 'lucide-react-native';
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
import {
  getTrending,
  getPopular,
  getTopRated,
  getImageUrl,
  convertShowToMediaItem,
  searchShows,
  getNewReleases,
} from '@/services/tvmaze';
import { MediaItem } from '@/types/tvmaze';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { addInteraction, getInteractionsByType, interactions } = useLibrary();
  const { isLoading: preferencesLoading } = usePreferences();
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
    queryFn: () => getNewReleases(),
    staleTime: 1000 * 60 * 60 * 1,
    gcTime: 1000 * 60 * 60 * 6,
  });

  const searchQuery_data = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchShows(searchQuery),
    enabled: searchQuery.length > 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const heroShows = trendingQuery.data?.slice(0, 5) || [];
  const currentHero = heroShows[0];

  const watchingInteractions = useMemo(() => {
    return getInteractionsByType('watching');
  }, [getInteractionsByType]);

  const continueWatchingQuery = useQuery({
    queryKey: ['continueWatching', watchingInteractions.map(i => i.mediaId), watchingInteractions.length],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      console.log('[ContinueWatching] Fetching shows for', watchingInteractions.length, 'interactions');
      const shows = await Promise.all(
        watchingInteractions.map(async (interaction) => {
          try {
            const response = await fetch(`https://api.tvmaze.com/shows/${interaction.mediaId}`);
            if (!response.ok) {
              console.error('[ContinueWatching] Failed to fetch show', interaction.mediaId, response.status);
              return null;
            }
            const show = await response.json();
            console.log('[ContinueWatching] Fetched show:', show.name, 'Image:', show.image?.original || show.image?.medium);
            return { show, interaction };
          } catch (error) {
            console.error('[ContinueWatching] Error fetching show:', error);
            return null;
          }
        })
      );
      const filtered = shows.filter(Boolean);
      console.log('[ContinueWatching] Total shows fetched:', filtered.length);
      return filtered.sort((a, b) => {
        const dateA = new Date(a!.interaction.watchProgress?.lastWatchedAt || 0).getTime();
        const dateB = new Date(b!.interaction.watchProgress?.lastWatchedAt || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: watchingInteractions.length > 0,
  });

  const continueWatchingShows = continueWatchingQuery.data || [];

  const recommendedQuery = useQuery({
    queryKey: ['recommended', interactions.map(i => i.mediaId).join(',')],
    staleTime: 1000 * 60 * 60 * 1,
    gcTime: 1000 * 60 * 60 * 6,
    queryFn: async () => {
      const favoriteInteractions = getInteractionsByType('favorite');
      const watchedInteractions = getInteractionsByType('watched');
      const watchingInteractions = getInteractionsByType('watching');
      const allInteractions = [...favoriteInteractions, ...watchedInteractions, ...watchingInteractions];
      
      if (allInteractions.length === 0) {
        return [];
      }

      const genreCounts: Record<string, number> = {};
      const ratingSum: Record<string, { sum: number; count: number }> = {};
      
      for (const interaction of allInteractions.slice(0, 15)) {
        try {
          const response = await fetch(`https://api.tvmaze.com/shows/${interaction.mediaId}`);
          if (!response.ok) continue;
          const show = await response.json();
          
          show.genres?.forEach((genre: string) => {
            const weight = interaction.type === 'favorite' ? 3 : interaction.type === 'watching' ? 2 : 1;
            genreCounts[genre] = (genreCounts[genre] || 0) + weight;
            
            if (interaction.rating) {
              if (!ratingSum[genre]) {
                ratingSum[genre] = { sum: 0, count: 0 };
              }
              ratingSum[genre].sum += interaction.rating;
              ratingSum[genre].count += 1;
            }
          });
        } catch (error) {
          console.error('[Recommended] Error fetching show:', error);
        }
      }

      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([genre]) => genre);

      if (topGenres.length === 0) {
        return [];
      }

      const [popularShows, topRatedShows, trendingShows] = await Promise.all([
        getPopular(),
        getTopRated(),
        getTrending(),
      ]);
      
      const allShows = [...popularShows, ...topRatedShows, ...trendingShows];
      const uniqueShows = Array.from(new Map(allShows.map(show => [show.id, show])).values());
      const watchedIds = new Set(interactions.map(i => i.mediaId));
      
      const recommended = uniqueShows
        .filter(show => !watchedIds.has(show.id))
        .filter(show => show.genres.some(genre => topGenres.includes(genre)))
        .map(show => {
          const genreMatchCount = show.genres.filter(g => topGenres.includes(g)).length;
          const genreScore = genreMatchCount * 10;
          const ratingScore = show.rating.average || 0;
          const popularityScore = Math.min(show.weight / 100, 10);
          
          return {
            ...show,
            recommendationScore: genreScore + ratingScore + popularityScore,
          };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 20);

      console.log('[Recommended] Generated', recommended.length, 'recommendations based on', topGenres.join(', '));
      return recommended;
    },
    enabled: interactions.length > 0,
  });

  const recommendedShows = recommendedQuery.data || [];

  const handleShowPress = (show: MediaItem) => {
    console.log('[Home] Show pressed:', show.title);
    router.push(`/movie/${show.id}` as any);
  };

  const handleAddToWatchlist = () => {
    if (currentHero) {
      addInteraction(currentHero.id, 'tv', 'watchlist');
      console.log('[Home] Added to watchlist:', currentHero.name);
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
    ]);
    setRefreshing(false);
  };

  const isSearching = searchQuery.length > 2;
  const searchResults = searchQuery_data.data || [];

  if (trendingQuery.isLoading || preferencesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
            placeholder="Dizi ara..."
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
            <Text style={styles.searchTitle}>Arama Sonuçları</Text>
            {searchQuery_data.isLoading ? (
              <Text style={styles.loadingText}>Aranıyor...</Text>
            ) : searchResults.length === 0 ? (
              <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
            ) : (
              <MovieShelf
                title=""
                movies={searchResults.map(convertShowToMediaItem)}
                onMoviePress={handleShowPress}
              />
            )}
          </View>
        ) : (
          <>
        {currentHero && (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: getImageUrl(currentHero, 'original') }}
              style={styles.heroImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', Colors.dark.background]}
              style={styles.heroGradient}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroInfo}>
                <Text style={styles.heroTitle}>{currentHero.name}</Text>
                <Text style={styles.heroOverview} numberOfLines={3}>
                  {currentHero.summary ? currentHero.summary.replace(/<[^>]*>/g, '') : ''}
                </Text>
                <View style={styles.heroActions}>
                  <Pressable style={styles.playButton} onPress={handlePlayTrailer}>
                    <Play size={20} color={Colors.dark.background} fill={Colors.dark.background} />
                    <Text style={styles.playButtonText}>Fragman İzle</Text>
                  </Pressable>
                  <Pressable style={styles.iconButton} onPress={handleAddToWatchlist}>
                    <Plus size={24} color={Colors.dark.text} />
                  </Pressable>
                  <Pressable 
                    style={styles.iconButton}
                    onPress={() => handleShowPress(convertShowToMediaItem(currentHero))}
                  >
                    <Info size={24} color={Colors.dark.text} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        {continueWatchingShows.length > 0 && (
          <View style={styles.continueWatchingSection}>
            <Text style={styles.continueWatchingTitle}>İzlemeye Devam Et</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.continueWatchingScroll}
            >
              {continueWatchingShows.map((item: any) => {
                const { show, interaction } = item;
                const progress = interaction.watchProgress;
                const progressPercentage = progress
                  ? (progress.watchedEpisodes / progress.totalEpisodes) * 100
                  : 0;

                const imageUrl = show.image?.original || show.image?.medium;
                console.log('[ContinueWatching] Rendering card for:', show.name, 'Image URL:', imageUrl);

                return (
                  <Pressable
                    key={show.id}
                    style={styles.continueWatchingCard}
                    onPress={() => router.push(`/movie/${show.id}` as any)}
                  >
                    {imageUrl ? (
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
                        <Text style={styles.continueWatchingBadgeText}>Devam Et</Text>
                      </View>
                      <Text style={styles.continueWatchingShowTitle} numberOfLines={2}>
                        {show.name}
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
                        onPress={() => router.push(`/movie/${show.id}` as any)}
                      >
                        <Play
                          size={16}
                          color={Colors.dark.background}
                          fill={Colors.dark.background}
                        />
                        <Text style={styles.continueWatchingButtonText}>Devam Et</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.shelvesContainer}>
          {recommendedShows.length > 0 && (
            <MovieShelf
              title="Sizin İçin Öneriler"
              movies={recommendedShows.map(convertShowToMediaItem)}
              onMoviePress={handleShowPress}
            />
          )}
          {newReleasesQuery.data && newReleasesQuery.data.length > 0 && (
            <MovieShelf
              title="Yeni Çıkanlar"
              movies={(newReleasesQuery.data || []).map(convertShowToMediaItem)}
              onMoviePress={handleShowPress}
            />
          )}
          <MovieShelf
            title="Trend Diziler"
            movies={(trendingQuery.data || []).map(convertShowToMediaItem)}
            onMoviePress={handleShowPress}
          />
          <MovieShelf
            title="Popüler"
            movies={(popularQuery.data || []).map(convertShowToMediaItem)}
            onMoviePress={handleShowPress}
          />
          <MovieShelf
            title="En Yüksek Puanlılar"
            movies={(topRatedQuery.data || []).map(convertShowToMediaItem)}
            onMoviePress={handleShowPress}
          />
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
