import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Plus, Check, Heart, Star, Clock, Calendar, ChevronDown, ChevronUp, Play, ExternalLink, MessageCircle, ThumbsUp, Building2, Globe, CheckCircle2, Edit3 } from 'lucide-react-native';
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
import { WatchProgress } from '@/types/library';
import { getShowDetails, getImageUrl, convertShowToMediaItem, getSimilarShows } from '@/services/tvmaze';
import { MediaItem, TVMazeShow } from '@/types/tvmaze';
import { getStreamingProviders, StreamingProvider } from '@/services/streaming';
import { searchTMDBByName } from '@/services/hybrid';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addInteraction, isInWatchlist, isFavorite, isWatching, getInteraction, toggleEpisodeWatched, markAllEpisodesWatched, isEpisodeWatched, updateWatchProgress, addReview, getReview } = useLibrary();
  const insets = useSafeAreaInsets();
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const movieId = parseInt(id || '0', 10);

  const movieQuery = useQuery({
    queryKey: ['show', movieId],
    queryFn: () => getShowDetails(movieId),
    enabled: movieId > 0,
  });

  const similarQuery = useQuery({
    queryKey: ['similar', movieId],
    queryFn: () => getSimilarShows(movieId),
    enabled: movieId > 0,
  });

  const seasonsQuery = useQuery({
    queryKey: ['seasons', movieId],
    queryFn: async () => {
      const response = await fetch(`https://api.tvmaze.com/shows/${movieId}/seasons`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: movieId > 0,
  });

  const episodesQuery = useQuery({
    queryKey: ['episodes', movieId],
    queryFn: async () => {
      const response = await fetch(`https://api.tvmaze.com/shows/${movieId}/episodes`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: movieId > 0,
  });

  const videosQuery = useQuery({
    queryKey: ['videos', movieId],
    queryFn: async () => {
      try {
        const response = await fetch(`https://api.tvmaze.com/shows/${movieId}`);
        if (!response.ok) return [];
        const data = await response.json();
        const videos = [];
        if (data.officialSite) {
          videos.push({
            id: 'official',
            name: 'Resmi Site',
            url: data.officialSite,
            type: 'website',
          });
        }
        if (data.externals?.imdb) {
          videos.push({
            id: 'imdb',
            name: 'IMDb Sayfası',
            url: `https://www.imdb.com/title/${data.externals.imdb}`,
            type: 'website',
          });
        }
        return videos;
      } catch (error) {
        console.log('[Videos] Error:', error);
        return [];
      }
    },
    enabled: movieId > 0,
  });

  const streamingQuery = useQuery({
    queryKey: ['streaming', movieId],
    queryFn: async () => {
      try {
        const show = await getShowDetails(movieId);
        const tmdbMatch = await searchTMDBByName(show.name, show.premiered);
        if (!tmdbMatch) return [];
        const providers = await getStreamingProviders(tmdbMatch.id, 'tv');
        return providers;
      } catch (error) {
        console.log('[Streaming] Error:', error);
        return [];
      }
    },
    enabled: movieId > 0,
  });

  const movie = movieQuery.data;
  const inWatchlist = isInWatchlist(movieId, 'tv');
  const favorite = isFavorite(movieId, 'tv');
  const watching = isWatching(movieId, 'tv');
  const interaction = getInteraction(movieId, 'tv');
  const watchProgress = interaction?.watchProgress;
  const userReview = getReview(movieId, 'tv');

  const handleBack = () => {
    router.back();
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      addInteraction(movieId, 'tv', 'watched');
    } else {
      addInteraction(movieId, 'tv', 'watchlist');
    }
  };

  const handleToggleFavorite = () => {
    if (favorite) {
      addInteraction(movieId, 'tv', 'watched');
    } else {
      addInteraction(movieId, 'tv', 'favorite');
    }
  };

  const handleMoviePress = (selectedMovie: MediaItem) => {
    router.push(`/movie/${selectedMovie.id}` as any);
  };

  if (movieQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Film bulunamadı</Text>
      </View>
    );
  }

  const cast = movie.cast?.slice(0, 10) || [];
  const similarMovies = (similarQuery.data || []).map(convertShowToMediaItem);
  const seasons = seasonsQuery.data || [];
  const episodes = episodesQuery.data || [];
  const videos = videosQuery.data || [];
  const streamingProviders = streamingQuery.data || [];
  const totalEpisodes = episodes.length;
  const watchedEpisodes = watchProgress?.watchedEpisodes || 0;
  const progressPercentage = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;

  const getEpisodesBySeason = (seasonNumber: number) => {
    return episodes.filter((ep: any) => ep.season === seasonNumber);
  };

  const toggleSeason = (seasonNumber: number) => {
    setExpandedSeason(expandedSeason === seasonNumber ? null : seasonNumber);
  };

  const handleMarkAsWatched = () => {
    const allEpisodeIds = episodes.map((ep: any) => ep.id);
    markAllEpisodesWatched(movieId, 'tv', allEpisodeIds);
  };

  const handleToggleEpisodeWatched = (episodeId: number) => {
    toggleEpisodeWatched(movieId, 'tv', episodeId, totalEpisodes);
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
      addReview(movieId, 'tv', reviewRating, reviewText.trim() || undefined);
      setShowReviewModal(false);
    }
  };

  const handleMarkSeasonAsWatched = (seasonNumber: number) => {
    const seasonEpisodes = getEpisodesBySeason(seasonNumber);
    const seasonEpisodeIds = seasonEpisodes.map((ep: any) => ep.id);
    const allWatched = seasonEpisodeIds.every((id: number) => isEpisodeWatched(movieId, 'tv', id));
    
    if (allWatched) {
      const currentWatchedIds = interaction?.watchProgress?.watchedEpisodeIds || [];
      const newWatchedIds = currentWatchedIds.filter((id: number) => !seasonEpisodeIds.includes(id));
      const newProgress: WatchProgress = {
        totalEpisodes,
        watchedEpisodes: newWatchedIds.length,
        watchedEpisodeIds: newWatchedIds,
        lastWatchedAt: new Date().toISOString(),
      };
      updateWatchProgress(movieId, 'tv', newProgress);
    } else {
      const currentWatchedIds = interaction?.watchProgress?.watchedEpisodeIds || [];
      const newWatchedIds = [...new Set([...currentWatchedIds, ...seasonEpisodeIds])];
      const newProgress: WatchProgress = {
        totalEpisodes,
        watchedEpisodes: newWatchedIds.length,
        watchedEpisodeIds: newWatchedIds,
        lastWatchedAt: new Date().toISOString(),
      };
      updateWatchProgress(movieId, 'tv', newProgress);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          {getImageUrl(movie as TVMazeShow, 'original') ? (
            <Image
              source={{ uri: getImageUrl(movie as TVMazeShow, 'original') }}
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
            {getImageUrl(movie as TVMazeShow, 'medium') ? (
              <Image
                source={{ uri: getImageUrl(movie as TVMazeShow, 'medium') }}
                style={styles.posterImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.posterImage, { backgroundColor: Colors.dark.surfaceLight }]} />
            )}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{movie.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Star size={16} color={Colors.dark.warning} fill={Colors.dark.warning} />
                  <Text style={styles.metaText}>{movie.rating.average?.toFixed(1) || 'N/A'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Calendar size={16} color={Colors.dark.textSecondary} />
                  <Text style={styles.metaText}>
                    {movie.premiered ? new Date(movie.premiered).getFullYear() : 'N/A'}
                  </Text>
                </View>
                {movie.runtime && (
                  <View style={styles.metaItem}>
                    <Clock size={16} color={Colors.dark.textSecondary} />
                    <Text style={styles.metaText}>{movie.runtime} dk</Text>
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
                <Pressable
                  style={[styles.actionButton, watchedEpisodes === totalEpisodes && totalEpisodes > 0 && styles.actionButtonActive]}
                  onPress={handleMarkAsWatched}
                >
                  <CheckCircle2
                    size={20}
                    color={watchedEpisodes === totalEpisodes && totalEpisodes > 0 ? Colors.dark.success : Colors.dark.text}
                    fill={watchedEpisodes === totalEpisodes && totalEpisodes > 0 ? Colors.dark.success : 'transparent'}
                  />
                </Pressable>
              </View>
              {watching && (
                <View style={styles.statusBadge}>
                  <Clock size={14} color={Colors.dark.primary} />
                  <Text style={styles.statusBadgeText}>İzlemeye Devam Ediliyor</Text>
                </View>
              )}
              {watchedEpisodes === totalEpisodes && totalEpisodes > 0 && (
                <View style={[styles.statusBadge, styles.statusBadgeWatched]}>
                  <CheckCircle2 size={14} color={Colors.dark.success} />
                  <Text style={[styles.statusBadgeText, styles.statusBadgeTextWatched]}>İzlendi</Text>
                </View>
              )}
              {inWatchlist && watchedEpisodes === 0 && (
                <View style={[styles.statusBadge, styles.statusBadgeWatchlist]}>
                  <Plus size={14} color={Colors.dark.warning} />
                  <Text style={[styles.statusBadgeText, styles.statusBadgeTextWatchlist]}>İzlenecekler Listesinde</Text>
                </View>
              )}
            </View>
          </View>

          {movie.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {movie.genres.map(genre => (
                <GenreBadge key={genre} genre={genre} />
              ))}
            </View>
          )}

          {totalEpisodes > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {watchedEpisodes} / {totalEpisodes} Bölüm İzlendi
                </Text>
                <Text style={styles.progressPercentage}>
                  {progressPercentage.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
              </View>
            </View>
          )}



          {movie.summary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Özet</Text>
              <Text style={styles.overview}>{movie.summary.replace(/<[^>]*>/g, '')}</Text>
            </View>
          )}

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
                <Text style={styles.addReviewText}>Bu diziyi değerlendirin</Text>
                <Text style={styles.addReviewSubtext}>Puanınızı ve yorumunuzu paylaşın</Text>
              </Pressable>
            )}
          </View>



          {videos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Videolar & Bağlantılar</Text>
              <View style={styles.videosContainer}>
                {videos.map((video: any) => (
                  <Pressable
                    key={video.id}
                    style={styles.videoCard}
                    onPress={() => Linking.openURL(video.url)}
                  >
                    <View style={styles.videoIcon}>
                      {video.type === 'website' ? (
                        <ExternalLink size={24} color={Colors.dark.primary} />
                      ) : (
                        <Play size={24} color={Colors.dark.primary} />
                      )}
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle}>{video.name}</Text>
                      <Text style={styles.videoType}>
                        {video.type === 'website' ? 'Harici Bağlantı' : 'Video'}
                      </Text>
                    </View>
                    <ExternalLink size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {seasons.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sezonlar & Bölümler</Text>
              {seasons.map((season: any) => {
                const seasonEpisodes = getEpisodesBySeason(season.number);
                const isExpanded = expandedSeason === season.number;
                const seasonEpisodeIds = seasonEpisodes.map((ep: any) => ep.id);
                const allSeasonWatched = seasonEpisodeIds.length > 0 && seasonEpisodeIds.every((id: number) => isEpisodeWatched(movieId, 'tv', id));
                return (
                  <View key={season.id} style={styles.seasonCard}>
                    <Pressable
                      style={styles.seasonHeader}
                      onPress={() => toggleSeason(season.number)}
                    >
                      <View style={styles.seasonInfo}>
                        <Text style={styles.seasonTitle}>Sezon {season.number}</Text>
                        <Text style={styles.seasonMeta}>
                          {seasonEpisodes.length} Bölüm
                          {season.premiereDate && ` • ${new Date(season.premiereDate).getFullYear()}`}
                        </Text>
                      </View>
                      <View style={styles.seasonHeaderActions}>
                        <Pressable
                          style={[styles.seasonCheckButton, allSeasonWatched && styles.seasonCheckButtonActive]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleMarkSeasonAsWatched(season.number);
                          }}
                        >
                          <CheckCircle2
                            size={20}
                            color={allSeasonWatched ? Colors.dark.success : Colors.dark.textSecondary}
                            fill={allSeasonWatched ? Colors.dark.success : 'transparent'}
                          />
                        </Pressable>
                        {isExpanded ? (
                          <ChevronUp size={20} color={Colors.dark.textSecondary} />
                        ) : (
                          <ChevronDown size={20} color={Colors.dark.textSecondary} />
                        )}
                      </View>
                    </Pressable>
                    {isExpanded && (
                      <View style={styles.episodesList}>
                        {seasonEpisodes.map((episode: any) => {
                          const isWatched = isEpisodeWatched(movieId, 'tv', episode.id);
                          return (
                            <Pressable 
                              key={episode.id} 
                              style={[styles.episodeCard, isWatched && styles.episodeCardWatched]}
                              onPress={() => handleToggleEpisodeWatched(episode.id)}
                            >
                              <View style={styles.episodeImageContainer}>
                                {episode.image?.medium ? (
                                  <Image
                                    source={{ uri: episode.image.medium }}
                                    style={styles.episodeImage}
                                    contentFit="cover"
                                  />
                                ) : (
                                  <View style={styles.episodePlaceholder}>
                                    <Play size={24} color={Colors.dark.textSecondary} />
                                  </View>
                                )}
                                {isWatched && (
                                  <View style={styles.episodeWatchedOverlay}>
                                    <CheckCircle2 size={32} color={Colors.dark.success} fill={Colors.dark.success} />
                                  </View>
                                )}
                              </View>
                              <View style={styles.episodeInfo}>
                                <Text style={styles.episodeNumber}>Bölüm {episode.number}</Text>
                                <Text style={[styles.episodeTitle, isWatched && styles.episodeTitleWatched]} numberOfLines={2}>
                                  {episode.name}
                                </Text>
                                {episode.runtime && (
                                  <Text style={styles.episodeRuntime}>{episode.runtime} dk</Text>
                                )}
                                {episode.summary && (
                                  <Text style={styles.episodeSummary} numberOfLines={2}>
                                    {episode.summary.replace(/<[^>]*>/g, '')}
                                  </Text>
                                )}
                              </View>
                              <Pressable 
                                style={[styles.episodeCheckButton, isWatched && styles.episodeCheckButtonActive]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleToggleEpisodeWatched(episode.id);
                                }}
                              >
                                <CheckCircle2 
                                  size={20} 
                                  color={isWatched ? Colors.dark.success : Colors.dark.textSecondary}
                                  fill={isWatched ? Colors.dark.success : 'transparent'}
                                />
                              </Pressable>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {streamingProviders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nerede İzleyebilirsiniz?</Text>
              <View style={styles.platformsContainer}>
                {streamingProviders.map((provider: StreamingProvider) => (
                  <View key={provider.providerId} style={styles.platformCard}>
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
                            Linking.openURL(`https://www.themoviedb.org/tv/${movieId}/watch`);
                          });
                        } else {
                          Linking.openURL(`https://www.themoviedb.org/tv/${movieId}/watch`);
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
                onPress={() => Linking.openURL(`https://www.themoviedb.org/tv/${movieId}/watch`)}
              >
                <Globe size={16} color={Colors.dark.primary} />
                <Text style={styles.moreProvidersText}>Tüm platformları görüntüle</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kullanıcı Değerlendirmeleri</Text>
            <View style={styles.reviewsContainer}>
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>🎬</Text>
                  </View>
                  <View style={styles.reviewAuthor}>
                    <Text style={styles.reviewAuthorName}>Film Sever</Text>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={`review-1-star-${star}`}
                          size={12}
                          color={star <= 4 ? Colors.dark.warning : Colors.dark.textSecondary}
                          fill={star <= 4 ? Colors.dark.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>
                  Harika bir dizi! Karakterler çok iyi geliştirilmiş ve hikaye akışı mükemmel. Her bölümü heyecanla bekliyorum.
                </Text>
                <View style={styles.reviewFooter}>
                  <Pressable style={styles.reviewAction}>
                    <ThumbsUp size={16} color={Colors.dark.textSecondary} />
                    <Text style={styles.reviewActionText}>24</Text>
                  </Pressable>
                  <Pressable style={styles.reviewAction}>
                    <MessageCircle size={16} color={Colors.dark.textSecondary} />
                    <Text style={styles.reviewActionText}>5</Text>
                  </Pressable>
                  <Text style={styles.reviewDate}>2 gün önce</Text>
                </View>
              </View>

              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>🎭</Text>
                  </View>
                  <View style={styles.reviewAuthor}>
                    <Text style={styles.reviewAuthorName}>Dizi Tutkunu</Text>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={`review-2-star-${star}`}
                          size={12}
                          color={star <= 5 ? Colors.dark.warning : Colors.dark.textSecondary}
                          fill={star <= 5 ? Colors.dark.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>
                  Kesinlikle izlenmesi gereken bir yapım. Görsel efektler ve müzikler de harika.
                </Text>
                <View style={styles.reviewFooter}>
                  <Pressable style={styles.reviewAction}>
                    <ThumbsUp size={16} color={Colors.dark.textSecondary} />
                    <Text style={styles.reviewActionText}>18</Text>
                  </Pressable>
                  <Pressable style={styles.reviewAction}>
                    <MessageCircle size={16} color={Colors.dark.textSecondary} />
                    <Text style={styles.reviewActionText}>3</Text>
                  </Pressable>
                  <Text style={styles.reviewDate}>1 hafta önce</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yapım Bilgileri</Text>
            <View style={styles.productionContainer}>
              <View style={styles.productionItem}>
                <View style={styles.productionIcon}>
                  <Building2 size={20} color={Colors.dark.primary} />
                </View>
                <View style={styles.productionInfo}>
                  <Text style={styles.productionLabel}>Yapımcı</Text>
                  <Text style={styles.productionValue}>
                    {movie.network?.name || movie.webChannel?.name || 'Bilinmiyor'}
                  </Text>
                </View>
              </View>

              <View style={styles.productionItem}>
                <View style={styles.productionIcon}>
                  <Globe size={20} color={Colors.dark.primary} />
                </View>
                <View style={styles.productionInfo}>
                  <Text style={styles.productionLabel}>Ülke</Text>
                  <Text style={styles.productionValue}>
                    {movie.network?.country?.name || movie.webChannel?.country?.name || 'Bilinmiyor'}
                  </Text>
                </View>
              </View>

              <View style={styles.productionItem}>
                <View style={styles.productionIcon}>
                  <Calendar size={20} color={Colors.dark.primary} />
                </View>
                <View style={styles.productionInfo}>
                  <Text style={styles.productionLabel}>Durum</Text>
                  <Text style={styles.productionValue}>
                    {movie.status === 'Running' ? 'İzleniyor' : 
                     movie.status === 'Ended' ? 'Bitti' : 
                     movie.status === 'To Be Determined' ? 'Belirsiz' : movie.status}
                  </Text>
                </View>
              </View>

              {movie.language && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <MessageCircle size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Dil</Text>
                    <Text style={styles.productionValue}>{movie.language}</Text>
                  </View>
                </View>
              )}

              {movie.premiered && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Star size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Yayın Tarihi</Text>
                    <Text style={styles.productionValue}>
                      {new Date(movie.premiered).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {movie.ended && (
                <View style={styles.productionItem}>
                  <View style={styles.productionIcon}>
                    <Clock size={20} color={Colors.dark.primary} />
                  </View>
                  <View style={styles.productionInfo}>
                    <Text style={styles.productionLabel}>Bitiş Tarihi</Text>
                    <Text style={styles.productionValue}>
                      {new Date(movie.ended).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
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
                  {cast.map(actor => (
                    <View key={actor.person.id} style={styles.castCard}>
                      {actor.person.image?.medium ? (
                        <Image
                          source={{ uri: actor.person.image.medium }}
                          style={styles.castImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.castImage, { backgroundColor: Colors.dark.surfaceLight }]} />
                      )}
                      <Text style={styles.castName} numberOfLines={1}>
                        {actor.person.name}
                      </Text>
                      <Text style={styles.castCharacter} numberOfLines={1}>
                        {actor.character.name}
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
  crewText: {
    color: Colors.dark.text,
    fontSize: 16,
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
  seasonCard: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    padding: 16,
  },
  seasonInfo: {
    flex: 1,
  },
  seasonTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  seasonMeta: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  episodesList: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  episodeCard: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  episodeImageContainer: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  episodePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  episodeInfo: {
    flex: 1,
    gap: 4,
  },
  episodeNumber: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  episodeTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  episodeRuntime: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  episodeSummary: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 16,
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
  reviewsContainer: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: Colors.dark.surfaceLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  reviewAvatarText: {
    fontSize: 20,
  },
  reviewAuthor: {
    flex: 1,
    gap: 4,
  },
  reviewAuthorName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 16,
  },
  reviewAction: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 4,
  },
  reviewActionText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  reviewDate: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginLeft: 'auto' as const,
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
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
  progressSection: {
    backgroundColor: Colors.dark.surfaceLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  progressText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  progressPercentage: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 4,
  },
  episodeCheckButton: {
    width: 32,
    height: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  episodeCheckButtonActive: {
    backgroundColor: `${Colors.dark.success}20`,
    borderColor: Colors.dark.success,
  },
  episodeCardWatched: {
    opacity: 0.7,
  },
  episodeTitleWatched: {
    textDecorationLine: 'line-through' as const,
    color: Colors.dark.textSecondary,
  },
  episodeWatchedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: `${Colors.dark.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  statusBadgeText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadgeWatched: {
    backgroundColor: `${Colors.dark.success}20`,
    borderColor: Colors.dark.success,
  },
  statusBadgeTextWatched: {
    color: Colors.dark.success,
  },
  statusBadgeWatchlist: {
    backgroundColor: `${Colors.dark.warning}20`,
    borderColor: Colors.dark.warning,
  },
  statusBadgeTextWatchlist: {
    color: Colors.dark.warning,
  },
  seasonHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  seasonCheckButton: {
    width: 32,
    height: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  seasonCheckButtonActive: {
    backgroundColor: `${Colors.dark.success}20`,
    borderColor: Colors.dark.success,
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
  userReviewRating: {
    flexDirection: 'row',
    gap: 4,
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
  ratingStar: {
    padding: 4,
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
