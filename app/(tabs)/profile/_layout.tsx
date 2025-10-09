import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { Settings } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function ProfileLayout() {
  const router = useRouter();

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
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/onboarding')}
              style={{ padding: 8 }}
            >
              <Settings size={24} color={Colors.dark.primary} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
