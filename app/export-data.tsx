import { Stack } from 'expo-router';
import { Download, FileJson, FileSpreadsheet, Share2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { exportLibraryAsJSON, exportLibraryAsCSV } from '@/services/export';

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const { interactions } = useLibrary();
  const { preferences } = usePreferences();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      await exportLibraryAsJSON(interactions, preferences);
      Alert.alert('Başarılı', 'Verileriniz JSON formatında dışa aktarıldı');
    } catch (error) {
      Alert.alert('Hata', 'Dışa aktarma sırasında bir hata oluştu');
      console.error('[Export] Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await exportLibraryAsCSV(interactions);
      Alert.alert('Başarılı', 'Verileriniz CSV formatında dışa aktarıldı');
    } catch (error) {
      Alert.alert('Hata', 'Dışa aktarma sırasında bir hata oluştu');
      console.error('[Export] Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const stats = {
    totalShows: interactions.length,
    totalEpisodes: interactions.reduce((sum, i) => sum + (i.watchProgress?.watchedEpisodes || 0), 0),
    totalWatchTime: interactions.reduce((sum, i) => sum + (i.watchProgress?.watchedEpisodes || 0), 0) * 45,
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Veri Dışa Aktar', headerShown: true }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.iconContainer}>
              <Share2 size={48} color={Colors.dark.primary} />
            </View>
            <Text style={styles.headerTitle}>Verilerinizi Dışa Aktarın</Text>
            <Text style={styles.headerSubtitle}>
              Tüm izleme geçmişinizi ve tercihlerinizi yedekleyin
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalShows}</Text>
              <Text style={styles.statLabel}>Toplam Dizi</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalEpisodes}</Text>
              <Text style={styles.statLabel}>İzlenen Bölüm</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{Math.round(stats.totalWatchTime / 60)}s</Text>
              <Text style={styles.statLabel}>İzleme Süresi</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dışa Aktarma Formatı</Text>
            <Text style={styles.sectionDescription}>
              Verilerinizi farklı formatlarda dışa aktarabilirsiniz
            </Text>

            <Pressable
              style={[styles.exportCard, isExporting && styles.exportCardDisabled]}
              onPress={handleExportJSON}
              disabled={isExporting}
            >
              <View style={styles.exportCardIcon}>
                <FileJson size={32} color={Colors.dark.primary} />
              </View>
              <View style={styles.exportCardContent}>
                <Text style={styles.exportCardTitle}>JSON Formatı</Text>
                <Text style={styles.exportCardDescription}>
                  Tüm verilerinizi yapılandırılmış formatta dışa aktarın. İçe aktarma için idealdir.
                </Text>
              </View>
              <Download size={24} color={Colors.dark.textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.exportCard, isExporting && styles.exportCardDisabled]}
              onPress={handleExportCSV}
              disabled={isExporting}
            >
              <View style={styles.exportCardIcon}>
                <FileSpreadsheet size={32} color={Colors.dark.accent} />
              </View>
              <View style={styles.exportCardContent}>
                <Text style={styles.exportCardTitle}>CSV Formatı</Text>
                <Text style={styles.exportCardDescription}>
                  Excel veya Google Sheets ile açılabilir tablo formatında dışa aktarın.
                </Text>
              </View>
              <Download size={24} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ Bilgi</Text>
            <Text style={styles.infoText}>
              • Dışa aktarılan dosyalar cihazınızda saklanır{'\n'}
              • JSON dosyası ile verilerinizi geri yükleyebilirsiniz{'\n'}
              • CSV dosyası sadece izleme listesi içerir{'\n'}
              • Verileriniz şifrelenmemiş, güvenli bir yerde saklayın
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
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
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.dark.glass.background,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  exportCardDisabled: {
    opacity: 0.5,
  },
  exportCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCardContent: {
    flex: 1,
  },
  exportCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  exportCardDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  infoBox: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
});
