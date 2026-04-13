import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Plus, Check, Heart, Star, Clock, Calendar, Play, ExternalLink, MessageCircle, ThumbsUp, Building2, Globe, Edit3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import Colors from '@/constants/colors';
import GenreBadge from '@/components/GenreBadge';
import MovieShelf from '@/components/MovieShelf';
import { useLibrary } from '@/contexts/LibraryContext';
import {
  getMovieDetails,
  getImageUrl,
  convertMovieToMediaItem,
  getSimilarMovies,
  GENRES,
} from '@/services/tmdb';
import { MediaItem } from '@/types/tmdb';
import { getStreamingProviders, StreamingProvider } from '@/services/streaming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addInteraction, isInWatchlist, isFavorite, addReview, getReview } = useLibrary();
  const insets = useSafeAreaInsets();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const movieId = parseInt(id || '0', 10);

  const movieQuery = useQuery({
    queryKey: ['tmdb-movie', movieId],
    queryFn: () => getMovieDetails(movieId),
    enabled: movieId > 0,
  });

  const similarQuery = useQuery({
    queryKey: ['tmdb-similar', movieId],
    queryFn: () => getSimilarMovies(movieId),
    enabled: movieId > 0,
  });

  const streamingQuery = useQuery({
    queryKey: ['streaming', movieId],
    queryFn: async () => {
      try {
        const providers = await getStreamingProviders(movieId, 'movie');
        return providers;
      } catch (error) {
        console.log('[Streaming] Error:', error);
        return [];
      }
    },
    enabled: movieId > 0,
  });

  const movie = movieQuery.data;
  const inWatchlist = isInWatchlist(movieId, 'movie');
  const favorite = isFavorite(movieId, 'movie');
  const userReview = getReview(movieId, 'movie');

  const handleBack = () => {
    router.back();
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      addInteraction(movieId, 'movie', 'watched');
    } else {
      addInteraction(movieId, 'movie', 'watchlist');
    }
  };

  const handleToggleFavorite = () => {
    if (favorite) {
      addInteraction(movieId, 'movie', 'watched');
    } else {
      addInteraction(movieId, 'movie', 'favorite');
    }
  };

  const handleMoviePress = (selectedMovie: MediaItem) => {
    router.push(`/movie/${selectedMovie.id}` as any);
  };

  const handleOpenReviewModal = () => {
    if (userReview) {
      setReviewRating(userReview.rating);
      setReviewText(userReview.text || '');
    } else {
      setReviewRating(0);
      setReviewText('');
    }
    setShowReviewModal(true);
  };

  const handleSaveReview = () => {
    if (reviewRating > 0) {
      addReview(movieId, 'movie', reviewRating, reviewText.trim() || undefined);
      setShowReviewModal(false);
    }
  };

  if (movieQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Film bulunamadı</Text>
      </View>
    );
  }

  const cast = movie.credits?.cast?.slice(0, 10) || [];
  const crew = movie.credits?.crew || [];
  const director = crew.find(c => c.job === 'Director');
  const similarMovies = (similarQuery.data?.results || []).map(convertMovieToMediaItem);
  const videos = movie.videos?.results?.filter(v => v.site === 'YouTube') || [];
  const trailers = videos.filter(v => v.type === 'Trailer');
  const streamingProviders = streamingQuery.data || [];

  const genreNames = movie.genres?.map(g => g.name) || [];
  const runtimeHours = movie.runtime ? Math.floor(movie.runtime / 60) : 0;
  const runtimeMinutes = movie.runtime ? movie.runtime % 60 : 0;

  const handlePlayTrailer = () => {
    if (trailers.length > 0) {
      Linking.openURL(`https://www.youtube.com/watch?v=${trailers[0].key}`);
    } else if (videos.length > 0) {
      Linking.openURL(`https://www.youtube.com/watch?v=${videos[0].key}`);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          {movie.backdrop_path ? (
            <Image
              source={{ uri: getImageUrl(movie.backdrop_path, 'original') }}
              style={styles.backdropImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.backdropImage, { backgroundColor: Colors.dark.surfaceLight }]} />
          )}
          <LinearGradient
            colors={['transparent', Colors.dark.background]}
            style={styles.gradient}
          />
          <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={handleBack}>
            <ArrowLeft size={24} color={Colors.dark.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.posterRow}>
            {movie.poster_path ? (
              <Image
                source={{ uri: getImageUrl(movie.poster_path, 'w500') }}
                style={styles.posterImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.posterImage, { backgroundColor: Colors.dark.surfaceLight }]} />
            )}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{movie.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Star size={16} color={Colors.dark.warning} fill={Colors.dark.warning} />
                  <Text style={styles.metaText}>{movie.vote_average?.toFixed(1) || 'N/A'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Calendar size={16} color={Colors.dark.textSecondary} />
                  <Text style={styles.metaText}>
                    {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                  </Text>
                </View>
                {movie.runtime > 0 && (
                  <View style={styles.metaItem}>
                    <Clock size={16} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>
                      {runtimeHours > 0 ? `${runtimeHours}s ` : ''}{runtimeMinutes}dk
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, inWatchlist && styles.actionButtonActive]}
                  onPress={handleToggleWatchlist}
                >
                  {inWatchlist ? (
                    <Check size={20} color={Colors.dark.text} />
                  ) : (
                    <Plus size={20} color={Colors.dark.text} />
                  )}
                </Pressable>
                <Pressable
                  style={[styles.actionButton, favorite && styles.actionButtonActive]}
                  onPress={handleToggleFavorite}
                >
                  <Heart
                    size={20}
                    color={favorite ? Colors.dark.accent : Colors.dark.text}
                    fill={favorite ? Colors.dark.accent : 'transparent'}
                  />
                </Pressable>
                {(trailers.length > 0 || videos.length > 0) && (
                  <Pressable style={styles.actionButton} onPress={handlePlayTrailer}>
                    <Play size={20} color={Colors.dark.text} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {genreNames.length > 0 && (
            <View style={styles.genresContainer}>
              {genreNames.map(genre => (
                <GenreBadge key={genre} genre={genre} />
              ))}
            </View>
          )}

          {movie.tagline ? (
            <Text style={styles.tagline}>"{movie.tagline}"</Text>
          ) : null}

          {movie.overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Özet</Text>
              <Text style={styles.overview}>{movie.overview}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Değerlendirmeniz</Text>
              <Pressable style={styles.editButton} onPress={handleOpenReviewModal}>
                <Edit3 size={16} color={Colors.dark.primary} />
                <Text style={styles.editButtonText}>
                  {userReview ? 'Düzenle' : 'Ekle'}
                </Text>
              </Pressable>
            </View>
            {userReview ? (
              <View style={styles.userReviewCard}>
                <View style={styles.userReviewHeader}>
                  <View style={styles.userReviewScore}>
                    <Text style={styles.userReviewScoreNumber}>{userReview.rating}</Text>
                    <Text style={styles.userReviewScoreLabel}>/10</Text>
                  </View>
                  <Text style={styles.userReviewDate}>
                    {new Date(userReview.updatedAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                {userReview.text && (
                  <Text style={styles.userReviewText}>{userReview.text}</Text>
                )}
              </View>
            ) : (
              <Pressable style={styles.addReviewCard} onPress={handleOpenReviewModal}>
                <Star size={32} color={Colors.dark.primary} />
                <Text style={styles.addReviewText}>Bu filmi değerlendirin</Text>
                <Text style={styles.addReviewSubtext}>Puanınızı ve yorumunuzu paylaşın</Text>
              </Pressable>
            )}
          </View>

          {videos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Videolar</Text>
              <View style={styles.videosContainer}>
                {videos.slice(0, 5).map((video, index) => (
                  <Pressable
                    key={`video-${video.id}-${index}`}
                    style={styles.videoCard}
                    onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.key}`)}
                  >
                    <View style={styles.videoIcon}>
                      <Play size={24} color={Colors.dark.primary} />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={1}>{video.name}</Text>
                      <Text style={styles.videoType}>
                        {video.type === 'Trailer' ? 'Fragman' : video.type === 'Teaser' ? 'Teaser' : video.type}
                      </Text>
                    </View>
                    <ExternalLink size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {streamingProviders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nerede İzleyebilirsiniz?</Text>
              <View style={styles.platformsContainer}>
                {streamingProviders.map((provider: StreamingProvider, index: number) => (
                  <View key={`provider-${provider.providerId}-${index}`} style={styles.platformCard}>
                    {provider.logoPath ? (
                      <Image
                        source={{ uri: provider.logoPath }}
                        style={styles.platformLogo}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.platformLogo, { backgroundColor: Colors.dark.surfaceLight }]} />
                    )}
                    <View style={styles.platformInfo}>
                      <Text style={styles.platformName}>{provider.provider}</Text>
                      <Text style={styles.platformType}>Streaming</Text>
                    </View>
                    <Pressable
                      style={styles.platformButton}
                      onPress={() => {
                        if (provider.link) {
                          Linking.openURL(provider.link).catch(() => {
                            Linking.openURL(`https://www.themoviedb.org/movie/${movieId}/watch`);
                          });
                        } else {
                          Linking.openURL(`https://www.themoviedb.org/movie/${movieId}/watch`);
                        }
                      }}
                    >
                      <Text style={styles.platformButtonText}>Git</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.moreProvidersButton}
                onPress={() => Linking.openURL(`https://www.themoviedb.org/movie/${movieId}/watch`)}
              >
                <Globe size={16} color={Colors.dark.primary} />
                <Text style={styles.moreProvidersText}>Tüm platformları görüntüle</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yapım Bilgileri</Text>
            <View style={styles.productionContainer}>
              {director && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Star size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Yönetmen</Text>
                    <Text style={styles.productionValue}>{director.name}</Text>
                  </View>
                </View>
              )}

              {movie.production_companies && movie.production_companies.length > 0 && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Building2 size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Yapımcı</Text>
                    <Text style={styles.productionValue}>
                      {movie.production_companies.slice(0, 2).map(c => c.name).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {movie.production_countries && movie.production_countries.length > 0 && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Globe size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Ülke</Text>
                    <Text style={styles.productionValue}>
                      {movie.production_countries.map(c => c.name).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.productionItem}>
                <View style={styles.productionIcon}>
                  <Calendar size={20} color={Colors.dark.primary} />
                </View>
                <View style={styles.productionInfo}>
                  <Text style={styles.productionLabel}>Durum</Text>
                  <Text style={styles.productionValue}>
                    {movie.status === 'Released' ? 'Yayınlandı' :
                     movie.status === 'Post Production' ? 'Post Prodüksiyon' :
                     movie.status === 'In Production' ? 'Yapım Aşamasında' :
                     movie.status === 'Planned' ? 'Planlandı' : movie.status}
                  </Text>
                </View>
              </View>

              {movie.spoken_languages && movie.spoken_languages.length > 0 && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <MessageCircle size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Dil</Text>
                    <Text style={styles.productionValue}>
                      {movie.spoken_languages.map(l => l.name).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {movie.release_date && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Clock size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Yayın Tarihi</Text>
                    <Text style={styles.productionValue}>
                      {new Date(movie.release_date).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {movie.budget > 0 && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Building2 size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Bütçe</Text>
                    <Text style={styles.productionValue}>
                      ${(movie.budget / 1000000).toFixed(1)}M
                    </Text>
                  </View>
                </View>
              )}

              {movie.revenue > 0 && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Building2 size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Hasılat</Text>
                    <Text style={styles.productionValue}>
                      ${(movie.revenue / 1000000).toFixed(1)}M
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Oyuncular</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.castContainer}>
                  {cast.map((actor, actorIndex) => (
                    <View key={`actor-${actor.id}-${actorIndex}`} style={styles.castCard}>
                      {actor.profile_path ? (
                        <Image
                          source={{ uri: getImageUrl(actor.profile_path, 'w200') }}
                          style={styles.castImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.castImage, { backgroundColor: Colors.dark.surfaceLight }]} />
                      )}
                      <Text style={styles.castName} numberOfLines={1}>
                        {actor.name}
                      </Text>
                      <Text style={styles.castCharacter} numberOfLines={1}>
                        {actor.character}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {similarMovies.length > 0 && (
            <MovieShelf
              title="Benzer Filmler"
              movies={similarMovies}
              onMoviePress={handleMoviePress}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowReviewModal(false)}
          />
          <View style={styles.reviewModalContent}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Değerlendirme</Text>
              <Pressable onPress={() => setShowReviewModal(false)}>
                <Text style={styles.reviewModalClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.reviewModalBody}>
              <Text style={styles.reviewModalLabel}>Puanınız (1-10)</Text>
              <View style={styles.ratingNumberContainer}>
                <Text style={styles.ratingNumber}>{reviewRating || '-'}</Text>
                <Text style={styles.ratingLabel}>/10</Text>
              </View>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <Pressable
                    key={`rating-${rating}`}
                    onPress={() => setReviewRating(rating)}
                    style={[
                      styles.ratingButton,
                      rating === reviewRating && styles.ratingButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratingButtonText,
                        rating === reviewRating && styles.ratingButtonTextActive,
                      ]}
                    >
                      {rating}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.reviewModalLabel}>Yorumunuz (İsteğe Bağlı)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Düşüncelerinizi paylaşın..."
                placeholderTextColor={Colors.dark.textSecondary}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Pressable
                style={[styles.saveReviewButton, reviewRating === 0 && styles.saveReviewButtonDisabled]}
                onPress={handleSaveReview}
                disabled={reviewRating === 0}
              >
                <Text style={styles.saveReviewButtonText}>Kaydet</Text>
              </Pressable>
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
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
    position: 'relative',
  },
  backdropImage: {
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
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
  },
  content: {
    padding: 16,
  },
  posterRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  posterImage: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  titleSection: {
    flex: 1,
    gap: 12,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
  },
  actionButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagline: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontStyle: 'italic' as const,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  overview: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  castContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  castCard: {
    width: 100,
    gap: 4,
  },
  castImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  castName: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  castCharacter: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textAlign: 'center' as const,
  },
  videosContainer: {
    gap: 12,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.dark.surfaceLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  videoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  videoInfo: {
    flex: 1,
    gap: 4,
  },
  videoTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  videoType: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  platformsContainer: {
    gap: 12,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.dark.surfaceLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  platformLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  platformInfo: {
    flex: 1,
    gap: 4,
  },
  platformName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  platformType: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  platformButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  platformButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  moreProvidersButton: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.dark.surfaceLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 8,
  },
  moreProvidersText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  productionContainer: {
    gap: 12,
  },
  productionItem: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: Colors.dark.surfaceLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  productionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  productionInfo: {
    flex: 1,
    gap: 4,
  },
  productionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  productionValue: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${Colors.dark.primary}20`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  editButtonText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  userReviewCard: {
    backgroundColor: Colors.dark.surfaceLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    gap: 12,
  },
  userReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
  },
  userReviewScore: {
    flexDirection: 'row',
    alignItems: 'baseline' as const,
    gap: 4,
  },
  userReviewScoreNumber: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  userReviewScoreLabel: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  userReviewDate: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  userReviewText: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  addReviewCard: {
    backgroundColor: Colors.dark.surfaceLight,
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  addReviewText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  addReviewSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
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
  reviewModalContent: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  reviewModalTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  reviewModalClose: {
    color: Colors.dark.text,
    fontSize: 24,
  },
  reviewModalBody: {
    padding: 20,
    gap: 20,
  },
  reviewModalLabel: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  ratingNumberContainer: {
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  ratingNumber: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: Colors.dark.primary,
  },
  ratingLabel: {
    fontSize: 24,
    color: Colors.dark.textSecondary,
    marginTop: -8,
  },
  ratingSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center' as const,
    gap: 8,
  },
  ratingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ratingButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  ratingButtonText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
  },
  ratingButtonTextActive: {
    color: Colors.dark.text,
  },
  reviewInput: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 14,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  saveReviewButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  saveReviewButtonDisabled: {
    opacity: 0.5,
  },
  saveReviewButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
