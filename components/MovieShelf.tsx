import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import MovieCard from './MovieCard';
import { MediaItem } from '@/types/tvmaze';

interface MovieShelfProps {
  title: string;
  movies: MediaItem[];
  onMoviePress: (movie: MediaItem) => void;
  onSeeAll?: () => void;
}

export default function MovieShelf({ title, movies, onMoviePress, onSeeAll }: MovieShelfProps) {
  if (movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Tümünü Gör</Text>
            <ChevronRight size={16} color={Colors.dark.primary} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {movies.map((movie, index) => (
          <View key={`${movie.id}-${index}`} style={styles.cardWrapper}>
            <MovieCard
              movie={movie}
              onPress={() => onMoviePress(movie)}
              width={140}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 140,
  },
});
