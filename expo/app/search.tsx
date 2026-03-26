import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Search as SearchIcon, Clock, TrendingUp, X, SlidersHorizontal, Star, Calendar } from 'lucide-react-native';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import MovieCard from '@/components/MovieCard';
import GlassPanel from '@/components/GlassPanel';
import { searchShows, GENRES } from '@/services/tvmaze';
import { MediaItem } from '@/types/tvmaze';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'year' | 'title'>('relevance');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchQuery_ = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const shows = await searchShows(debouncedQuery);
      return shows.map(show => ({
        id: show.id,
        type: 'tv' as const,
        title: show.name,
        overview: show.summary ? show.summary.replace(/<[^>]*>/g, '') : '',
        posterPath: show.image?.medium || null,
        backdropPath: show.image?.original || null,
        releaseDate: show.premiered || '',
        voteAverage: show.rating.average || 0,
        voteCount: show.weight,
        genres: show.genres,
      }));
    },
    enabled: debouncedQuery.length > 0,
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      addToHistory(query.trim());
    }
  }, [addToHistory]);

  const handleHistoryItemPress = useCallback((query: string) => {
    setSearchQuery(query);
    addToHistory(query);
  }, [addToHistory]);

  const handleMoviePress = useCallback((movie: MediaItem) => {
    router.push(`/movie/${movie.id}` as any);
  }, [router]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);
  
  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }, []);
  
  const clearFilters = useCallback(() => {
    setSelectedGenres([]);
    setMinRating(0);
    setMinYear(1900);
    setMaxYear(new Date().getFullYear());
    setSortBy('relevance');
  }, []);

  const rawResults = searchQuery_.data || [];
  
  const filteredResults = useMemo(() => {
    let filtered = [...rawResults];
    
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(movie => 
        movie.genres.some(genre => selectedGenres.includes(genre))
      );
    }
    
    if (minRating > 0) {
      filtered = filtered.filter(movie => movie.voteAverage >= minRating);
    }
    
    if (minYear > 1900 || maxYear < new Date().getFullYear()) {
      filtered = filtered.filter(movie => {
        const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 0;
        return year >= minYear && year <= maxYear;
      });
    }
    
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.voteAverage - a.voteAverage);
        break;
      case 'year':
        filtered.sort((a, b) => {
          const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
          const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
          return yearB - yearA;
        });
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    
    return filtered;
  }, [rawResults, selectedGenres, minRating, minYear, maxYear, sortBy]);
  
  const results = filteredResults;
  const isSearching = searchQuery_.isLoading;
  const showResults = debouncedQuery.length > 0;
  const showHistory = !showResults && history.length > 0;
  const hasActiveFilters = selectedGenres.length > 0 || minRating > 0 || minYear > 1900 || maxYear < new Date().getFullYear() || sortBy !== 'relevance';

  const popularSearches = [
    'Breaking Bad',
    'Game of Thrones',
    'The Office',
    'Friends',
    'Stranger Things',
    'The Crown',
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <SearchIcon size={20} color={Colors.dark.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={Colors.dark.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={handleClearSearch} style={styles.clearButton}>
                <X size={20} color={Colors.dark.textSecondary} />
              </Pressable>
            )}
          </View>
          {showResults && (
            <Pressable 
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={() => setShowFilters(true)}
            >
              <SlidersHorizontal size={20} color={hasActiveFilters ? Colors.dark.text : Colors.dark.textSecondary} />
              <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>{t('common.filter')}</Text>
              {hasActiveFilters && <View style={styles.filterDot} />}
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {showHistory && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Clock size={20} color={Colors.dark.textSecondary} />
                  <Text style={styles.sectionTitle}>{t('search.recentSearches')}</Text>
                </View>
                <Pressable onPress={clearHistory}>
                  <Text style={styles.clearText}>{t('search.clear')}</Text>
                </Pressable>
              </View>
              <View style={styles.chipContainer}>
                {history.map((item: string, index: number) => (
                  <Pressable
                    key={index}
                    style={styles.chip}
                    onPress={() => handleHistoryItemPress(item)}
                  >
                    <Text style={styles.chipText}>{item}</Text>
                    <Pressable
                      onPress={() => removeFromHistory(item)}
                      hitSlop={8}
                    >
                      <X size={14} color={Colors.dark.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {!showResults && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <TrendingUp size={20} color={Colors.dark.textSecondary} />
                  <Text style={styles.sectionTitle}>{t('search.popularSearches')}</Text>
                </View>
              </View>
              <View style={styles.chipContainer}>
                {popularSearches.map((item, index) => (
                  <Pressable
                    key={index}
                    style={styles.chip}
                    onPress={() => handleHistoryItemPress(item)}
                  >
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {showResults && (
            <View style={styles.resultsSection}>
              {hasActiveFilters && (
                <View style={styles.activeFiltersContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
                    {selectedGenres.map(genre => (
                      <View key={genre} style={styles.activeFilterChip}>
                        <Text style={styles.activeFilterText}>{genre}</Text>
                        <Pressable onPress={() => toggleGenre(genre)}>
                          <X size={14} color={Colors.dark.text} />
                        </Pressable>
                      </View>
                    ))}
                    {minRating > 0 && (
                      <View style={styles.activeFilterChip}>
                        <Text style={styles.activeFilterText}>⭐ {minRating}+</Text>
                        <Pressable onPress={() => setMinRating(0)}>
                          <X size={14} color={Colors.dark.text} />
                        </Pressable>
                      </View>
                    )}
                    {(minYear > 1900 || maxYear < new Date().getFullYear()) && (
                      <View style={styles.activeFilterChip}>
                        <Text style={styles.activeFilterText}>{minYear}-{maxYear}</Text>
                        <Pressable onPress={() => { setMinYear(1900); setMaxYear(new Date().getFullYear()); }}>
                          <X size={14} color={Colors.dark.text} />
                        </Pressable>
                      </View>
                    )}
                    {sortBy !== 'relevance' && (
                      <View style={styles.activeFilterChip}>
                        <Text style={styles.activeFilterText}>
                          {sortBy === 'rating' ? t('discover.rating') : sortBy === 'year' ? t('discover.year') : t('search.sortByTitle')}
                        </Text>
                        <Pressable onPress={() => setSortBy('relevance')}>
                          <X size={14} color={Colors.dark.text} />
                        </Pressable>
                      </View>
                    )}
                    <Pressable style={styles.clearFiltersChip} onPress={clearFilters}>
                      <Text style={styles.clearFiltersText}>{t('discover.clearAll')}</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>{t('search.searching')}</Text>
                </View>
              ) : results.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {rawResults.length === 0 ? t('search.noResults') : t('search.noFilterResults')}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {rawResults.length === 0 ? t('search.tryDifferent') : t('search.tryChangingFilters')}
                  </Text>
                  {hasActiveFilters && (
                    <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
                      <Text style={styles.clearFiltersButtonText}>{t('search.clearFilters')}</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <>
                  <Text style={styles.resultsCount}>
                    {results.length} {t('search.resultsFound')} {rawResults.length !== results.length && `(${rawResults.length} ${t('search.total')})`}
                  </Text>
                  <FlatList
                    data={results}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    renderItem={({ item }) => (
                      <View style={styles.resultCard}>
                        <MovieCard movie={item} onPress={() => handleMoviePress(item)} />
                      </View>
                    )}
                    scrollEnabled={false}
                  />
                </>
              )}
            </View>
          )}
        </ScrollView>
        
        <Modal
          visible={showFilters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowFilters(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('search.filterAndSort')}</Text>
                <Pressable onPress={() => setShowFilters(false)}>
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>{t('search.sorting')}</Text>
                  <GlassPanel style={styles.sortOptions}>
                    {[
                      { key: 'relevance' as const, label: t('search.relevance'), icon: TrendingUp },
                      { key: 'rating' as const, label: t('discover.rating'), icon: Star },
                      { key: 'year' as const, label: t('discover.year'), icon: Calendar },
                      { key: 'title' as const, label: t('search.sortByTitle'), icon: SearchIcon },
                    ].map((option, index) => (
                      <React.Fragment key={option.key}>
                        <Pressable
                          style={styles.sortOption}
                          onPress={() => setSortBy(option.key)}
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
                            <View style={styles.sortCheckmark}>
                              <Text style={styles.sortCheckmarkText}>✓</Text>
                            </View>
                          )}
                        </Pressable>
                        {index < 3 && <View style={styles.sortDivider} />}
                      </React.Fragment>
                    ))}
                  </GlassPanel>
                </View>
                
                <View style={styles.filterSection}>
                  <View style={styles.filterSectionHeader}>
                    <Text style={styles.filterSectionTitle}>{t('library.genres')}</Text>
                    {selectedGenres.length > 0 && (
                      <Pressable onPress={() => setSelectedGenres([])}>
                        <Text style={styles.clearText}>{t('search.clear')}</Text>
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
                
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>{t('discover.minimumRating')}</Text>
                  <View style={styles.ratingGrid}>
                    {[0, 5, 6, 7, 8, 9].map(rating => (
                      <Pressable
                        key={rating}
                        style={[
                          styles.ratingChip,
                          minRating === rating && styles.ratingChipActive,
                        ]}
                        onPress={() => setMinRating(rating)}
                      >
                        <Text
                          style={[
                            styles.ratingChipText,
                            minRating === rating && styles.ratingChipTextActive,
                          ]}
                        >
                          {rating === 0 ? t('discover.all') : `⭐ ${rating}+`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>{t('discover.yearRange')}</Text>
                  <View style={styles.yearContainer}>
                    <View style={styles.yearInputContainer}>
                      <Text style={styles.yearLabel}>{t('discover.start')}</Text>
                      <View style={styles.yearButtons}>
                        <Pressable 
                          style={styles.yearButton}
                          onPress={() => setMinYear(Math.max(1900, minYear - 10))}
                        >
                          <Text style={styles.yearButtonText}>-10</Text>
                        </Pressable>
                        <Text style={styles.yearValue}>{minYear}</Text>
                        <Pressable 
                          style={styles.yearButton}
                          onPress={() => setMinYear(Math.min(maxYear, minYear + 10))}
                        >
                          <Text style={styles.yearButtonText}>+10</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.yearInputContainer}>
                      <Text style={styles.yearLabel}>{t('discover.end')}</Text>
                      <View style={styles.yearButtons}>
                        <Pressable 
                          style={styles.yearButton}
                          onPress={() => setMaxYear(Math.max(minYear, maxYear - 10))}
                        >
                          <Text style={styles.yearButtonText}>-10</Text>
                        </Pressable>
                        <Text style={styles.yearValue}>{maxYear}</Text>
                        <Pressable 
                          style={styles.yearButton}
                          onPress={() => setMaxYear(Math.min(new Date().getFullYear(), maxYear + 10))}
                        >
                          <Text style={styles.yearButtonText}>+10</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                {hasActiveFilters && (
                  <Pressable style={styles.clearAllButton} onPress={clearFilters}>
                    <Text style={styles.clearAllButtonText}>{t('discover.clearAll')}</Text>
                  </Pressable>
                )}
                <Pressable 
                  style={styles.applyButton}
                  onPress={() => setShowFilters(false)}
                >
                  <Text style={styles.applyButtonText}>{t('search.apply')} ({results.length} {t('search.results')})</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  clearText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500' as const,
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  resultCard: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: Colors.dark.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: '600' as const,
  },
  filterButtonTextActive: {
    color: Colors.dark.text,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
    marginLeft: 'auto' as const,
  },
  activeFiltersContainer: {
    marginBottom: 16,
  },
  activeFiltersScroll: {
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
  clearFiltersChip: {
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
  clearFiltersButton: {
    marginTop: 16,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
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
    gap: 12,
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
    marginBottom: 12,
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
  sortCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sortCheckmarkText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  sortDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 68,
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
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ratingChipActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  ratingChipText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ratingChipTextActive: {
    color: Colors.dark.text,
  },
  yearContainer: {
    gap: 16,
  },
  yearInputContainer: {
    gap: 8,
  },
  yearLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  yearButtons: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  yearButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  yearButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  yearValue: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  clearAllButton: {
    backgroundColor: Colors.dark.surfaceLight,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  clearAllButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  applyButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  applyButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
