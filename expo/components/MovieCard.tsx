import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Bookmark, BookmarkCheck } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import Colors from '@/constants/colors';
import { MediaItem } from '@/types/tmdb';
import { useLibrary } from '@/contexts/LibraryContext';

interface MovieCardProps {
  movie: MediaItem;
  onPress?: () => void;
  width?: number;
  showRating?: boolean;
  showWatchlistButton?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function MovieCard({ 
  movie, 
  onPress, 
  width = DEFAULT_CARD_WIDTH,
  showRating = true,
  showWatchlistButton = true
}: MovieCardProps) {
  const { isInWatchlist, addInteraction } = useLibrary();
  const inWatchlist = isInWatchlist(movie.id, movie.type || 'movie');

  const handleToggleWatchlist = (e: any) => {
    e.stopPropagation();
    if (inWatchlist) {
      void addInteraction(movie.id, movie.type || 'movie', 'watched');
    } else {
      void addInteraction(movie.id, movie.type || 'movie', 'watchlist');
    }
  };
  const imageUrl = movie.posterPath || 'https://via.placeholder.com/500x750?text=No+Image';
  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const year = releaseYear && !isNaN(releaseYear) ? releaseYear : null;
  const rating = typeof movie.voteAverage === 'number' && !isNaN(movie.voteAverage) ? movie.voteAverage.toFixed(1) : '0.0';

  return (
    <Pressable 
      onPress={onPress}
      style={[styles.container, { width }]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        {showRating && (
          <View style={styles.ratingBadge}>
            <Star size={12} color={Colors.dark.warning} fill={Colors.dark.warning} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
        {showWatchlistButton && (
          <Pressable 
            style={[styles.watchlistButton, inWatchlist && styles.watchlistButtonActive]} 
            onPress={handleToggleWatchlist}
          >
            {inWatchlist ? (
              <BookmarkCheck size={16} color={Colors.dark.text} />
            ) : (
              <Bookmark size={16} color={Colors.dark.text} />
            )}
          </Pressable>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        {year !== null ? <Text style={styles.year}>{String(year)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  info: {
    marginTop: 8,
    gap: 2,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  year: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  watchlistButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  watchlistButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
});
