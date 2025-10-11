import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Clock, Star, Film, Tv, Award, Target, Flame, BarChart3, PieChart, Activity } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import Colors from '@/constants/colors';
import GlassPanel from '@/components/GlassPanel';
import { useLibrary } from '@/contexts/LibraryContext';

export default function StatsScreen() {
  const router = useRouter();
  const { getInteractionsByType, interactions } = useLibrary();
  const insets = useSafeAreaInsets();

  const allInteractions = useMemo(() => interactions, [interactions]);



  const monthlyStats = useMemo(() => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const currentMonth = new Date().getMonth();
    const monthData = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      const count = allInteractions.filter(interaction => {
        const date = new Date(interaction.createdAt);
        return date.getMonth() === monthIndex && (interaction.type === 'watched' || interaction.type === 'watching');
      }).length;
      monthData.push({ month: monthName, count });
    }

    return monthData;
  }, [allInteractions]);

  const ratingDistribution = useMemo(() => {
    const distribution: Record<string, number> = {
      '1-2': 0,
      '3-4': 0,
      '5-6': 0,
      '7-8': 0,
      '9-10': 0,
    };

    allInteractions.forEach(interaction => {
      if (interaction.rating) {
        if (interaction.rating <= 2) distribution['1-2']++;
        else if (interaction.rating <= 4) distribution['3-4']++;
        else if (interaction.rating <= 6) distribution['5-6']++;
        else if (interaction.rating <= 8) distribution['7-8']++;
        else distribution['9-10']++;
      }
    });

    return Object.entries(distribution);
  }, [allInteractions]);

  const watchedShows = getInteractionsByType('watched');
  const watchlistShows = getInteractionsByType('watchlist');
  const favoriteShows = getInteractionsByType('favorite');

  const totalEpisodes = allInteractions.reduce((sum, i) => sum + (i.watchProgress?.watchedEpisodes || 0), 0);
  const totalHours = Math.floor(totalEpisodes * 0.75);
  const averageRating = allInteractions.filter(i => i.rating).reduce((sum, i) => sum + (i.rating || 0), 0) / allInteractions.filter(i => i.rating).length || 0;

  const allWatchDates = allInteractions
    .filter(i => i.watchProgress?.lastWatchedAt)
    .map(i => i.watchProgress!.lastWatchedAt!)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  if (allWatchDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const uniqueDates = [...new Set(allWatchDates.map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }))].sort((a, b) => b - a);

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      
      if (i === 0) {
        const daysDiff = Math.floor((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        }
      } else {
        const prevDate = new Date(uniqueDates[i - 1]);
        const daysDiff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          tempStreak++;
          if (i === 1 || currentStreak > 0) {
            currentStreak++;
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          if (currentStreak > 0) {
            currentStreak = 0;
          }
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
  }

  const maxMonthlyCount = Math.max(...monthlyStats.map(m => m.count), 1);

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>İstatistikler</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <GlassPanel style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                <Film size={28} color={Colors.dark.primary} />
              </View>
              <Text style={styles.statValue}>{watchedShows.length}</Text>
              <Text style={styles.statLabel}>İzlenen Dizi</Text>
            </GlassPanel>

            <GlassPanel style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${Colors.dark.warning}20` }]}>
                <Clock size={28} color={Colors.dark.warning} />
              </View>
              <Text style={styles.statValue}>{watchlistShows.length}</Text>
              <Text style={styles.statLabel}>İzlenecek</Text>
            </GlassPanel>

            <GlassPanel style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${Colors.dark.accent}20` }]}>
                <Star size={28} color={Colors.dark.accent} />
              </View>
              <Text style={styles.statValue}>{favoriteShows.length}</Text>
              <Text style={styles.statLabel}>Favori</Text>
            </GlassPanel>

            <GlassPanel style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${Colors.dark.success}20` }]}>
                <Tv size={28} color={Colors.dark.success} />
              </View>
              <Text style={styles.statValue}>{totalEpisodes}</Text>
              <Text style={styles.statLabel}>Bölüm</Text>
            </GlassPanel>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genel Bakış</Text>
            <GlassPanel style={styles.overviewCard}>
              <View style={styles.overviewItem}>
                <View style={styles.overviewLeft}>
                  <View style={[styles.overviewIcon, { backgroundColor: `${Colors.dark.primary}20` }]}>
                    <Clock size={20} color={Colors.dark.primary} />
                  </View>
                  <Text style={styles.overviewLabel}>Toplam İzleme Süresi</Text>
                </View>
                <Text style={styles.overviewValue}>{totalHours} saat</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <View style={styles.overviewLeft}>
                  <View style={[styles.overviewIcon, { backgroundColor: `${Colors.dark.warning}20` }]}>
                    <Star size={20} color={Colors.dark.warning} />
                  </View>
                  <Text style={styles.overviewLabel}>Ortalama Puan</Text>
                </View>
                <Text style={styles.overviewValue}>{averageRating.toFixed(1)}/10</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <View style={styles.overviewLeft}>
                  <View style={[styles.overviewIcon, { backgroundColor: `${Colors.dark.accent}20` }]}>
                    <Flame size={20} color={Colors.dark.accent} />
                  </View>
                  <Text style={styles.overviewLabel}>Güncel Seri</Text>
                </View>
                <Text style={styles.overviewValue}>{currentStreak} gün</Text>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewItem}>
                <View style={styles.overviewLeft}>
                  <View style={[styles.overviewIcon, { backgroundColor: `${Colors.dark.success}20` }]}>
                    <Award size={20} color={Colors.dark.success} />
                  </View>
                  <Text style={styles.overviewLabel}>En Uzun Seri</Text>
                </View>
                <Text style={styles.overviewValue}>{longestStreak} gün</Text>
              </View>
            </GlassPanel>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <BarChart3 size={20} color={Colors.dark.primary} />
              <Text style={styles.sectionTitle}>Aylık Aktivite</Text>
            </View>
            <GlassPanel style={styles.chartCard}>
              <View style={styles.monthlyChart}>
                {monthlyStats.map((month, index) => {
                  const height = (month.count / maxMonthlyCount) * 100;
                  return (
                    <View key={index} style={styles.monthColumn}>
                      <View style={styles.monthBarContainer}>
                        <View 
                          style={[
                            styles.monthBar, 
                            { 
                              height: `${height}%`,
                              backgroundColor: month.count > 0 ? Colors.dark.primary : Colors.dark.border
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.monthLabel}>{month.month}</Text>
                      <Text style={styles.monthCount}>{month.count}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassPanel>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <PieChart size={20} color={Colors.dark.warning} />
              <Text style={styles.sectionTitle}>Puan Dağılımı</Text>
            </View>
            <GlassPanel style={styles.chartCard}>
              <View style={styles.ratingChart}>
                {ratingDistribution.map(([range, count], index) => {
                  const total = ratingDistribution.reduce((sum, [, c]) => sum + c, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const colors = [Colors.dark.error, Colors.dark.warning, Colors.dark.textSecondary, Colors.dark.success, Colors.dark.primary];
                  return (
                    <View key={range} style={styles.ratingRow}>
                      <Text style={styles.ratingLabel}>{range}</Text>
                      <View style={styles.ratingBarContainer}>
                        <View 
                          style={[
                            styles.ratingBar, 
                            { 
                              width: `${percentage}%`,
                              backgroundColor: colors[index]
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.ratingCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </GlassPanel>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity size={20} color={Colors.dark.accent} />
              <Text style={styles.sectionTitle}>İzleme Alışkanlıkları</Text>
            </View>
            <GlassPanel style={styles.habitsCard}>
              <View style={styles.habitItem}>
                <Text style={styles.habitIcon}>📅</Text>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitLabel}>En Aktif Gün</Text>
                  <Text style={styles.habitValue}>Cumartesi</Text>
                </View>
              </View>
              <View style={styles.habitDivider} />
              <View style={styles.habitItem}>
                <Text style={styles.habitIcon}>⏰</Text>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitLabel}>En Aktif Saat</Text>
                  <Text style={styles.habitValue}>20:00 - 23:00</Text>
                </View>
              </View>
              <View style={styles.habitDivider} />
              <View style={styles.habitItem}>
                <Text style={styles.habitIcon}>📺</Text>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitLabel}>Ortalama Bölüm/Gün</Text>
                  <Text style={styles.habitValue}>{(totalEpisodes / Math.max(allWatchDates.length, 1)).toFixed(1)}</Text>
                </View>
              </View>
            </GlassPanel>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color={Colors.dark.success} />
              <Text style={styles.sectionTitle}>Hedefler</Text>
            </View>
            <GlassPanel style={styles.goalsCard}>
              <View style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>Aylık İzleme Hedefi</Text>
                  <Text style={styles.goalProgress}>{monthlyStats[monthlyStats.length - 1]?.count || 0}/20</Text>
                </View>
                <View style={styles.goalBarContainer}>
                  <View 
                    style={[
                      styles.goalBar, 
                      { width: `${Math.min(((monthlyStats[monthlyStats.length - 1]?.count || 0) / 20) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              </View>
              <View style={styles.goalDivider} />
              <View style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>Yıllık İzleme Hedefi</Text>
                  <Text style={styles.goalProgress}>{watchedShows.length}/100</Text>
                </View>
                <View style={styles.goalBarContainer}>
                  <View 
                    style={[
                      styles.goalBar, 
                      { width: `${Math.min((watchedShows.length / 100) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              </View>
            </GlassPanel>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  statLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  overviewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  overviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  overviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewLabel: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  overviewValue: {
    color: Colors.dark.primary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 68,
  },
  chartCard: {
    padding: 16,
  },
  monthlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  monthBarContainer: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  monthBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  monthLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  monthCount: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  ratingChart: {
    gap: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingLabel: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
    width: 40,
  },
  ratingBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: Colors.dark.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    borderRadius: 12,
  },
  ratingCount: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700' as const,
    width: 30,
    textAlign: 'right' as const,
  },
  habitsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  habitIcon: {
    fontSize: 32,
  },
  habitInfo: {
    flex: 1,
  },
  habitLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  habitValue: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  habitDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 60,
  },
  goalsCard: {
    padding: 16,
    gap: 16,
  },
  goalItem: {
    gap: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  goalProgress: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  goalBarContainer: {
    height: 8,
    backgroundColor: Colors.dark.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBar: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 4,
  },
  goalDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
  },
});
