import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Star, Heart, Calendar, Play, Check, ChevronDown, ChevronUp, Clock, Tv, Share2, Bookmark, BookmarkCheck, CheckCircle2, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  Share,
  Animated,
} from 'react-native';
import Colors from '@/constants/colors';
import GenreBadge from '@/components/GenreBadge';
import { useLibrary } from '@/contexts/LibraryContext';
import { getShowDetails, getSimilarShows, convertShowToMediaItem } from '@/services/tvmaze';
import { TVMazeEpisode } from '@/types/tvmaze';
import { getStreamingProviders, StreamingProvider } from '@/services/streaming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKDROP_HEIGHT = SCREEN_WIDTH * 0.75;

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    addInteraction,
    removeInteraction,
    isInWatchlist,
    isWatched: isWatchedFn,
    isFavorite,
    toggleEpisodeWatched,
    isEpisodeWatched,
    markAllEpisodesWatched,
    getInteraction,
  } = useLibrary();
  const insets = useSafeAreaInsets();
  const [expandedSeason, setExpandedSeason] = useState<number | null>(1);

  const showId = parseInt(id || '0', 10);

  const showQuery = useQuery({
    queryKey: ['tvmaze-show', showId],
    queryFn: () => getShowDetails(showId),
    enabled: showId > 0,
    retry: 1,
  });

  const similarQuery = useQuery({
    queryKey: ['tvmaze-similar', showId],
    queryFn: () => getSimilarShows(showId),
    enabled: showId > 0,
  });

  const show = showQuery.data;
  const inWatchlist = isInWatchlist(showId, 'tv');
  const watched = isWatchedFn(showId, 'tv');
  const favorite = isFavorite(showId, 'tv');
  const interaction = getInteraction(showId, 'tv');

  const episodes = show?.episodes || [];
  const totalEpisodes = episodes.length;

  const seasonGroups = useMemo(() => {
    const groups: Record<number, TVMazeEpisode[]> = {};
    episodes.forEach(ep => {
      if (!groups[ep.season]) groups[ep.season] = [];
      groups[ep.season].push(ep);
    });
    return groups;
  }, [episodes]);

  const seasonNumbers = useMemo(() => {
    return Object.keys(seasonGroups).map(Number).sort((a, b) => a - b);
  }, [seasonGroups]);

  const watchedCount = useMemo(() => {
    return interaction?.watchProgress?.watchedEpisodes || 0;
  }, [interaction]);

  const progressPercentage = totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

  const handleBack = () => {
    router.back();
  };

  const handleToggleWatched = () => {
    if (watched) {
      removeInteraction(showId, 'tv');
    } else {
      addInteraction(showId, 'tv', 'watched');
    }
  };

  const handleToggleWatchlist = () => {
    if (inWatchlist) {
      removeInteraction(showId, 'tv');
    } else {
      addInteraction(showId, 'tv', 'watchlist');
    }
  };

  const handleToggleFavorite = () => {
    if (favorite) {
      removeInteraction(showId, 'tv');
    } else {
      addInteraction(showId, 'tv', 'favorite');
    }
  };

  const handleToggleEpisode = useCallback((episodeId: number) => {
    toggleEpisodeWatched(showId, 'tv', episodeId, totalEpisodes);
  }, [showId, totalEpisodes, toggleEpisodeWatched]);

  const handleMarkSeasonWatched = useCallback((seasonNumber: number) => {
    const seasonEps = seasonGroups[seasonNumber] || [];
    const allEpisodeIds = episodes.map(ep => ep.id);
    const seasonEpIds = seasonEps.map(ep => ep.id);
    const allSeasonWatched = seasonEpIds.every(epId => isEpisodeWatched(showId, 'tv', epId));

    if (allSeasonWatched) {
      seasonEpIds.forEach(epId => {
        if (isEpisodeWatched(showId, 'tv', epId)) {
          toggleEpisodeWatched(showId, 'tv', epId, totalEpisodes);
        }
      });
    } else {
      const currentWatchedIds = interaction?.watchProgress?.watchedEpisodeIds || [];
      const newWatchedIds = [...new Set([...currentWatchedIds, ...seasonEpIds])];
      markAllEpisodesWatched(showId, 'tv', newWatchedIds);
    }
  }, [showId, seasonGroups, episodes, totalEpisodes, interaction, isEpisodeWatched, toggleEpisodeWatched, markAllEpisodesWatched]);

  const handleMarkAllWatched = useCallback(() => {
    const allIds = episodes.map(ep => ep.id);
    const allWatched = allIds.every(epId => isEpisodeWatched(showId, 'tv', epId));
    if (allWatched) {
      allIds.forEach(epId => {
        if (isEpisodeWatched(showId, 'tv', epId)) {
          toggleEpisodeWatched(showId, 'tv', epId, totalEpisodes);
        }
      });
    } else {
      markAllEpisodesWatched(showId, 'tv', allIds);
    }
  }, [showId, episodes, totalEpisodes, isEpisodeWatched, toggleEpisodeWatched, markAllEpisodesWatched]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${show?.name} - Rating: ${show?.rating?.average || 'N/A'}/10`,
        title: show?.name || '',
      });
    } catch (error) {
      console.log('[SeriesDetail] Share error:', error);
    }
  };

  const handleSimilarPress = useCallback((showItem: any) => {
    router.push(`/series/${showItem.id}` as any);
  }, [router]);

  const isSeasonFullyWatched = useCallback((seasonNumber: number) => {
    const seasonEps = seasonGroups[seasonNumber] || [];
    return seasonEps.length > 0 && seasonEps.every(ep => isEpisodeWatched(showId, 'tv', ep.id));
  }, [seasonGroups, showId, isEpisodeWatched]);

  const getSeasonWatchedCount = useCallback((seasonNumber: number) => {
    const seasonEps = seasonGroups[seasonNumber] || [];
    return seasonEps.filter(ep => isEpisodeWatched(showId, 'tv', ep.id)).length;
  }, [seasonGroups, showId, isEpisodeWatched]);

  if (showQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingDot} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!show) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Dizi bulunamadı</Text>
      </View>
    );
  }

  const cast = show.cast?.slice(0, 10) || [];
  const similarShows = (similarQuery.data || []).slice(0, 10);
  const overview = show.summary ? show.summary.replace(/<[^>]*>/g, '') : '';
  const backdropUrl = show.image?.original || null;
  const posterUrl = show.image?.medium || null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          {backdropUrl ? (
            <Image
              source={{ uri: backdropUrl }}
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
        </View>

        <View style={styles.content}>
          <View style={styles.posterRow}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={styles.posterImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.posterImage, { backgroundColor: Colors.dark.backgroundSecondary }]} />
            )}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{show.name}</Text>
              <View style={styles.metaRow}>
                {show.rating?.average && (
                  <View style={styles.ratingBadge}>
                    <Star size={14} color="#FBBF24" fill="#FBBF24" />
                    <Text style={styles.ratingValue}>{show.rating.average.toFixed(1)}</Text>
                  </View>
                )}
                {show.premiered && (
                  <Text style={styles.metaText}>
                    {new Date(show.premiered).getFullYear()}
                    {show.ended ? ` - ${new Date(show.ended).getFullYear()}` : ''}
                  </Text>
                )}
              </View>
              <View style={styles.metaRow}>
                {show.network && (
                  <View style={styles.networkBadge}>
                    <Tv size={12} color={Colors.dark.primary} />
                    <Text style={styles.networkText}>{show.network.name}</Text>
                  </View>
                )}
                {show.status && (
                  <View style={[styles.statusBadge, show.status === 'Running' ? styles.statusRunning : styles.statusEnded]}>
                    <Text style={[styles.statusText, show.status === 'Running' ? styles.statusRunningText : styles.statusEndedText]}>
                      {show.status === 'Running' ? 'Devam Ediyor' : show.status === 'Ended' ? 'Bitti' : show.status}
                    </Text>
                  </View>
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

          {show.genres && show.genres.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genresScroll}>
              <View style={styles.genresContainer}>
                {show.genres.map(genre => (
                  <GenreBadge key={genre} genre={genre} />
                ))}
              </View>
            </ScrollView>
          )}

          {totalEpisodes > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>İlerleme</Text>
                  <Text style={styles.progressCount}>
                    {watchedCount}/{totalEpisodes} bölüm
                  </Text>
                </View>
                <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
              </View>
            </View>
          )}

          {overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Özet</Text>
              <Text style={styles.overview}>{overview}</Text>
            </View>
          ) : null}

          {seasonNumbers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.episodesHeader}>
                <Text style={styles.sectionTitle}>Bölümler</Text>
                <Pressable style={styles.markAllButton} onPress={handleMarkAllWatched}>
                  <CheckCircle2 size={16} color={Colors.dark.primary} />
                  <Text style={styles.markAllText}>
                    {episodes.every(ep => isEpisodeWatched(showId, 'tv', ep.id))
                      ? 'Hepsini Kaldır'
                      : 'Hepsini İzledim'}
                  </Text>
                </Pressable>
              </View>

              {seasonNumbers.map(seasonNum => {
                const seasonEps = seasonGroups[seasonNum] || [];
                const isExpanded = expandedSeason === seasonNum;
                const seasonWatched = getSeasonWatchedCount(seasonNum);
                const seasonTotal = seasonEps.length;
                const isFullyWatched = isSeasonFullyWatched(seasonNum);
                const seasonProgress = seasonTotal > 0 ? (seasonWatched / seasonTotal) * 100 : 0;

                return (
                  <View key={`season-${seasonNum}`} style={styles.seasonContainer}>
                    <Pressable
                      style={styles.seasonHeader}
                      onPress={() => setExpandedSeason(isExpanded ? null : seasonNum)}
                    >
                      <View style={styles.seasonHeaderLeft}>
                        <View style={[styles.seasonBadge, isFullyWatched && styles.seasonBadgeCompleted]}>
                          {isFullyWatched ? (
                            <Check size={14} color="#FFFFFF" />
                          ) : (
                            <Text style={styles.seasonBadgeText}>{seasonNum}</Text>
                          )}
                        </View>
                        <View style={styles.seasonInfo}>
                          <Text style={styles.seasonTitle}>Sezon {seasonNum}</Text>
                          <Text style={styles.seasonEpisodeCount}>
                            {seasonWatched}/{seasonTotal} bölüm izlendi
                          </Text>
                        </View>
                      </View>
                      <View style={styles.seasonHeaderRight}>
                        <Pressable
                          style={styles.seasonCheckButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleMarkSeasonWatched(seasonNum);
                          }}
                          hitSlop={8}
                        >
                          <CheckCircle2
                            size={20}
                            color={isFullyWatched ? Colors.dark.success : Colors.dark.textTertiary}
                            fill={isFullyWatched ? Colors.dark.success : 'transparent'}
                          />
                        </Pressable>
                        {isExpanded ? (
                          <ChevronUp size={20} color={Colors.dark.textSecondary} />
                        ) : (
                          <ChevronDown size={20} color={Colors.dark.textSecondary} />
                        )}
                      </View>
                    </Pressable>

                    {seasonProgress > 0 && !isExpanded && (
                      <View style={styles.seasonProgressBar}>
                        <View style={[styles.seasonProgressFill, { width: `${seasonProgress}%` }]} />
                      </View>
                    )}

                    {isExpanded && (
                      <View style={styles.episodesList}>
                        {seasonEps.map(episode => {
                          const watched = isEpisodeWatched(showId, 'tv', episode.id);
                          return (
                            <Pressable
                              key={`ep-${episode.id}`}
                              style={[styles.episodeItem, watched && styles.episodeItemWatched]}
                              onPress={() => handleToggleEpisode(episode.id)}
                            >
                              <View style={styles.episodeLeft}>
                                <View style={[styles.episodeCheckbox, watched && styles.episodeCheckboxChecked]}>
                                  {watched ? (
                                    <Check size={12} color="#FFFFFF" />
                                  ) : (
                                    <Text style={styles.episodeNumber}>{episode.number}</Text>
                                  )}
                                </View>
                                <View style={styles.episodeInfo}>
                                  <Text
                                    style={[styles.episodeName, watched && styles.episodeNameWatched]}
                                    numberOfLines={1}
                                  >
                                    {episode.name}
                                  </Text>
                                  <View style={styles.episodeMeta}>
                                    {episode.airdate && (
                                      <Text style={styles.episodeDate}>
                                        {new Date(episode.airdate).toLocaleDateString('tr-TR', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </Text>
                                    )}
                                    {episode.runtime && (
                                      <Text style={styles.episodeRuntime}>
                                        {episode.runtime} dk
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </View>
                              {episode.rating?.average && (
                                <View style={styles.episodeRating}>
                                  <Star size={10} color="#FBBF24" fill="#FBBF24" />
                                  <Text style={styles.episodeRatingText}>
                                    {episode.rating.average.toFixed(1)}
                                  </Text>
                                </View>
                              )}
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

          {cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Oyuncular</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.castContainer}>
                  {cast.map((actor, actorIndex) => (
                    <View key={`actor-${actor.person.id}-${actorIndex}`} style={styles.castCard}>
                      {actor.person.image ? (
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

          {similarShows.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benzer Diziler</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.similarContainer}>
                  {similarShows.map((similarShow, idx) => (
                    <Pressable
                      key={`similar-${similarShow.id}-${idx}`}
                      style={styles.similarCard}
                      onPress={() => handleSimilarPress(similarShow)}
                    >
                      {similarShow.image?.medium ? (
                        <Image
                          source={{ uri: similarShow.image.medium }}
                          style={styles.similarImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.similarImage, { backgroundColor: Colors.dark.surfaceLight }]} />
                      )}
                      <Text style={styles.similarTitle} numberOfLines={2}>{similarShow.name}</Text>
                      {similarShow.rating?.average && (
                        <View style={styles.similarRating}>
                          <Star size={10} color="#FBBF24" fill="#FBBF24" />
                          <Text style={styles.similarRatingText}>{similarShow.rating.average.toFixed(1)}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
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
    gap: 8,
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
    gap: 10,
    flexWrap: 'wrap',
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
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  networkText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusRunning: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusEnded: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusRunningText: {
    color: Colors.dark.success,
  },
  statusEndedText: {
    color: Colors.dark.textTertiary,
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
  progressSection: {
    backgroundColor: Colors.dark.card.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.card.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressInfo: {
    gap: 2,
  },
  progressTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  progressCount: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  progressPercentage: {
    color: Colors.dark.primary,
    fontSize: 24,
    fontWeight: '800' as const,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 3,
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
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  markAllButton: {
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
  markAllText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  seasonContainer: {
    backgroundColor: Colors.dark.card.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.card.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  seasonHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  seasonBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  seasonBadgeCompleted: {
    backgroundColor: Colors.dark.success,
    borderColor: Colors.dark.success,
  },
  seasonBadgeText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  seasonInfo: {
    flex: 1,
    gap: 2,
  },
  seasonTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  seasonEpisodeCount: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
  },
  seasonHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seasonCheckButton: {
    padding: 2,
  },
  seasonProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  seasonProgressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  episodesList: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  episodeItemWatched: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  episodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  episodeCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeCheckboxChecked: {
    backgroundColor: Colors.dark.success,
    borderColor: Colors.dark.success,
  },
  episodeNumber: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  episodeInfo: {
    flex: 1,
    gap: 3,
  },
  episodeName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  episodeNameWatched: {
    color: Colors.dark.textSecondary,
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  episodeDate: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  episodeRuntime: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  episodeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 8,
  },
  episodeRatingText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600' as const,
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
  similarContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  similarCard: {
    width: 120,
    gap: 6,
  },
  similarImage: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  similarTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  similarRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  similarRatingText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  bottomSpacer: {
    height: 40,
  },
});
