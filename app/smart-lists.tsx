import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Sparkles, Clock, Zap, TrendingUp, Eye, Star } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import MovieCard from '@/components/MovieCard';
import { useLibrary } from '@/contexts/LibraryContext';
import { getShowDetails, convertShowToMediaItem } from '@/services/tvmaze';
import { MediaItem } from '@/types/tvmaze';

type SmartListType = 'bingeWorthy' | 'hiddenGems' | 'quickWatch' | 'newSeasons' | 'abandoned' | 'quickFinish';

export default function SmartListsScreen() {
  const router = useRouter();
  const { getInteractionsByType } = useLibrary();
  const insets = useSafeAreaInsets();

  const allInteractions = useMemo(() => {
    return [
      ...getInteractionsByType('watchlist'),
      ...getInteractionsByType('watching'),
      ...getInteractionsByType('watched'),
      ...getInteractionsByType('favorite'),
    ];
  }, [getInteractionsByType]);

  const showsQuery = useQuery({
    queryKey: ['smartListsShows', allInteractions.map(i => i.mediaId)],
    queryFn: async () => {
      const shows = await Promise.all(
        allInteractions.map(i => getShowDetails(i.mediaId).catch(() => null))
      );
      return shows.filter(Boolean);
    },
    enabled: allInteractions.length > 0,
  });

  const shows = showsQuery.data || [];

  const smartLists = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const bingeWorthy = allInteractions.filter(i => {
      const show = shows.find(s => s?.id === i.mediaId);
      if (!show) return false;
      const rating = show.rating?.average || 0;
      const totalEpisodes = i.watchProgress?.totalEpisodes || 0;
      return rating >= 8.0 && totalEpisodes >= 20 && i.type !== 'watched';
    });

    const hiddenGems = allInteractions.filter(i => {
      const show = shows.find(s => s?.id === i.mediaId);
      if (!show) return false;
      const rating = show.rating?.average || 0;
      const weight = show.weight || 0;
      return rating >= 8.5 && weight < 80 && i.type !== 'watched';
    });

    const quickWatch = allInteractions.filter(i => {
      const show = shows.find(s => s?.id === i.mediaId);
      if (!show) return false;
      const totalEpisodes = i.watchProgress?.totalEpisodes || 0;
      const rating = show.rating?.average || 0;
      return totalEpisodes <= 12 && rating >= 7.5 && i.type !== 'watched';
    });

    return {
      bingeWorthy,
      hiddenGems,
      quickWatch,
      newSeasons: allInteractions.filter(i => {
        const lastWatched = i.watchProgress?.lastWatchedAt;
        if (!lastWatched) return false;
        return new Date(lastWatched) > threeMonthsAgo;
      }),
      abandoned: allInteractions.filter(i => {
        const progress = i.watchProgress;
        if (!progress) return false;
        const percentage = (progress.watchedEpisodes / progress.totalEpisodes) * 100;
        return percentage > 10 && percentage < 90;
      }),
      quickFinish: allInteractions.filter(i => {
        const progress = i.watchProgress;
        if (!progress) return false;
        return progress.totalEpisodes <= 10 && progress.watchedEpisodes < progress.totalEpisodes;
      }),
    };
  }, [allInteractions, shows]);

  const lists = [
    {
      key: 'bingeWorthy' as SmartListType,
      title: 'Maraton Yapılacaklar',
      description: 'Yüksek puanlı, uzun diziler',
      icon: TrendingUp,
      color: Colors.dark.primary,
      count: smartLists.bingeWorthy.length,
      interactions: smartLists.bingeWorthy,
    },
    {
      key: 'hiddenGems' as SmartListType,
      title: 'Gizli Hazineler',
      description: 'Az bilinen ama harika diziler',
      icon: Star,
      color: '#FFD700',
      count: smartLists.hiddenGems.length,
      interactions: smartLists.hiddenGems,
    },
    {
      key: 'quickWatch' as SmartListType,
      title: 'Hızlı İzlenenler',
      description: 'Kısa ve kaliteli diziler',
      icon: Zap,
      color: Colors.dark.accent,
      count: smartLists.quickWatch.length,
      interactions: smartLists.quickWatch,
    },
    {
      key: 'newSeasons' as SmartListType,
      title: 'Yeni Sezonu Çıkanlar',
      description: 'Son 3 ayda izlediğiniz diziler',
      icon: Sparkles,
      color: '#9333EA',
      count: smartLists.newSeasons.length,
      interactions: smartLists.newSeasons,
    },
    {
      key: 'abandoned' as SmartListType,
      title: 'Yarıda Bıraktıklarınız',
      description: 'Başladığınız ama bitirmediniz',
      icon: Clock,
      color: Colors.dark.warning,
      count: smartLists.abandoned.length,
      interactions: smartLists.abandoned,
    },
    {
      key: 'quickFinish' as SmartListType,
      title: 'Tek Sezonda Bitebilenler',
      description: '10 bölüm veya daha az',
      icon: Eye,
      color: '#10B981',
      count: smartLists.quickFinish.length,
      interactions: smartLists.quickFinish,
    },
  ];

  const handleMoviePress = (movie: MediaItem) => {
    router.push(`/movie/${movie.id}` as any);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Akıllı Listeler', headerShown: true }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <Text style={styles.headerTitle}>Akıllı Listeler</Text>
            <Text style={styles.headerSubtitle}>
              İzleme alışkanlıklarınıza göre özel listeler
            </Text>
          </View>

          {lists.map(list => {
            const movieIds = list.interactions.map(i => i.mediaId);
            
            return (
              <View key={list.key} style={styles.listSection}>
                <View style={styles.listHeader}>
                  <View style={styles.listHeaderLeft}>
                    <View style={[styles.listIcon, { backgroundColor: `${list.color}20` }]}>
                      <list.icon size={24} color={list.color} />
                    </View>
                    <View style={styles.listHeaderText}>
                      <Text style={styles.listTitle}>{list.title}</Text>
                      <Text style={styles.listDescription}>{list.description}</Text>
                    </View>
                  </View>
                  <View style={styles.listBadge}>
                    <Text style={styles.listBadgeText}>{list.count}</Text>
                  </View>
                </View>

                {list.count === 0 ? (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>Bu listede henüz dizi yok</Text>
                  </View>
                ) : (
                  <SmartListMovies movieIds={movieIds} onMoviePress={handleMoviePress} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

function SmartListMovies({ movieIds, onMoviePress }: { movieIds: number[]; onMoviePress: (movie: MediaItem) => void }) {
  const moviesQuery = useQuery({
    queryKey: ['smartList', movieIds],
    queryFn: async () => {
      const shows = await Promise.all(
        movieIds.map(id => getShowDetails(id).catch(() => null))
      );
      return shows.filter(Boolean).map(s => convertShowToMediaItem(s!));
    },
    enabled: movieIds.length > 0,
  });

  if (moviesQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const movies = moviesQuery.data || [];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.moviesScroll}
    >
      {movies.map(movie => (
        <View key={movie.id} style={styles.movieCard}>
          <MovieCard movie={movie} onPress={() => onMoviePress(movie)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  listSection: {
    marginBottom: 32,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderText: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  listDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  listBadge: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  listBadgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  emptyList: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  moviesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  movieCard: {
    width: 140,
  },
});
