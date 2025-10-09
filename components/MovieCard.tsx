import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import Colors from '@/constants/colors';
import { MediaItem } from '@/types/tvmaze';

interface MovieCardProps {
  movie: MediaItem;
  onPress?: () => void;
  width?: number;
  showRating?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function MovieCard({ 
  movie, 
  onPress, 
  width = DEFAULT_CARD_WIDTH,
  showRating = true 
}: MovieCardProps) {
  const imageUrl = movie.posterPath || 'https://via.placeholder.com/500x750?text=No+Image';
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';

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
            <Text style={styles.ratingText}>{movie.voteAverage.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        {year && <Text style={styles.year}>{year}</Text>}
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
});
