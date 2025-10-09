import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';

interface GenreBadgeProps {
  genre: string;
  variant?: 'default' | 'primary' | 'accent';
}

export default function GenreBadge({ genre, variant = 'default' }: GenreBadgeProps) {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={styles.text}>{genre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  default: {
    backgroundColor: Colors.dark.surfaceLight,
    borderColor: Colors.dark.border,
  },
  primary: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderColor: Colors.dark.primary,
  },
  accent: {
    backgroundColor: `${Colors.dark.accent}20`,
    borderColor: Colors.dark.accent,
  },
  text: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
