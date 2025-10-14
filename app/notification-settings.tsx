import { Stack } from 'expo-router';
import { Bell, Clock, Sparkles, Volume2, Moon, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Switch,
  Modal,
} from 'react-native';
import Colors from '@/constants/colors';
import GlassPanel from '@/components/GlassPanel';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, hasPermission, updateSettings, requestPermissions } = useNotifications();
  const { t } = useLanguage();
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');

  const handleToggleNotifications = async (value: boolean) => {
    if (value && !hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        console.log('[NotificationSettings] Permission denied');
        return;
      }
    }
    updateSettings({ enabled: value });
  };

  const handleToggleSetting = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value });
  };

  const handleOpenTimePicker = (type: 'start' | 'end') => {
    setTimePickerType(type);
    setShowTimePickerModal(true);
  };

  const handleSelectTime = (time: string) => {
    if (timePickerType === 'start') {
      updateSettings({ quietHoursStart: time });
    } else {
      updateSettings({ quietHoursEnd: time });
    }
    setShowTimePickerModal(false);
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  return (
    <>
      <Stack.Screen options={{ title: t('notifications.settings'), headerShown: true }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <Text style={styles.headerTitle}>{t('notifications.settings')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('notificationSettings.subtitle')}
            </Text>
          </View>

          <View style={styles.section}>
            <GlassPanel style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingIcon}>
                  <Bell size={24} color={Colors.dark.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('notificationSettings.enableNotifications')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('notificationSettings.enableNotificationsDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.enabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                  thumbColor={Colors.dark.text}
                />
              </View>
            </GlassPanel>

            {!hasPermission && (
              <GlassPanel style={styles.warningCard}>
                <Text style={styles.warningText}>
                  ⚠️ {t('notificationSettings.permissionWarning')}
                </Text>
              </GlassPanel>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notificationSettings.notificationTypes')}</Text>
            
            <GlassPanel style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingIcon}>
                  <Sparkles size={24} color={Colors.dark.accent} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('notifications.newEpisodes')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('notificationSettings.newEpisodesDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.newEpisodes}
                  onValueChange={(value) => handleToggleSetting('newEpisodes', value)}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                  thumbColor={Colors.dark.text}
                  disabled={!settings.enabled}
                />
              </View>
            </GlassPanel>

            <GlassPanel style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingIcon}>
                  <Clock size={24} color={Colors.dark.warning} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('notificationSettings.reminders')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('notificationSettings.remindersDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.reminders}
                  onValueChange={(value) => handleToggleSetting('reminders', value)}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                  thumbColor={Colors.dark.text}
                  disabled={!settings.enabled}
                />
              </View>
            </GlassPanel>

            <GlassPanel style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingIcon}>
                  <Volume2 size={24} color={Colors.dark.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('notifications.recommendations')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('notificationSettings.recommendationsDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.recommendations}
                  onValueChange={(value) => handleToggleSetting('recommendations', value)}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                  thumbColor={Colors.dark.text}
                  disabled={!settings.enabled}
                />
              </View>
            </GlassPanel>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notificationSettings.quietHours')}</Text>
            
            <GlassPanel style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <View style={styles.settingIcon}>
                  <Moon size={24} color={Colors.dark.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{t('notificationSettings.enableQuietHours')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('notificationSettings.enableQuietHoursDesc')}
                  </Text>
                </View>
                <Switch
                  value={settings.quietHoursEnabled}
                  onValueChange={(value) => handleToggleSetting('quietHoursEnabled', value)}
                  trackColor={{ false: Colors.dark.border, true: Colors.dark.primary }}
                  thumbColor={Colors.dark.text}
                  disabled={!settings.enabled}
                />
              </View>
            </GlassPanel>

            {settings.quietHoursEnabled && (
              <View style={styles.timePickerContainer}>
                <Pressable 
                  style={styles.timePickerButton}
                  onPress={() => handleOpenTimePicker('start')}
                >
                  <Text style={styles.timePickerLabel}>{t('discover.start')}</Text>
                  <Text style={styles.timePickerValue}>{settings.quietHoursStart}</Text>
                </Pressable>
                <Pressable 
                  style={styles.timePickerButton}
                  onPress={() => handleOpenTimePicker('end')}
                >
                  <Text style={styles.timePickerLabel}>{t('discover.end')}</Text>
                  <Text style={styles.timePickerValue}>{settings.quietHoursEnd}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showTimePickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowTimePickerModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {timePickerType === 'start' ? t('notificationSettings.startTime') : t('notificationSettings.endTime')}
                </Text>
                <Pressable onPress={() => setShowTimePickerModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
                {timeOptions.map(time => (
                  <Pressable
                    key={time}
                    style={[
                      styles.timeOption,
                      (timePickerType === 'start' ? settings.quietHoursStart : settings.quietHoursEnd) === time && styles.timeOptionActive,
                    ]}
                    onPress={() => handleSelectTime(time)}
                  >
                    <Text style={[
                      styles.timeOptionText,
                      (timePickerType === 'start' ? settings.quietHoursStart : settings.quietHoursEnd) === time && styles.timeOptionTextActive,
                    ]}>
                      {time}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  settingCard: {
    padding: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  warningCard: {
    padding: 16,
    backgroundColor: `${Colors.dark.warning}20`,
    borderColor: Colors.dark.warning,
  },
  warningText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  timePickerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerButton: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    gap: 8,
  },
  timePickerLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '600' as const,
  },
  timePickerValue: {
    fontSize: 24,
    color: Colors.dark.text,
    fontWeight: '700' as const,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  timeList: {
    padding: 16,
  },
  timeOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  timeOptionActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  timeOptionText: {
    fontSize: 18,
    color: Colors.dark.text,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  timeOptionTextActive: {
    fontWeight: '700' as const,
  },
});
