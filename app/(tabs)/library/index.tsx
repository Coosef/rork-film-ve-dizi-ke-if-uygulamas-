import { useQuery } from '@tanstack/react-query';
import { useRouter, Href } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import { SlidersHorizontal, ArrowUpDown, X, Star, Calendar, TrendingUp, AlignLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import MovieCard from '@/components/MovieCard';
import GlassPanel from '@/components/GlassPanel';
import { useLibrary } from '@/contexts/LibraryContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getShowDetails, convertShowToMediaItem, GENRES } from '@/services/tvmaze';
import { MediaItem } from '@/types/tvmaze';

type TabType = 'watchlist' | 'watching' | 'watched' | 'favorite' | 'smart';
type SortType = 'title' | 'rating' | 'date' | 'popularity';

export default function LibraryScreen() {
  const router = useRouter();
  const { getInteractionsByType } = useLibrary();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType | 'smart'>('watchlist');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [sortAscending, setSortAscending] = useState(false);

  const interactions = activeTab === 'smart' ? [] : getInteractionsByType(activeTab);
  const movieIds = interactions.map(i => i.mediaId);

  const moviesQueries = useQuery({
    queryKey: ['library', activeTab, movieIds],
    queryFn: async () => {
      const shows = await Promise.all(
        movieIds.map(id => getShowDetails(id).catch(() => null))
      );
      return shows.filter(Boolean).map(s => convertShowToMediaItem(s!));
    },
    enabled: movieIds.length > 0,
    staleTime: 1000 * 60 * 60 * 1,
    gcTime: 1000 * 60 * 60 * 6,
  });

  const filteredAndSortedMovies = useMemo(() => {
    const allMovies = moviesQueries.data || [];
    let filtered = [...allMovies];

    if (selectedGenres.length > 0) {
      filtered = filtered.filter(movie => 
        movie.genres.some(genre => selectedGenres.includes(genre))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'rating':
          comparison = b.voteAverage - a.voteAverage;
          break;
        case 'date':
          comparison = new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
          break;
        case 'popularity':
          comparison = b.voteCount - a.voteCount;
          break;
      }
      return sortAscending ? -comparison : comparison;
    });

    return filtered;
  }, [moviesQueries.data, selectedGenres, sortBy, sortAscending]);

  const movies = filteredAndSortedMovies;

  const handleMoviePress = (movie: MediaItem) => {
    router.push(`/movie/${movie.id}` as any);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await moviesQueries.refetch();
    setRefreshing(false);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
  };

  const handleSortChange = (newSort: SortType) => {
    if (sortBy === newSort) {
      setSortAscending(!sortAscending);
    } else {
      setSortBy(newSort);
      setSortAscending(false);
    }
    setShowSortModal(false);
  };

  const allInteractions = useMemo(() => {
    return [
      ...getInteractionsByType('watchlist'),
      ...getInteractionsByType('watching'),
      ...getInteractionsByType('watched'),
      ...getInteractionsByType('favorite'),
    ];
  }, [getInteractionsByType]);

  const smartLists = useMemo(() => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return {
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
  }, [allInteractions]);

  const tabs: { key: TabType | 'smart'; label: string; count: number }[] = [
    { key: 'watchlist', label: t('library.watchlist'), count: getInteractionsByType('watchlist').length },
    { key: 'watching', label: t('library.watching'), count: getInteractionsByType('watching').length },
    { key: 'watched', label: t('library.watched'), count: getInteractionsByType('watched').length },
    { key: 'favorite', label: t('library.favorites'), count: getInteractionsByType('favorite').length },
    { key: 'smart', label: t('library.smartLists'), count: smartLists.newSeasons.length + smartLists.abandoned.length + smartLists.quickFinish.length },
  ];

  const getEmptyStateEmoji = () => {
    switch (activeTab) {
      case 'watchlist': return '📝';
      case 'watching': return '▶️';
      case 'watched': return '✅';
      case 'favorite': return '❤️';
      default: return '🎬';
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyEmoji}>{getEmptyStateEmoji()}</Text>
      </View>
      <Text style={styles.emptyTitle}>{t('library.empty')}</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'watchlist' && t('library.emptyWatchlist')}
        {activeTab === 'watching' && t('library.emptyWatching')}
        {activeTab === 'watched' && t('library.emptyWatched')}
        {activeTab === 'favorite' && t('library.emptyFavorites')}
      </Text>
      <Pressable 
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/discover' as Href)}
      >
        <Text style={styles.emptyButtonText}>{t('discover.title')}</Text>
      </Pressable>
    </View>
  );

  const sortOptions = [
    { key: 'title' as SortType, label: t('library.sortByTitle'), icon: AlignLeft },
    { key: 'rating' as SortType, label: t('library.sortByRating'), icon: Star },
    { key: 'date' as SortType, label: t('library.sortByDate'), icon: Calendar },
    { key: 'popularity' as SortType, label: t('library.sortByPopularity'), icon: TrendingUp },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('library.title')}</Text>
          <View style={styles.headerActions}>
            <Pressable 
              style={[styles.headerButton, selectedGenres.length > 0 && styles.headerButtonActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <SlidersHorizontal size={20} color={selectedGenres.length > 0 ? Colors.dark.text : Colors.dark.textSecondary} />
              {selectedGenres.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedGenres.length}</Text>
                </View>
              )}
            </Pressable>
            <Pressable 
              style={styles.headerButton}
              onPress={() => setShowSortModal(true)}
            >
              <ArrowUpDown size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>
        </View>
        {movieIds.length > 0 && movies.length > 0 && activeTab !== 'smart' && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>{t('library.completionRate')}</Text>
              <Text style={styles.completionPercentage}>
                {((movies.filter(m => {
                  const interaction = getInteractionsByType(activeTab).find(i => i.mediaId === m.id);
                  return interaction?.watchProgress?.watchedEpisodes === interaction?.watchProgress?.totalEpisodes && (interaction?.watchProgress?.totalEpisodes || 0) > 0;
                }).length / movies.length) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.completionBarContainer}>
              <View 
                style={[
                  styles.completionBar, 
                  { 
                    width: `${((movies.filter(m => {
                      const interaction = getInteractionsByType(activeTab).find(i => i.mediaId === m.id);
                      return interaction?.watchProgress?.watchedEpisodes === interaction?.watchProgress?.totalEpisodes && (interaction?.watchProgress?.totalEpisodes || 0) > 0;
                    }).length / movies.length) * 100)}%` 
                  }
                ]} 
              />
            </View>
            <Text style={styles.completionText}>
              {movies.filter(m => {
                const interaction = getInteractionsByType(activeTab).find(i => i.mediaId === m.id);
                return interaction?.watchProgress?.watchedEpisodes === interaction?.watchProgress?.totalEpisodes && (interaction?.watchProgress?.totalEpisodes || 0) > 0;
              }).length} / {movies.length} {t('profile.shows')} {t('library.completed')}
            </Text>
          </View>
        )}
      </View>

      {selectedGenres.length > 0 && (
        <View style={styles.activeFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersContent}>
            {selectedGenres.map(genre => (
              <Pressable
                key={genre}
                style={styles.activeFilterChip}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={styles.activeFilterText}>{genre}</Text>
                <X size={14} color={Colors.dark.text} />
              </Pressable>
            ))}
            <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>{t('library.clear')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {activeTab === 'smart' ? (
        <View style={styles.smartListsContainer}>
          <Pressable
            style={styles.smartListsButton}
            onPress={() => router.push('/smart-lists' as Href)}
          >
            <Text style={styles.smartListsButtonText}>{t('library.viewSmartLists')}</Text>
          </Pressable>
        </View>
      ) : moviesQueries.isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : movies.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => `${item.id}`}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <MovieCard movie={item} onPress={() => handleMoviePress(item)} />
            </View>
          )}
        />
      )}

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('library.filter')}</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <X size={24} color={Colors.dark.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionTitle}>{t('library.genres')}</Text>
                  {selectedGenres.length > 0 && (
                    <Pressable onPress={clearFilters}>
                      <Text style={styles.clearText}>{t('library.clear')}</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.genreGrid}>
                  {GENRES.map(genre => (
                    <Pressable
                      key={genre}
                      style={[
                        styles.genreChip,
                        selectedGenres.includes(genre) && styles.genreChipActive,
                      ]}
                      onPress={() => toggleGenre(genre)}
                    >
                      <Text
                        style={[
                          styles.genreChipText,
                          selectedGenres.includes(genre) && styles.genreChipTextActive,
                        ]}
                      >
                        {genre}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable 
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>{t('library.apply')} ({movies.length} {t('library.results')})</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSortModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('library.sort')}</Text>
              <Pressable onPress={() => setShowSortModal(false)}>
                <X size={24} color={Colors.dark.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <GlassPanel style={styles.sortOptions}>
                {sortOptions.map((option, index) => (
                  <React.Fragment key={option.key}>
                    <Pressable
                      style={styles.sortOption}
                      onPress={() => handleSortChange(option.key)}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[
                          styles.sortOptionIcon,
                          sortBy === option.key && styles.sortOptionIconActive,
                        ]}>
                          <option.icon 
                            size={20} 
                            color={sortBy === option.key ? Colors.dark.primary : Colors.dark.textSecondary} 
                          />
                        </View>
                        <Text style={[
                          styles.sortOptionText,
                          sortBy === option.key && styles.sortOptionTextActive,
                        ]}>
                          {option.label}
                        </Text>
                      </View>
                      {sortBy === option.key && (
                        <Text style={styles.sortDirection}>
                          {sortAscending ? '↑' : '↓'}
                        </Text>
                      )}
                    </Pressable>
                    {index < sortOptions.length - 1 && <View style={styles.sortDivider} />}
                  </React.Fragment>
                ))}
              </GlassPanel>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '700' as const,
  },
  completionCard: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  completionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  completionPercentage: {
    color: Colors.dark.primary,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  completionBarContainer: {
    height: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  completionBar: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 4,
  },
  completionText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  tabsContainer: {
    minHeight: 50,
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    alignItems: 'center' as const,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tabActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  tabText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tabTextActive: {
    color: Colors.dark.text,
  },
  tabBadge: {
    backgroundColor: Colors.dark.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center' as const,
  },
  tabBadgeActive: {
    backgroundColor: Colors.dark.primaryLight,
  },
  tabBadgeText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  tabBadgeTextActive: {
    color: Colors.dark.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  headerButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: Colors.dark.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: Colors.dark.text,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  activeFilters: {
    paddingVertical: 8,
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeFilterText: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  clearFiltersText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalBackdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  applyButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  applyButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  filterSectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  clearText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  genreChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  genreChipText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  genreChipTextActive: {
    color: Colors.dark.text,
  },
  sortOptions: {
    padding: 0,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    padding: 16,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  sortOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sortOptionIconActive: {
    backgroundColor: `${Colors.dark.primary}20`,
  },
  sortOptionText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  sortOptionTextActive: {
    color: Colors.dark.text,
    fontWeight: '600' as const,
  },
  sortDirection: {
    color: Colors.dark.primary,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  sortDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 68,
  },
  smartListsContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  smartListsButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  smartListsButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
