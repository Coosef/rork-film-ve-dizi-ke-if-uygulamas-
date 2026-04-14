import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import MovieCard from './MovieCard';
import { MediaItem } from '@/types/tmdb';

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
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {onSeeAll && (
            <Pressable onPress={onSeeAll} style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <ChevronRight size={14} color={Colors.dark.accent} />
            </Pressable>
          )}
        </View>
      ) : null}
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
              width={130}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: Colors.dark.accent,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  cardWrapper: {
    width: 130,
  },
});
