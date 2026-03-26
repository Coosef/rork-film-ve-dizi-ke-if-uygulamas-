import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfileLayout() {
  const { t } = useLanguage();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: t('tabs.profile'),
        }}
      />
    </Stack>
  );
}
