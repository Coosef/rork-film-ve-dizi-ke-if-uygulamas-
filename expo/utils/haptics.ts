import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const hapticFeedback = {
  light: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('[Haptics] Light feedback error:', error);
    }
  },
  
  medium: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('[Haptics] Medium feedback error:', error);
    }
  },
  
  heavy: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('[Haptics] Heavy feedback error:', error);
    }
  },
  
  success: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('[Haptics] Success feedback error:', error);
    }
  },
  
  warning: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('[Haptics] Warning feedback error:', error);
    }
  },
  
  error: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('[Haptics] Error feedback error:', error);
    }
  },
  
  selection: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.log('[Haptics] Selection feedback error:', error);
    }
  },
};

export { hapticFeedback };
