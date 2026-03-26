import { Stack } from 'expo-router';
import { Download, FileJson, FileSpreadsheet, Share2, Upload, AlertCircle } from 'lucide-react-native';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { exportLibraryAsJSON, exportLibraryAsCSV } from '@/services/export';

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const { interactions } = useLibrary();
  const { preferences, updatePreferences } = usePreferences();
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      await exportLibraryAsJSON(interactions, preferences);
      await updatePreferences({ lastBackupDate: new Date().toISOString() });
      Alert.alert(t('common.success'), t('export.success'));
    } catch (error) {
      Alert.alert(t('common.error'), t('export.error'));
      console.error('[Export] Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await exportLibraryAsCSV(interactions);
      Alert.alert(t('common.success'), t('export.success'));
    } catch (error) {
      Alert.alert(t('common.error'), t('export.error'));
      console.error('[Export] Error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    Alert.alert(
      t('export.title'),
      'JSON dosyası seçerek verilerinizi geri yükleyebilirsiniz. Mevcut verileriniz silinecektir.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.next'),
          onPress: () => {
            console.log('[Import] Import data feature - Coming soon');
            Alert.alert('Yakında', 'Bu özellik yakında eklenecek');
          },
        },
      ]
    );
  };

  const getLastBackupText = () => {
    if (!preferences.lastBackupDate) {
      return t('backup.noBackup');
    }
    const date = new Date(preferences.lastBackupDate);
    return t('backup.backupReminder').replace('{date}', date.toLocaleDateString());
  };

  const stats = {
    totalShows: interactions.length,
    totalEpisodes: interactions.reduce((sum, i) => sum + (i.watchProgress?.watchedEpisodes || 0), 0),
    totalWatchTime: interactions.reduce((sum, i) => sum + (i.watchProgress?.watchedEpisodes || 0), 0) * 45,
  };

  return (
    <>
      <Stack.Screen options={{ title: t('export.title'), headerShown: true }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.iconContainer}>
              <Share2 size={48} color={Colors.dark.primary} />
            </View>
            <Text style={styles.headerTitle}>{t('export.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('export.description')}
            </Text>
          </View>

          <View style={styles.warningBox}>
            <View style={styles.warningHeader}>
              <AlertCircle size={24} color={Colors.dark.accent} />
              <Text style={styles.warningTitle}>{t('backup.warningTitle').replace('⚠️ ', '')}</Text>
            </View>
            <Text style={styles.warningText}>
              {t('backup.exportWarning')}
            </Text>
            <Text style={styles.warningInfo}>
              {t('backup.localStorageInfo')}
            </Text>
            <View style={styles.backupStatusContainer}>
              <Text style={styles.backupStatus}>
                {getLastBackupText()}
              </Text>
            </View>
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
            <Text style={styles.sectionTitle}>{t('export.title')}</Text>
            <Text style={styles.sectionDescription}>
              {t('backup.regularBackup')}
            </Text>

            <Pressable
              style={[styles.importCard]}
              onPress={handleImportData}
            >
              <View style={[styles.exportCardIcon, styles.importCardIcon]}>
                <Upload size={32} color={Colors.dark.accent} />
              </View>
              <View style={styles.exportCardContent}>
                <Text style={styles.exportCardTitle}>Veri İçe Aktar</Text>
                <Text style={styles.exportCardDescription}>
                  JSON dosyası seçerek verilerinizi geri yükleyin
                </Text>
              </View>
              <Upload size={24} color={Colors.dark.textSecondary} />
            </Pressable>

            <View style={styles.divider} />
            <Text style={styles.subsectionTitle}>Dışa Aktarma Formatları</Text>

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
            <Text style={styles.infoTitle}>ℹ️ {t('common.ok')}</Text>
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
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.accent}20`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  importCardIcon: {
    backgroundColor: `${Colors.dark.accent}30`,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 16,
  },
  warningBox: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: `${Colors.dark.accent}15`,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  warningInfo: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },
  backupStatusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${Colors.dark.accent}30`,
  },
  backupStatus: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '600' as const,
  },
});
