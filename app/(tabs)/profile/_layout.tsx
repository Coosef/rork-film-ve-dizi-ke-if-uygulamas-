import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function ProfileLayout() {
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
          title: 'Profil',
        }}
      />
    </Stack>
  );
}
