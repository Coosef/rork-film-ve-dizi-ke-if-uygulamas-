import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Search as SearchIcon, Clock, TrendingUp, X } from 'lucide-react-native';
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import MovieCard from '@/components/MovieCard';
import { searchShows } from '@/services/tvmaze';
import { MediaItem } from '@/types/tvmaze';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

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

  const results = searchQuery_.data || [];
  const isSearching = searchQuery_.isLoading;
  const showResults = debouncedQuery.length > 0;
  const showHistory = !showResults && history.length > 0;

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
              placeholder="Dizi ara..."
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
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {showHistory && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Clock size={20} color={Colors.dark.textSecondary} />
                  <Text style={styles.sectionTitle}>Son Aramalar</Text>
                </View>
                <Pressable onPress={clearHistory}>
                  <Text style={styles.clearText}>Temizle</Text>
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
                  <Text style={styles.sectionTitle}>Popüler Aramalar</Text>
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
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Aranıyor...</Text>
                </View>
              ) : results.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                  <Text style={styles.emptySubtext}>
                    Farklı bir arama terimi deneyin
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.resultsCount}>
                    {results.length} sonuç bulundu
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
});
