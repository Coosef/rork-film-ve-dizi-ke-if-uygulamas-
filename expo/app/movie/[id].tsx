import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Check, Heart, Star, Clock, Calendar, Play, ExternalLink, Edit3, Share2, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import YouTubePlayer from '@/components/YouTubePlayer';
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
  Platform,
  Share,
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
const BACKDROP_HEIGHT = SCREEN_WIDTH * 0.75;

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addInteraction, removeInteraction, isInWatchlist, isWatched, isFavorite, addReview, getReview } = useLibrary();
  const insets = useSafeAreaInsets();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [playerVideo, setPlayerVideo] = useState<{ key: string; name: string } | null>(null);

  const movieId = parseInt(id || '0', 10);

  const movieQuery = useQuery({
    queryKey: ['tmdb-movie', movieId],
    queryFn: () => getMovieDetails(movieId),
    enabled: movieId > 0,
    retry: 1,
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
  const watched = isWatched(movieId, 'movie');
  const favorite = isFavorite(movieId, 'movie');
  const userReview = getReview(movieId, 'movie');

  const handleBack = () => {
    router.back();
  };

  const handleToggleWatched = () => {
    if (watched) {
      removeInteraction(movieId, 'movie');
    } else {
      addInteraction(movieId, 'movie', 'watched');
    }
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeInteraction(movieId, 'movie');
    } else {
      addInteraction(movieId, 'movie', 'watchlist');
    }
  };

  const handleToggleFavorite = () => {
    if (favorite) {
      removeInteraction(movieId, 'movie');
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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${movie?.title} - TMDB Rating: ${movie?.vote_average?.toFixed(1)}/10`,
        title: movie?.title || '',
      });
    } catch (error) {
      console.log('[MovieDetail] Share error:', error);
    }
  };

  if (movieQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingDot} />
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
      setPlayerVideo({ key: trailers[0].key, name: trailers[0].name });
    } else if (videos.length > 0) {
      setPlayerVideo({ key: videos[0].key, name: videos[0].name });
    }
  };

  return (
    <View style={styles.container}>
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
            <View style={[styles.backdropImage, { backgroundColor: Colors.dark.backgroundSecondary }]} />
          )}
          <LinearGradient
            colors={['rgba(11,15,26,0.2)', 'rgba(11,15,26,0.6)', Colors.dark.background]}
            locations={[0, 0.6, 1]}
            style={styles.gradient}
          />
          <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={handleBack}>
            <ArrowLeft size={22} color={Colors.dark.text} />
          </Pressable>
          <Pressable style={[styles.shareButton, { top: insets.top + 8 }]} onPress={handleShare}>
            <Share2 size={20} color={Colors.dark.text} />
          </Pressable>
          {(trailers.length > 0 || videos.length > 0) && (
            <Pressable style={styles.playOverlay} onPress={handlePlayTrailer}>
              <View style={styles.playCircle}>
                <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Pressable>
          )}
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
              <View style={[styles.posterImage, { backgroundColor: Colors.dark.backgroundSecondary }]} />
            )}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{movie.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.ratingBadge}>
                  <Star size={14} color="#FBBF24" fill="#FBBF24" />
                  <Text style={styles.ratingValue}>{movie.vote_average?.toFixed(1) || 'N/A'}</Text>
                </View>
                {movie.release_date && (
                  <Text style={styles.metaText}>
                    {new Date(movie.release_date).getFullYear()}
                  </Text>
                )}
                {movie.runtime > 0 && (
                  <Text style={styles.metaText}>
                    {runtimeHours > 0 ? `${runtimeHours}s ` : ''}{runtimeMinutes}dk
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, watched && styles.watchedActive]}
                  onPress={handleToggleWatched}
                >
                  <Check size={16} color={watched ? '#10B981' : Colors.dark.textSecondary} />
                  <Text style={[styles.actionLabel, watched && styles.actionLabelWatched]}>İzledim</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, inWatchlist && styles.actionButtonActive]}
                  onPress={handleToggleWatchlist}
                >
                  {inWatchlist ? (
                    <BookmarkCheck size={16} color={Colors.dark.primary} />
                  ) : (
                    <Bookmark size={16} color={Colors.dark.textSecondary} />
                  )}
                  <Text style={[styles.actionLabel, inWatchlist && styles.actionLabelActive]}>İzlenecek</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, favorite && styles.favoriteActive]}
                  onPress={handleToggleFavorite}
                >
                  <Heart
                    size={16}
                    color={favorite ? '#EF4444' : Colors.dark.textSecondary}
                    fill={favorite ? '#EF4444' : 'transparent'}
                  />
                  <Text style={[styles.actionLabel, favorite && styles.actionLabelFavorite]}>Favori</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {genreNames.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genresScroll}>
              <View style={styles.genresContainer}>
                {genreNames.map(genre => (
                  <GenreBadge key={genre} genre={genre} />
                ))}
              </View>
            </ScrollView>
          )}

          {movie.tagline ? (
            <Text style={styles.tagline}>{movie.tagline}</Text>
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
                <Edit3 size={14} color={Colors.dark.primary} />
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
                <Star size={28} color={Colors.dark.primary} />
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
                    onPress={() => setPlayerVideo({ key: video.key, name: video.name })}
                  >
                    <View style={styles.videoIcon}>
                      <Play size={20} color={Colors.dark.accent} fill={Colors.dark.accent} />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={1}>{video.name}</Text>
                      <Text style={styles.videoType}>
                        {video.type === 'Trailer' ? 'Fragman' : video.type === 'Teaser' ? 'Teaser' : video.type}
                      </Text>
                    </View>
                    <ExternalLink size={16} color={Colors.dark.textTertiary} />
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
                  <Pressable
                    key={`provider-${provider.providerId}-${index}`}
                    style={styles.platformCard}
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
                    <View style={styles.platformArrow}>
                      <ExternalLink size={16} color={Colors.dark.primary} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yapım Bilgileri</Text>
            <View style={styles.infoGrid}>
              {director && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Yönetmen</Text>
                  <Text style={styles.infoValue}>{director.name}</Text>
                </View>
              )}
              {movie.release_date && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Yayın Tarihi</Text>
                  <Text style={styles.infoValue}>
                    {new Date(movie.release_date).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              )}
              {movie.production_companies && movie.production_companies.length > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Yapımcı</Text>
                  <Text style={styles.infoValue}>
                    {movie.production_companies.slice(0, 2).map(c => c.name).join(', ')}
                  </Text>
                </View>
              )}
              {movie.production_countries && movie.production_countries.length > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Ülke</Text>
                  <Text style={styles.infoValue}>
                    {movie.production_countries.map(c => c.name).join(', ')}
                  </Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Durum</Text>
                <Text style={styles.infoValue}>
                  {movie.status === 'Released' ? 'Yayınlandı' :
                   movie.status === 'Post Production' ? 'Post Prodüksiyon' :
                   movie.status === 'In Production' ? 'Yapım Aşamasında' :
                   movie.status === 'Planned' ? 'Planlandı' : movie.status}
                </Text>
              </View>
              {movie.spoken_languages && movie.spoken_languages.length > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Dil</Text>
                  <Text style={styles.infoValue}>
                    {movie.spoken_languages.map(l => l.name).join(', ')}
                  </Text>
                </View>
              )}
              {movie.budget > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Bütçe</Text>
                  <Text style={styles.infoValue}>${(movie.budget / 1000000).toFixed(1)}M</Text>
                </View>
              )}
              {movie.revenue > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Hasılat</Text>
                  <Text style={styles.infoValue}>${(movie.revenue / 1000000).toFixed(1)}M</Text>
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

          <View style={styles.bottomSpacer} />
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
            <View style={styles.reviewModalHandle} />
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
                placeholderTextColor={Colors.dark.textTertiary}
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

      <YouTubePlayer
        videoKey={playerVideo?.key ?? null}
        videoTitle={playerVideo?.name}
        visible={!!playerVideo}
        onClose={() => setPlayerVideo(null)}
      />
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
    gap: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    width: SCREEN_WIDTH,
    height: BACKDROP_HEIGHT,
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
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  shareButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -20,
  },
  posterRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  posterImage: {
    width: 110,
    height: 165,
    borderRadius: 12,
    backgroundColor: Colors.dark.backgroundSecondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  titleSection: {
    flex: 1,
    gap: 10,
    paddingTop: 4,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingValue: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  metaText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
    minWidth: 68,
  },
  actionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  actionLabelWatched: {
    color: '#10B981',
  },
  actionLabelActive: {
    color: Colors.dark.primary,
  },
  actionLabelFavorite: {
    color: '#EF4444',
  },
  watchedActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  favoriteActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  genresScroll: {
    marginBottom: 16,
  },
  genresContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagline: {
    color: Colors.dark.textSecondary,
    fontSize: 15,
    fontStyle: 'italic' as const,
    marginBottom: 16,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  overview: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  editButtonText: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  userReviewCard: {
    backgroundColor: Colors.dark.card.background,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    gap: 10,
  },
  userReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userReviewScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  userReviewScoreNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.dark.primary,
  },
  userReviewScoreLabel: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  userReviewDate: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  userReviewText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  addReviewCard: {
    backgroundColor: Colors.dark.card.background,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    gap: 8,
  },
  addReviewText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  addReviewSubtext: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
  },
  videosContainer: {
    gap: 8,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.dark.card.background,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.card.border,
  },
  videoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
    gap: 3,
  },
  videoTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  videoType: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  platformsContainer: {
    gap: 8,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.dark.card.background,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.card.border,
  },
  platformLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  platformInfo: {
    flex: 1,
    gap: 3,
  },
  platformName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  platformType: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  platformArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoGrid: {
    backgroundColor: Colors.dark.card.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.card.border,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  infoLabel: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
  },
  infoValue: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 16,
  },
  castContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  castCard: {
    width: 80,
    gap: 6,
    alignItems: 'center',
  },
  castImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  castName: {
    color: Colors.dark.text,
    fontSize: 11,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  castCharacter: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    textAlign: 'center' as const,
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  reviewModalContent: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  reviewModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  reviewModalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  reviewModalClose: {
    color: Colors.dark.textSecondary,
    fontSize: 22,
  },
  reviewModalBody: {
    padding: 20,
    gap: 16,
  },
  reviewModalLabel: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  ratingNumberContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: Colors.dark.primary,
  },
  ratingLabel: {
    fontSize: 20,
    color: Colors.dark.textSecondary,
    marginTop: -6,
  },
  ratingSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  ratingButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  ratingButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.textSecondary,
  },
  ratingButtonTextActive: {
    color: Colors.dark.text,
  },
  reviewInput: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: Colors.dark.text,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  saveReviewButton: {
    backgroundColor: Colors.dark.accent,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveReviewButtonDisabled: {
    opacity: 0.4,
  },
  saveReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
