import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { PreferencesProvider, usePreferences } from "@/contexts/PreferencesContext";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function RootLayoutNav() {
  const { preferences, isLoading } = usePreferences();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const hasCompletedOnboarding = preferences.hasCompletedOnboarding;

    console.log('[RootLayout] Onboarding check:', { hasCompletedOnboarding, inOnboarding, segments });

    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && inOnboarding) {
      router.replace('/(tabs)/(home)');
    }
  }, [preferences.hasCompletedOnboarding, isLoading, segments, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Geri",
        headerStyle: {
          backgroundColor: Colors.dark.backgroundSecondary,
        },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: {
          fontWeight: '700' as const,
        },
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="smart-lists" options={{ headerShown: true, title: 'Akıllı Listeler' }} />
      <Stack.Screen 
        name="movie/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'card',
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <LibraryProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </LibraryProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
