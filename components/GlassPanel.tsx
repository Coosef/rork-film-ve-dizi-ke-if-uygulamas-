import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import Colors from '@/constants/colors';

interface GlassPanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export default function GlassPanel({ children, style, intensity = 20 }: GlassPanelProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webGlass, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
    overflow: 'hidden',
  },
  webGlass: {
    backgroundColor: Colors.dark.glass.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.glass.border,
    overflow: 'hidden',
  },
});
