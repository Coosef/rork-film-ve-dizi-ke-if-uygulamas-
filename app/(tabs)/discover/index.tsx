import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { X, Heart, RotateCcw, Info, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import GenreBadge from '@/components/GenreBadge';
import { useLibrary } from '@/contexts/LibraryContext';
import { getDiscoverStack, getShowsByGenre, GENRES } from '@/services/tvmaze';
import { MediaItem } from '@/types/tvmaze';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const SWIPE_THRESHOLD = 100;
const ROTATION_ANGLE = 10;

export default function DiscoverScreen() {
  const router = useRouter();
  const { addInteraction, getInteraction, removeInteraction } = useLibrary();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState<{ index: number; direction: 'left' | 'right' }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<MediaItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const MAX_UNDO_STACK = 10;
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isGestureActive = useSharedValue(false);

  const discoverQuery = useQuery({
    queryKey: ['discover', page, selectedGenre],
    queryFn: () => selectedGenre ? getShowsByGenre(selectedGenre, page).then(shows => shows.map(show => ({
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
    }))) : getDiscoverStack(page),
  });

  React.useEffect(() => {
    if (discoverQuery.data) {
      setAllMovies(prev => {
        const newMovies = discoverQuery.data.filter(
          newMovie => !prev.some(existingMovie => existingMovie.id === newMovie.id)
        );
        return [...prev, ...newMovies];
      });
    }
  }, [discoverQuery.data]);

  React.useEffect(() => {
    if (currentIndex >= allMovies.length - 3 && !discoverQuery.isFetching) {
      setPage(prev => prev + 1);
    }
  }, [currentIndex, allMovies.length, discoverQuery.isFetching]);

  const movies = allMovies;
  const currentMovie = movies[currentIndex];
  const nextMovie = movies[currentIndex + 1];

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    if (!currentMovie || isAnimating) return;

    if (direction === 'right') {
      addInteraction(currentMovie.id, currentMovie.type, 'favorite');
      console.log('[Discover] Liked:', currentMovie.title);
    } else {
      addInteraction(currentMovie.id, currentMovie.type, 'skipped');
      console.log('[Discover] Skipped:', currentMovie.title);
    }

    setSwipedCards(prev => {
      const newStack = [...prev, { index: currentIndex, direction }];
      return newStack.slice(-MAX_UNDO_STACK);
    });
    setCurrentIndex(currentIndex + 1);
    
    setTimeout(() => {
      translateX.value = 0;
      translateY.value = 0;
      setIsAnimating(false);
    }, 10);
  };

  const panGesture = Gesture.Pan()
    .enabled(!isAnimating)
    .onStart(() => {
      isGestureActive.value = true;
    })
    .onUpdate((event) => {
      if (!isAnimating) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      isGestureActive.value = false;
      
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        runOnJS(setIsAnimating)(true);
        
        if (event.translationX > 0) {
          translateX.value = withSpring(SCREEN_WIDTH + 100, {
            damping: 15,
            stiffness: 150,
            velocity: event.velocityX,
          }, () => {
            runOnJS(handleSwipeComplete)('right');
          });
        } else {
          translateX.value = withSpring(-SCREEN_WIDTH - 100, {
            damping: 15,
            stiffness: 150,
            velocity: event.velocityX,
          }, () => {
            runOnJS(handleSwipeComplete)('left');
          });
        }
      } else {
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeStampStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const nopeStampStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const nextCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [1, 0.95, 1],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH / 4],
      [0.8, 1],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ scale: withSpring(scale, { damping: 25, stiffness: 300 }) }],
      opacity,
    };
  });

  const handleLike = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    translateX.value = withSpring(SCREEN_WIDTH + 100, {
      damping: 15,
      stiffness: 150,
    }, () => {
      runOnJS(handleSwipeComplete)('right');
    });
  };

  const handlePass = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    translateX.value = withSpring(-SCREEN_WIDTH - 100, {
      damping: 15,
      stiffness: 150,
    }, () => {
      runOnJS(handleSwipeComplete)('left');
    });
  };

  const handleUndo = () => {
    if (swipedCards.length > 0 && !isAnimating) {
      const lastSwipe = swipedCards[swipedCards.length - 1];
      const lastMovie = movies[lastSwipe.index];
      
      if (lastMovie) {
        const interactionType = lastSwipe.direction === 'right' ? 'favorite' : 'skipped';
        const interaction = getInteraction(lastMovie.id, lastMovie.type);
        if (interaction && interaction.type === interactionType) {
          removeInteraction(lastMovie.id, lastMovie.type);
        }
      }
      
      setCurrentIndex(lastSwipe.index);
      setSwipedCards(swipedCards.slice(0, -1));
      translateX.value = 0;
      translateY.value = 0;
    }
  };

  const handleInfo = () => {
    if (currentMovie && !isAnimating) {
      router.push(`/movie/${currentMovie.id}` as any);
    }
  };

  const handleCardPress = () => {
    if (currentMovie && !isAnimating) {
      router.push(`/movie/${currentMovie.id}` as any);
    }
  };

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre === selectedGenre ? null : genre);
    setCurrentIndex(0);
    setSwipedCards([]);
    setAllMovies([]);
    setPage(1);
    setShowGenreModal(false);
  };

  if (discoverQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!currentMovie) {
    if (discoverQuery.isFetching) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Tüm filmler gösterildi!</Text>
        <Text style={styles.emptyText}>Yeni filmler için geri gelin</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Keşfet</Text>
            <Text style={styles.headerSubtitle}>
              {currentIndex + 1} / {movies.length}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable 
              style={[styles.filterButton, selectedGenre && styles.filterButtonActive]}
              onPress={() => setShowGenreModal(true)}
            >
              <Filter size={20} color={Colors.dark.primary} />
              {selectedGenre && <View style={styles.filterDot} />}
            </Pressable>
          </View>
        </View>
        {selectedGenre && (
          <View style={styles.tagsContainer}>
            <View style={styles.genreTag}>
              <Text style={styles.genreTagText}>{selectedGenre}</Text>
              <Pressable onPress={() => handleGenreSelect(selectedGenre)}>
                <X size={16} color={Colors.dark.text} />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.cardContainer}>
        {nextMovie && (
          <Animated.View style={[styles.card, nextCardStyle]}>
            <Image
              source={{ uri: nextMovie.posterPath || 'https://via.placeholder.com/500x750?text=No+Image' }}
              style={styles.cardImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.cardGradient}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{nextMovie.title}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardYear}>
                  {nextMovie.releaseDate ? new Date(nextMovie.releaseDate).getFullYear() : ''}
                </Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>⭐ {nextMovie.voteAverage.toFixed(1)}</Text>
                </View>
              </View>
              {nextMovie.genres.length > 0 && (
                <View style={styles.genresContainer}>
                  {nextMovie.genres.slice(0, 3).map((genre) => (
                    <GenreBadge key={genre} genre={genre} variant="primary" />
                  ))}
                </View>
              )}
              <Text style={styles.cardOverview} numberOfLines={3}>
                {nextMovie.overview}
              </Text>
            </View>
          </Animated.View>
        )}
        
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, animatedCardStyle]}>
            <Pressable 
              style={styles.cardPressable}
              onPress={handleCardPress}
              disabled={isAnimating}
            >
            <Image
              source={{ uri: currentMovie.posterPath || 'https://via.placeholder.com/500x750?text=No+Image' }}
              style={styles.cardImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.cardGradient}
            />
            
            <Animated.View style={[styles.likeStamp, likeStampStyle]}>
              <Text style={styles.stampText}>BEĞEN</Text>
            </Animated.View>
            
            <Animated.View style={[styles.nopeStamp, nopeStampStyle]}>
              <Text style={styles.stampText}>GEÇ</Text>
            </Animated.View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{currentMovie.title}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardYear}>
                  {currentMovie.releaseDate ? new Date(currentMovie.releaseDate).getFullYear() : ''}
                </Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>⭐ {currentMovie.voteAverage.toFixed(1)}</Text>
                </View>
              </View>
              {currentMovie.genres.length > 0 && (
                <View style={styles.genresContainer}>
                  {currentMovie.genres.slice(0, 3).map((genre) => (
                    <GenreBadge key={genre} genre={genre} variant="primary" />
                  ))}
                </View>
              )}
              <Text style={styles.cardOverview} numberOfLines={3}>
                {currentMovie.overview}
              </Text>
            </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        <Pressable 
          style={[styles.actionButton, isAnimating && styles.actionButtonDisabled]} 
          onPress={handleUndo}
          disabled={isAnimating || swipedCards.length === 0}
        >
          <RotateCcw size={28} color={isAnimating || swipedCards.length === 0 ? Colors.dark.textSecondary : Colors.dark.warning} />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.passButton, isAnimating && styles.actionButtonDisabled]} 
          onPress={handlePass}
          disabled={isAnimating}
        >
          <X size={32} color={isAnimating ? Colors.dark.textSecondary : Colors.dark.error} />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.likeButton, isAnimating && styles.actionButtonDisabled]} 
          onPress={handleLike}
          disabled={isAnimating}
        >
          <Heart size={32} color={isAnimating ? Colors.dark.textSecondary : Colors.dark.accent} />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, isAnimating && styles.actionButtonDisabled]} 
          onPress={handleInfo}
          disabled={isAnimating}
        >
          <Info size={28} color={isAnimating ? Colors.dark.textSecondary : Colors.dark.primary} />
        </Pressable>
      </View>

      <Modal
        visible={showGenreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenreModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowGenreModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tür Seç</Text>
                <Pressable onPress={() => setShowGenreModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.genreList} showsVerticalScrollIndicator={false}>
                <View style={styles.genreGrid}>
                  {GENRES.map(genre => (
                    <Pressable
                      key={genre}
                      style={[
                        styles.genreItem,
                        selectedGenre === genre && styles.genreItemActive,
                      ]}
                      onPress={() => handleGenreSelect(genre)}
                    >
                      <Text
                        style={[
                          styles.genreItemText,
                          selectedGenre === genre && styles.genreItemTextActive,
                        ]}
                      >
                        {genre}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 32,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    alignItems: 'center' as const,
    zIndex: 10,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: -40,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.dark.backgroundSecondary,
    position: 'absolute' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPressable: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  likeStamp: {
    position: 'absolute' as const,
    top: 50,
    right: 30,
    borderWidth: 4,
    borderColor: Colors.dark.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: '20deg' }],
  },
  nopeStamp: {
    position: 'absolute' as const,
    top: 50,
    left: 30,
    borderWidth: 4,
    borderColor: Colors.dark.error,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: '-20deg' }],
  },
  stampText: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '700' as const,
  },
  cardInfo: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 8,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  cardYear: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center' as const,
  },
  ratingText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardOverview: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 16,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.glass.background,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  passButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  likeButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start' as const,
    width: '100%',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.glass.background,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  filterButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  filterDot: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
  },
  genreTag: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  genreTagText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
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
  genreList: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  genreItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  genreItemActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  genreItemText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  genreItemTextActive: {
    color: Colors.dark.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
});
