import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Heart } from 'lucide-react-native';
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
  const { isFavorite, addInteraction } = useLibrary();
  const favorite = isFavorite(movie.id, movie.type || 'movie');

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    if (favorite) {
      void addInteraction(movie.id, movie.type || 'movie', 'watched');
    } else {
      void addInteraction(movie.id, movie.type || 'movie', 'favorite');
    }
  };

  const imageUrl = movie.posterPath || 'https://via.placeholder.com/500x750?text=No+Image';
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
          transition={200}
        />
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />
        {showRating && (
          <View style={styles.ratingBadge}>
            <Star size={10} color="#FBBF24" fill="#FBBF24" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
        {showWatchlistButton && (
          <Pressable 
            style={[styles.favoriteButton, favorite && styles.favoriteButtonActive]} 
            onPress={handleToggleFavorite}
          >
            <Heart 
              size={14} 
              color={favorite ? '#EF4444' : 'rgba(255,255,255,0.8)'} 
              fill={favorite ? '#EF4444' : 'transparent'}
            />
          </Pressable>
        )}
        <View style={styles.bottomInfo}>
          <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 14,
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
    height: '60%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
});
