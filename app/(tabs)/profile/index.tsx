import { Film, Heart, Clock, TrendingUp, Settings, User, Bell, Shield, Moon, Globe, Volume2, Vibrate, ChevronRight, BarChart3, Award, Target, Flame, Zap, Star, Tv, Camera, Edit3, Share2, Users, MessageCircle, Trophy, Gift } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  Image,
  Share,
  Alert,
} from 'react-native';
import Colors from '@/constants/colors';
import GlassPanel from '@/components/GlassPanel';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { trpc } from '@/lib/trpc';
import { getShowDetails } from '@/services/tvmaze';
import { TVMazeShow } from '@/types/tvmaze';

export default function ProfileScreen() {
  const router = useRouter();
  const { getInteractionsByType } = useLibrary();
  const { preferences, updatePreferences } = usePreferences();
  const insets = useSafeAreaInsets();
  const statsQuery = trpc.library.getStats.useQuery();
  const stats = statsQuery.data || {
    totalWatched: 0,
    totalWatchlist: 0,
    totalFavorites: 0,
    totalEpisodesWatched: 0,
    genreDistribution: {},
    averageRating: 0,
    monthlyWatchTime: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastWatchDate: undefined,
  };
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [username, setUsername] = useState('Film Sever');
  const [bio, setBio] = useState('Sinema tutkunu');
  const [recentShows, setRecentShows] = useState<Array<{ show: TVMazeShow; interaction: any }>>([]);
  const [loadingShows, setLoadingShows] = useState(true);

  const recentlyWatched = getInteractionsByType('watched')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  useEffect(() => {
    loadRecentShows();
  }, [recentlyWatched.length]);

  const loadRecentShows = async () => {
    try {
      setLoadingShows(true);
      console.log('[Profile] Loading recent shows:', recentlyWatched.length);
      
      const showsData = await Promise.all(
        recentlyWatched.map(async (interaction) => {
          try {
            const show = await getShowDetails(interaction.mediaId);
            return { show, interaction };
          } catch (error) {
            console.error('[Profile] Error loading show:', interaction.mediaId, error);
            return null;
          }
        })
      );
      
      const validShows = showsData.filter(item => item !== null) as Array<{ show: TVMazeShow; interaction: any }>;
      console.log('[Profile] Loaded shows:', validShows.length);
      setRecentShows(validShows);
    } catch (error) {
      console.error('[Profile] Error loading recent shows:', error);
    } finally {
      setLoadingShows(false);
    }
  };

  const statCards = [
    {
      icon: Film,
      label: 'İzlenen',
      value: stats.totalWatched,
      color: Colors.dark.primary,
    },
    {
      icon: Clock,
      label: 'İzlenecek',
      value: stats.totalWatchlist,
      color: Colors.dark.warning,
    },
    {
      icon: Heart,
      label: 'Favori',
      value: stats.totalFavorites,
      color: Colors.dark.accent,
    },
    {
      icon: TrendingUp,
      label: 'Ort. Puan',
      value: stats.averageRating.toFixed(1),
      color: Colors.dark.success,
    },
  ];

  const totalShows = stats.totalWatched + stats.totalWatchlist + stats.totalFavorites;
  const watchedPercentage = totalShows > 0 ? (stats.totalWatched / totalShows * 100).toFixed(0) : 0;

  const handleShare = async () => {
    try {
      const message = `🎬 Cinematch'te ${stats.totalWatched} dizi izledim!\n⭐ Ortalama puanım: ${stats.averageRating.toFixed(1)}\n🔥 Güncel serim: ${stats.currentStreak} gün\n\nSen de katıl ve dizi keşfetmeye başla!`;
      
      const result = await Share.share({
        message,
        title: 'Cinematch İstatistiklerim',
      });

      if (result.action === Share.sharedAction) {
        console.log('[Profile] Shared successfully');
      }
    } catch (error) {
      console.error('[Profile] Error sharing:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={styles.header}>
          <Pressable style={styles.avatarContainer} onPress={() => setShowEditProfileModal(true)}>
            <Text style={styles.avatarText}>🎬</Text>
            <View style={styles.avatarBadge}>
              <Camera size={16} color={Colors.dark.text} />
            </View>
          </Pressable>
          <View style={styles.userInfo}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{username}</Text>
              <Pressable onPress={() => setShowEditProfileModal(true)}>
                <Edit3 size={20} color={Colors.dark.primary} />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>{bio}</Text>
          </View>
          <View style={styles.socialActions}>
            <Pressable style={styles.socialButton} onPress={() => router.push('/social')}>
              <Users size={20} color={Colors.dark.text} />
              <Text style={styles.socialButtonText}>Arkadaşlar</Text>
            </Pressable>
            <Pressable style={styles.socialButton} onPress={handleShare}>
              <Share2 size={20} color={Colors.dark.text} />
              <Text style={styles.socialButtonText}>Paylaş</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => router.push('/stats')}>
          <View style={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <GlassPanel key={index} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
                  <stat.icon size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassPanel>
            ))}
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İlerleme</Text>
          <View style={styles.progressRow}>
            <GlassPanel style={styles.progressCardHalf}>
              <View style={styles.progressHeader}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>İzleme Oranı</Text>
                  <Text style={styles.progressPercentage}>{watchedPercentage}%</Text>
                </View>
                <View style={styles.progressIconContainer}>
                  <Target size={24} color={Colors.dark.primary} />
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${watchedPercentage}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {stats.totalWatched} / {totalShows} dizi
              </Text>
            </GlassPanel>

            <GlassPanel style={styles.progressCardHalf}>
              <View style={styles.streakHeader}>
                <View style={[styles.streakIconContainer, { backgroundColor: `${Colors.dark.warning}20` }]}>
                  <Flame size={24} color={Colors.dark.warning} />
                </View>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakLabel}>Güncel Seri</Text>
                  <Text style={styles.streakValue}>{stats.currentStreak} gün</Text>
                </View>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakFooter}>
                <Zap size={16} color={Colors.dark.textSecondary} />
                <Text style={styles.streakFooterText}>En uzun: {stats.longestStreak} gün</Text>
              </View>
            </GlassPanel>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Haftalık Aktivite</Text>
          <GlassPanel style={styles.activityCard}>
            <View style={styles.activityChart}>
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => {
                const today = new Date();
                const dayDate = new Date(today);
                dayDate.setDate(today.getDate() - (6 - index));
                const dayInteractions = getInteractionsByType('watched').filter(i => {
                  const interactionDate = new Date(i.updatedAt);
                  return interactionDate.toDateString() === dayDate.toDateString();
                });
                const count = dayInteractions.length;
                const maxCount = 5;
                const height = Math.min((count / maxCount) * 100, 100);
                
                return (
                  <View key={day} style={styles.activityDay}>
                    <View style={styles.activityBarContainer}>
                      <View 
                        style={[
                          styles.activityBar, 
                          { height: `${height}%`, backgroundColor: count > 0 ? Colors.dark.primary : Colors.dark.border }
                        ]} 
                      />
                    </View>
                    <Text style={styles.activityDayLabel}>{day}</Text>
                    <Text style={styles.activityDayCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </GlassPanel>
        </View>

        {recentShows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son İzlenenler</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentlyWatchedScroll}>
              {recentShows.map(({ show, interaction }) => (
                <GlassPanel key={interaction.id} style={styles.recentlyWatchedCard}>
                  {show.image?.medium ? (
                    <Image 
                      source={{ uri: show.image.medium }} 
                      style={styles.recentlyWatchedImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.recentlyWatchedPlaceholder}>
                      <Tv size={32} color={Colors.dark.primary} />
                    </View>
                  )}
                  <Text style={styles.recentlyWatchedTitle} numberOfLines={2}>{show.name}</Text>
                  {interaction.rating && (
                    <View style={styles.recentlyWatchedRating}>
                      <Star size={12} color={Colors.dark.warning} fill={Colors.dark.warning} />
                      <Text style={styles.recentlyWatchedRatingText}>{interaction.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </GlassPanel>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkında</Text>
          <GlassPanel style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Cinematch ile film keşfetmenin keyfini çıkarın! Tinder tarzı kaydırma ile yeni filmler keşfedin, 
              izleme listenizi oluşturun ve favori filmlerinizi takip edin.
            </Text>
          </GlassPanel>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Ayarlar</Text>
          <GlassPanel style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                  <Moon size={20} color={Colors.dark.primary} />
                </View>
                <Text style={styles.settingText}>Karanlık Tema</Text>
              </View>
              <Switch
                value={preferences.theme === 'dark'}
                onValueChange={(value) => updatePreferences({ theme: value ? 'dark' : 'light' })}
                trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                thumbColor={Colors.dark.text}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.warning}20` }]}>
                  <Vibrate size={20} color={Colors.dark.warning} />
                </View>
                <Text style={styles.settingText}>Titreşim</Text>
              </View>
              <Switch
                value={preferences.hapticsEnabled}
                onValueChange={(value) => updatePreferences({ hapticsEnabled: value })}
                trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                thumbColor={Colors.dark.text}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.accent}20` }]}>
                  <Volume2 size={20} color={Colors.dark.accent} />
                </View>
                <Text style={styles.settingText}>Otomatik Fragman</Text>
              </View>
              <Switch
                value={preferences.autoPlayTrailers}
                onValueChange={(value) => updatePreferences({ autoPlayTrailers: value })}
                trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                thumbColor={Colors.dark.text}
              />
            </View>
            <View style={styles.settingDivider} />
            <Pressable style={styles.settingItem} onPress={() => setShowSettingsModal(true)}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.textSecondary}20` }]}>
                  <Settings size={20} color={Colors.dark.textSecondary} />
                </View>
                <Text style={styles.settingText}>Tüm Ayarlar</Text>
              </View>
              <ChevronRight size={20} color={Colors.dark.textSecondary} />
            </Pressable>
          </GlassPanel>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Başarımlar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
            <GlassPanel style={styles.achievementBadge}>
              <Trophy size={32} color={Colors.dark.warning} />
              <Text style={styles.achievementBadgeTitle}>İlk Adım</Text>
              <Text style={styles.achievementBadgeDesc}>İlk dizini izledin</Text>
            </GlassPanel>
            <GlassPanel style={styles.achievementBadge}>
              <Flame size={32} color={Colors.dark.error} />
              <Text style={styles.achievementBadgeTitle}>7 Günlük Seri</Text>
              <Text style={styles.achievementBadgeDesc}>7 gün üst üste izledin</Text>
            </GlassPanel>
            <GlassPanel style={styles.achievementBadge}>
              <Star size={32} color={Colors.dark.accent} />
              <Text style={styles.achievementBadgeTitle}>Eleştirmen</Text>
              <Text style={styles.achievementBadgeDesc}>10 değerlendirme yaptın</Text>
            </GlassPanel>
            <GlassPanel style={[styles.achievementBadge, styles.achievementBadgeLocked]}>
              <Gift size={32} color={Colors.dark.textSecondary} />
              <Text style={styles.achievementBadgeTitle}>Maraton Ustası</Text>
              <Text style={styles.achievementBadgeDesc}>50 dizi izle</Text>
            </GlassPanel>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sosyal</Text>
            <Pressable onPress={() => setShowSocialModal(true)}>
              <Text style={styles.sectionLink}>Tümünü Gör</Text>
            </Pressable>
          </View>
          <GlassPanel style={styles.socialCard}>
            <View style={styles.socialStat}>
              <Users size={24} color={Colors.dark.primary} />
              <View style={styles.socialStatInfo}>
                <Text style={styles.socialStatValue}>24</Text>
                <Text style={styles.socialStatLabel}>Arkadaş</Text>
              </View>
            </View>
            <View style={styles.socialDivider} />
            <View style={styles.socialStat}>
              <MessageCircle size={24} color={Colors.dark.accent} />
              <View style={styles.socialStatInfo}>
                <Text style={styles.socialStatValue}>156</Text>
                <Text style={styles.socialStatLabel}>Yorum</Text>
              </View>
            </View>
            <View style={styles.socialDivider} />
            <View style={styles.socialStat}>
              <Share2 size={24} color={Colors.dark.success} />
              <View style={styles.socialStatInfo}>
                <Text style={styles.socialStatValue}>42</Text>
                <Text style={styles.socialStatLabel}>Paylaşım</Text>
              </View>
            </View>
          </GlassPanel>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Özellikler</Text>
          <GlassPanel style={styles.featureCard}>
            <Pressable 
              style={styles.featureItem}
              onPress={() => router.push('/watch-party')}
            >
              <Text style={styles.featureBullet}>🎥</Text>
              <Text style={styles.featureText}>Watch Party - Arkadaşlarınla birlikte izle</Text>
              <ChevronRight size={20} color={Colors.dark.primary} />
            </Pressable>
            <View style={styles.settingDivider} />
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>🎯</Text>
              <Text style={styles.featureText}>Kişiselleştirilmiş dizi önerileri</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>💫</Text>
              <Text style={styles.featureText}>Tinder tarzı kaydırma deneyimi</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>📚</Text>
              <Text style={styles.featureText}>Kişisel dizi kütüphanesi</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>🎬</Text>
              <Text style={styles.featureText}>Detaylı dizi bilgileri</Text>
            </View>
          </GlassPanel>
        </View>
      </ScrollView>

      <Modal
        visible={showStatsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowStatsModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detaylı İstatistikler</Text>
              <Pressable onPress={() => setShowStatsModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailedStatsGrid}>
                <GlassPanel style={styles.detailedStatCard}>
                  <View style={[styles.detailedStatIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                    <BarChart3 size={28} color={Colors.dark.primary} />
                  </View>
                  <Text style={styles.detailedStatValue}>{stats.totalWatched}</Text>
                  <Text style={styles.detailedStatLabel}>Toplam Dizi</Text>
                  <Text style={styles.detailedStatSubtext}>İzlenen & İzleniyor</Text>
                </GlassPanel>

                <GlassPanel style={styles.detailedStatCard}>
                  <View style={[styles.detailedStatIcon, { backgroundColor: `${Colors.dark.warning}20` }]}>
                    <Tv size={28} color={Colors.dark.warning} />
                  </View>
                  <Text style={styles.detailedStatValue}>{stats.totalEpisodesWatched}</Text>
                  <Text style={styles.detailedStatLabel}>Toplam Bölüm</Text>
                  <Text style={styles.detailedStatSubtext}>~{Math.floor(stats.totalEpisodesWatched * 0.75)} saat</Text>
                </GlassPanel>

                <GlassPanel style={styles.detailedStatCard}>
                  <View style={[styles.detailedStatIcon, { backgroundColor: `${Colors.dark.accent}20` }]}>
                    <Award size={28} color={Colors.dark.accent} />
                  </View>
                  <Text style={styles.detailedStatValue}>{stats.averageRating.toFixed(1)}</Text>
                  <Text style={styles.detailedStatLabel}>Ortalama Puan</Text>
                  <Text style={styles.detailedStatSubtext}>En yüksek: 9.5</Text>
                </GlassPanel>

                <GlassPanel style={styles.detailedStatCard}>
                  <View style={[styles.detailedStatIcon, { backgroundColor: `${Colors.dark.success}20` }]}>
                    <TrendingUp size={28} color={Colors.dark.success} />
                  </View>
                  <Text style={styles.detailedStatValue}>{stats.totalFavorites}</Text>
                  <Text style={styles.detailedStatLabel}>Favori Diziler</Text>
                  <Text style={styles.detailedStatSubtext}>Kütüphanenin %{((stats.totalFavorites / totalShows) * 100).toFixed(0)}&apos;i</Text>
                </GlassPanel>
              </View>

              <View style={styles.achievementsSection}>
                <Text style={styles.achievementsTitle}>Başarımlar</Text>
                <GlassPanel style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>🏆</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementName}>İlk Adım</Text>
                    <Text style={styles.achievementDesc}>İlk dizini izledin!</Text>
                  </View>
                  <Text style={styles.achievementCheckmark}>✓</Text>
                </GlassPanel>
                <GlassPanel style={styles.achievementCard}>
                  <Text style={styles.achievementIcon}>🎬</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementName}>Dizi Tutkunu</Text>
                    <Text style={styles.achievementDesc}>10 dizi izledin!</Text>
                  </View>
                  <Text style={styles.achievementCheckmark}>✓</Text>
                </GlassPanel>
                <GlassPanel style={[styles.achievementCard, styles.achievementLocked]}>
                  <Text style={styles.achievementIcon}>🌟</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementName}>Maraton Ustası</Text>
                    <Text style={styles.achievementDesc}>50 dizi izle</Text>
                  </View>
                  <Text style={styles.achievementProgress}>{stats.totalWatched}/50</Text>
                </GlassPanel>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSettingsModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ayarlar</Text>
              <Pressable onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Tercihler</Text>
                <GlassPanel style={styles.settingsCard}>
                  <Pressable 
                    style={styles.settingItem}
                    onPress={() => {
                      setShowSettingsModal(false);
                      setTimeout(() => {
                        router.push('/onboarding');
                      }, 300);
                    }}
                  >
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                        <Settings size={20} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.settingText}>Tür Tercihlerini Değiştir</Text>
                    </View>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                </GlassPanel>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Görünüm</Text>
                <GlassPanel style={styles.settingsCard}>
                  <Pressable style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                        <Moon size={20} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.settingText}>Tema</Text>
                    </View>
                    <Text style={styles.settingValue}>Karanlık</Text>
                  </Pressable>
                  <View style={styles.settingDivider} />
                  <Pressable style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.accent}20` }]}>
                        <Globe size={20} color={Colors.dark.accent} />
                      </View>
                      <Text style={styles.settingText}>Dil</Text>
                    </View>
                    <Text style={styles.settingValue}>Türkçe</Text>
                  </Pressable>
                </GlassPanel>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Bildirimler</Text>
                <GlassPanel style={styles.settingsCard}>
                  <Pressable style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.warning}20` }]}>
                        <Bell size={20} color={Colors.dark.warning} />
                      </View>
                      <Text style={styles.settingText}>Yeni Bölümler</Text>
                    </View>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                  <View style={styles.settingDivider} />
                  <Pressable style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.success}20` }]}>
                        <TrendingUp size={20} color={Colors.dark.success} />
                      </View>
                      <Text style={styles.settingText}>Öneriler</Text>
                    </View>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                </GlassPanel>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Hesap</Text>
                <GlassPanel style={styles.settingsCard}>
                  <Pressable style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                        <User size={20} color={Colors.dark.primary} />
                      </View>
                      <Text style={styles.settingText}>Profil Düzenle</Text>
                    </View>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                  <View style={styles.settingDivider} />
                  <Pressable style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: `${Colors.dark.accent}20` }]}>
                        <Shield size={20} color={Colors.dark.accent} />
                      </View>
                      <Text style={styles.settingText}>Gizlilik</Text>
                    </View>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </Pressable>
                </GlassPanel>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Hakkında</Text>
                <GlassPanel style={styles.aboutSettingsCard}>
                  <Text style={styles.aboutSettingsText}>Cinematch v1.0.0</Text>
                  <Text style={styles.aboutSettingsSubtext}>© 2025 Cinematch. Tüm hakları saklıdır.</Text>
                </GlassPanel>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowEditProfileModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profili Düzenle</Text>
              <Pressable onPress={() => setShowEditProfileModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Profil Fotoğrafı</Text>
                <Pressable style={styles.editAvatarContainer}>
                  <Text style={styles.editAvatarText}>🎬</Text>
                  <View style={styles.editAvatarOverlay}>
                    <Camera size={24} color={Colors.dark.text} />
                  </View>
                </Pressable>
              </View>
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Kullanıcı Adı</Text>
                <View style={styles.editInput}>
                  <Text style={styles.editInputText}>{username}</Text>
                </View>
              </View>
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Bio</Text>
                <View style={[styles.editInput, styles.editInputMultiline]}>
                  <Text style={styles.editInputText}>{bio}</Text>
                </View>
              </View>
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Sosyal Medya</Text>
                <GlassPanel style={styles.socialLinksCard}>
                  <View style={styles.socialLinkItem}>
                    <Text style={styles.socialLinkIcon}>🐦</Text>
                    <Text style={styles.socialLinkText}>Twitter bağlantısı ekle</Text>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </View>
                  <View style={styles.settingDivider} />
                  <View style={styles.socialLinkItem}>
                    <Text style={styles.socialLinkIcon}>📷</Text>
                    <Text style={styles.socialLinkText}>Instagram bağlantısı ekle</Text>
                    <ChevronRight size={20} color={Colors.dark.textSecondary} />
                  </View>
                </GlassPanel>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable style={styles.saveButton} onPress={() => setShowEditProfileModal(false)}>
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSocialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSocialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSocialModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sosyal</Text>
              <Pressable onPress={() => setShowSocialModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.socialSection}>
                <Text style={styles.socialSectionTitle}>Arkadaşlar (24)</Text>
                {[1, 2, 3, 4, 5].map((i) => (
                  <GlassPanel key={i} style={styles.friendCard}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>🎭</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>Kullanıcı {i}</Text>
                      <Text style={styles.friendActivity}>2 saat önce aktif</Text>
                    </View>
                    <Pressable style={styles.friendButton}>
                      <MessageCircle size={20} color={Colors.dark.primary} />
                    </Pressable>
                  </GlassPanel>
                ))}
              </View>
              <View style={styles.socialSection}>
                <Text style={styles.socialSectionTitle}>Arkadaş Önerileri</Text>
                {[1, 2, 3].map((i) => (
                  <GlassPanel key={i} style={styles.friendCard}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>🎪</Text>
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>Öneri {i}</Text>
                      <Text style={styles.friendActivity}>5 ortak arkadaş</Text>
                    </View>
                    <Pressable style={styles.addFriendButton}>
                      <Text style={styles.addFriendButtonText}>Ekle</Text>
                    </Pressable>
                  </GlassPanel>
                ))}
              </View>
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center' as const,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
  },
  username: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    alignItems: 'center' as const,
    gap: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  statValue: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  aboutCard: {
    padding: 16,
  },
  aboutText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  featureCard: {
    padding: 16,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  featureBullet: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  settingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 68,
  },
  settingValue: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  progressCard: {
    padding: 16,
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' as const,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  progressPercentage: {
    color: Colors.dark.primary,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  progressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.dark.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 4,
  },
  progressText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
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
  modalContent: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
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
  modalClose: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '300' as const,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 32,
  },
  detailedStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  detailedStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    alignItems: 'center' as const,
    gap: 8,
  },
  detailedStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  detailedStatValue: {
    color: Colors.dark.text,
    fontSize: 32,
    fontWeight: '700' as const,
  },
  detailedStatLabel: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailedStatSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  achievementsSection: {
    gap: 12,
  },
  achievementsTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    padding: 16,
    gap: 12,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  achievementDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  achievementCheckmark: {
    color: Colors.dark.success,
    fontSize: 20,
  },
  achievementProgress: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  aboutSettingsCard: {
    padding: 16,
    alignItems: 'center' as const,
    gap: 8,
  },
  aboutSettingsText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  aboutSettingsSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center' as const,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  progressCardHalf: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  streakIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  streakInfo: {
    flex: 1,
  },
  streakLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  streakValue: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  streakDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  streakFooter: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
  },
  streakFooterText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  recentlyWatchedScroll: {
    gap: 12,
    paddingRight: 16,
  },
  recentlyWatchedCard: {
    width: 120,
    padding: 12,
    gap: 8,
  },
  recentlyWatchedImage: {
    width: 96,
    height: 144,
    borderRadius: 12,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  recentlyWatchedPlaceholder: {
    width: 96,
    height: 144,
    borderRadius: 12,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  recentlyWatchedTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  recentlyWatchedRating: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 4,
  },
  recentlyWatchedRatingText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  activityCard: {
    padding: 16,
  },
  activityChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end' as const,
    height: 120,
  },
  activityDay: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 8,
  },
  activityBarContainer: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end' as const,
  },
  activityBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  activityDayLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  activityDayCount: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  avatarBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  userInfo: {
    alignItems: 'center' as const,
    gap: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 8,
  },
  socialActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  socialButtonText: {
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
  sectionLink: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  achievementsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  achievementBadge: {
    width: 140,
    padding: 16,
    alignItems: 'center' as const,
    gap: 8,
  },
  achievementBadgeLocked: {
    opacity: 0.5,
  },
  achievementBadgeTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  achievementBadgeDesc: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    textAlign: 'center' as const,
  },
  socialCard: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
  },
  socialStat: {
    alignItems: 'center' as const,
    gap: 8,
  },
  socialStatInfo: {
    alignItems: 'center' as const,
  },
  socialStatValue: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  socialStatLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  socialDivider: {
    width: 1,
    backgroundColor: Colors.dark.border,
  },
  editSection: {
    marginBottom: 24,
  },
  editLabel: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  editAvatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    position: 'relative' as const,
  },
  editAvatarText: {
    fontSize: 56,
  },
  editAvatarOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  editInput: {
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  editInputMultiline: {
    minHeight: 100,
  },
  editInputText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  socialLinksCard: {
    padding: 0,
    overflow: 'hidden',
  },
  socialLinkItem: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    padding: 16,
    gap: 12,
  },
  socialLinkIcon: {
    fontSize: 24,
  },
  socialLinkText: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  saveButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  saveButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  socialSection: {
    marginBottom: 24,
  },
  socialSectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  friendAvatarText: {
    fontSize: 24,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  friendActivity: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  friendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addFriendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary,
  },
  addFriendButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
