import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { X, Heart, RotateCcw, Info, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  ScrollView,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import Colors from '@/constants/colors';
import GenreBadge from '@/components/GenreBadge';
import { useLibrary } from '@/contexts/LibraryContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedCards, setSwipedCards] = useState<{ index: number; direction: 'left' | 'right' }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [minYear, setMinYear] = useState<number>(1900);
  const [maxYear, setMaxYear] = useState<number>(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [allMovies, setAllMovies] = useState<MediaItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const MAX_UNDO_STACK = 10;
  
  const position = useRef(new Animated.ValueXY()).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.8)).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [`-${ROTATION_ANGLE}deg`, '0deg', `${ROTATION_ANGLE}deg`],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimatingRef.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return !isAnimatingRef.current && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5);
      },
      onPanResponderMove: (_, gesture) => {
        if (!isAnimatingRef.current) {
          position.setValue({ x: gesture.dx, y: gesture.dy });
          const progress = Math.min(Math.abs(gesture.dx) / (SCREEN_WIDTH / 4), 1);
          nextCardScale.setValue(0.95 + 0.05 * progress);
          nextCardOpacity.setValue(0.8 + 0.2 * progress);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (isAnimatingRef.current) return;
        
        if (Math.abs(gesture.dx) > SWIPE_THRESHOLD) {
          const direction = gesture.dx > 0 ? 'right' : 'left';
          const toValue = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
          isAnimatingRef.current = true;
          setIsAnimating(true);
          Animated.timing(position, {
            toValue: { x: toValue, y: gesture.dy },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            handleSwipeComplete(direction);
          });
        } else if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          handleCardPress();
          Animated.parallel([
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }),
            Animated.spring(nextCardScale, {
              toValue: 0.95,
              useNativeDriver: false,
            }),
            Animated.spring(nextCardOpacity, {
              toValue: 0.8,
              useNativeDriver: false,
            }),
          ]).start();
        } else {
          Animated.parallel([
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }),
            Animated.spring(nextCardScale, {
              toValue: 0.95,
              useNativeDriver: false,
            }),
            Animated.spring(nextCardOpacity, {
              toValue: 0.8,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const discoverQuery = useQuery({
    queryKey: ['discover', page, selectedGenre, minRating, minYear, maxYear],
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
    })).filter(show => {
      const year = show.releaseDate ? new Date(show.releaseDate).getFullYear() : 0;
      return show.voteAverage >= minRating && year >= minYear && year <= maxYear;
    })) : getDiscoverStack(page).then(shows => shows.filter(show => {
      const year = show.releaseDate ? new Date(show.releaseDate).getFullYear() : 0;
      return show.voteAverage >= minRating && year >= minYear && year <= maxYear;
    })),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
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
    const movie = movies[currentIndex];
    if (!movie) return;

    if (direction === 'right') {
      addInteraction(movie.id, movie.type, 'favorite');
      console.log('[Discover] Liked:', movie.title);
    } else {
      addInteraction(movie.id, movie.type, 'skipped');
      console.log('[Discover] Skipped:', movie.title);
    }

    setSwipedCards(prev => {
      const newStack = [...prev, { index: currentIndex, direction }];
      return newStack.slice(-MAX_UNDO_STACK);
    });
    setCurrentIndex(prev => prev + 1);
    
    position.setValue({ x: 0, y: 0 });
    nextCardScale.setValue(0.95);
    nextCardOpacity.setValue(0.8);
    isAnimatingRef.current = false;
    setIsAnimating(false);
  };

  const handleLike = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      handleSwipeComplete('right');
    });
  };

  const handlePass = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      handleSwipeComplete('left');
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
      position.setValue({ x: 0, y: 0 });
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

  const clearAllFilters = () => {
    setSelectedGenre(null);
    setMinRating(0);
    setMinYear(1900);
    setMaxYear(new Date().getFullYear());
    setCurrentIndex(0);
    setSwipedCards([]);
    setAllMovies([]);
    setPage(1);
  };

  const hasActiveFilters = selectedGenre !== null || minRating > 0 || minYear > 1900 || maxYear < new Date().getFullYear();

  if (discoverQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!currentMovie) {
    if (discoverQuery.isFetching) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t('discover.allMoviesShown')}</Text>
        <Text style={styles.emptyText}>{t('discover.comeBackLater')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{t('discover.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {currentIndex + 1} / {movies.length}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable 
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={() => setShowGenreModal(true)}
            >
              <Filter size={20} color={Colors.dark.primary} />
              {hasActiveFilters && <View style={styles.filterDot} />}
            </Pressable>
          </View>
        </View>
        {hasActiveFilters && (
          <View style={styles.tagsContainer}>
            {selectedGenre && (
              <View style={styles.genreTag}>
                <Text style={styles.genreTagText}>{selectedGenre}</Text>
                <Pressable onPress={() => setSelectedGenre(null)}>
                  <X size={16} color={Colors.dark.text} />
                </Pressable>
              </View>
            )}
            {minRating > 0 && (
              <View style={styles.genreTag}>
                <Text style={styles.genreTagText}>⭐ {minRating}+</Text>
                <Pressable onPress={() => setMinRating(0)}>
                  <X size={16} color={Colors.dark.text} />
                </Pressable>
              </View>
            )}
            {(minYear > 1900 || maxYear < new Date().getFullYear()) && (
              <View style={styles.genreTag}>
                <Text style={styles.genreTagText}>{minYear}-{maxYear}</Text>
                <Pressable onPress={() => { setMinYear(1900); setMaxYear(new Date().getFullYear()); }}>
                  <X size={16} color={Colors.dark.text} />
                </Pressable>
              </View>
            )}
            <Pressable style={styles.clearAllButton} onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>{t('discover.clearAll')}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.cardContainer}>
        {nextMovie && (
          <Animated.View style={[styles.card, { transform: [{ scale: nextCardScale }], opacity: nextCardOpacity }]}>
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
        
        <Animated.View 
          style={[
            styles.card, 
            { 
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotate },
              ] 
            }
          ]}
          {...panResponder.panHandlers}
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
          
          <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
            <Text style={styles.stampText}>{t('discover.like')}</Text>
          </Animated.View>
          
          <Animated.View style={[styles.nopeStamp, { opacity: nopeOpacity }]}>
            <Text style={styles.stampText}>{t('discover.pass')}</Text>
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
        </Animated.View>
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
                <Text style={styles.modalTitle}>{t('discover.selectGenre')}</Text>
                <Pressable onPress={() => setShowGenreModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.genreList} showsVerticalScrollIndicator={false}>
                <View style={styles.filterSectionContainer}>
                  <Text style={styles.filterSectionTitle}>{t('discover.genre')}</Text>
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
                </View>

                <View style={styles.filterSectionContainer}>
                  <Text style={styles.filterSectionTitle}>{t('discover.minimumRating')}</Text>
                  <View style={styles.ratingGrid}>
                    {[0, 5, 6, 7, 8, 9].map(rating => (
                      <Pressable
                        key={rating}
                        style={[
                          styles.ratingItem,
                          minRating === rating && styles.ratingItemActive,
                        ]}
                        onPress={() => setMinRating(rating)}
                      >
                        <Text
                          style={[
                            styles.ratingItemText,
                            minRating === rating && styles.ratingItemTextActive,
                          ]}
                        >
                          {rating === 0 ? t('discover.all') : `⭐ ${rating}+`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSectionContainer}>
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
                  <View style={styles.yearPresets}>
                    <Pressable 
                      style={styles.yearPreset}
                      onPress={() => { setMinYear(2020); setMaxYear(new Date().getFullYear()); }}
                    >
                      <Text style={styles.yearPresetText}>{t('discover.last5Years')}</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.yearPreset}
                      onPress={() => { setMinYear(2010); setMaxYear(new Date().getFullYear()); }}
                    >
                      <Text style={styles.yearPresetText}>{t('discover.last10Years')}</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.yearPreset}
                      onPress={() => { setMinYear(1900); setMaxYear(new Date().getFullYear()); }}
                    >
                      <Text style={styles.yearPresetText}>{t('discover.all')}</Text>
                    </Pressable>
                  </View>
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
    paddingHorizontal: 16,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  clearAllText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  filterSectionContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  filterSectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ratingItemActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  ratingItemText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ratingItemTextActive: {
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
  yearPresets: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  yearPreset: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceLight,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  yearPresetText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
