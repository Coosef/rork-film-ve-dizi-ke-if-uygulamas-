import createContextHook from '@nkzw/create-context-hook';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  newEpisodes: boolean;
  reminders: boolean;
  recommendations: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  newEpisodes: true,
  reminders: true,
  recommendations: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[Notifications] Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('[Notifications] Error saving settings:', error);
    }
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    setHasPermission(existingStatus === 'granted');
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const isInQuietHours = useCallback((): boolean => {
    if (!settings.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quietHoursStart;
    const end = settings.quietHoursEnd;

    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }, [settings.quietHoursEnabled, settings.quietHoursStart, settings.quietHoursEnd]);

  const scheduleNewEpisodeNotification = useCallback(async (
    showTitle: string,
    episodeTitle: string,
    episodeNumber: string,
    airDate: Date
  ) => {
    if (Platform.OS === 'web' || !hasPermission || !settings.enabled || !settings.newEpisodes) {
      return;
    }

    if (isInQuietHours()) {
      console.log('[Notifications] Skipping notification due to quiet hours');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${showTitle} - Yeni Bölüm!`,
          body: `${episodeNumber}: ${episodeTitle}`,
          data: { type: 'new_episode', showTitle, episodeTitle },
        },
        trigger: airDate,
      });
    } catch (error) {
      console.error('[Notifications] Error scheduling notification:', error);
    }
  }, [hasPermission, settings, isInQuietHours]);

  const scheduleReminderNotification = useCallback(async (
    showTitle: string,
    message: string,
    triggerDate: Date
  ) => {
    if (Platform.OS === 'web' || !hasPermission || !settings.enabled || !settings.reminders) {
      return;
    }

    if (isInQuietHours()) {
      console.log('[Notifications] Skipping notification due to quiet hours');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: showTitle,
          body: message,
          data: { type: 'reminder', showTitle },
        },
        trigger: triggerDate,
      });
    } catch (error) {
      console.error('[Notifications] Error scheduling reminder:', error);
    }
  }, [hasPermission, settings, isInQuietHours]);

  const sendRecommendationNotification = useCallback(async (
    title: string,
    message: string
  ) => {
    if (Platform.OS === 'web' || !hasPermission || !settings.enabled || !settings.recommendations) {
      return;
    }

    if (isInQuietHours()) {
      console.log('[Notifications] Skipping notification due to quiet hours');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: { type: 'recommendation' },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('[Notifications] Error sending recommendation:', error);
    }
  }, [hasPermission, settings, isInQuietHours]);

  const cancelAllNotifications = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('[Notifications] Error canceling notifications:', error);
    }
  }, []);

  return useMemo(() => ({
    settings,
    isLoading,
    hasPermission,
    updateSettings,
    requestPermissions,
    scheduleNewEpisodeNotification,
    scheduleReminderNotification,
    sendRecommendationNotification,
    cancelAllNotifications,
    isInQuietHours,
  }), [
    settings,
    isLoading,
    hasPermission,
    updateSettings,
    requestPermissions,
    scheduleNewEpisodeNotification,
    scheduleReminderNotification,
    sendRecommendationNotification,
    cancelAllNotifications,
    isInQuietHours,
  ]);
});
