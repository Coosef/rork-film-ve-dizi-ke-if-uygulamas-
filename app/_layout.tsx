import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { PreferencesProvider, usePreferences } from "@/contexts/PreferencesContext";
import { SearchHistoryProvider } from "@/contexts/SearchHistoryContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 0,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const preferencesContext = usePreferences();
  const languageContext = useLanguage();
  const [appReady, setAppReady] = React.useState(false);
  const [hasNavigated, setHasNavigated] = React.useState(false);

  useEffect(() => {
    if (!preferencesContext) {
      return;
    }

    const timer = setTimeout(() => {
      console.log('[RootLayout] Force ready after timeout');
      setAppReady(true);
      SplashScreen.hideAsync();
    }, 2000);

    if (!preferencesContext.isLoading) {
      console.log('[RootLayout] Preferences loaded, app ready');
      setAppReady(true);
      SplashScreen.hideAsync();
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [preferencesContext]);

  useEffect(() => {
    if (!appReady || !preferencesContext || hasNavigated) {
      return;
    }

    const inOnboarding = segments[0] === 'onboarding';
    const hasCompletedOnboarding = preferencesContext.preferences?.hasCompletedOnboarding;

    console.log('[RootLayout] Onboarding check:', { hasCompletedOnboarding, inOnboarding, segments });

    if (!hasCompletedOnboarding && !inOnboarding) {
      setHasNavigated(true);
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && inOnboarding) {
      setHasNavigated(true);
      router.replace('/(tabs)/(home)');
    }
  }, [preferencesContext, appReady, segments, router, hasNavigated]);

  if (!appReady || !preferencesContext || !languageContext) {
    return null;
  }

  const { t } = languageContext;

  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: t('common.back'),
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
      <Stack.Screen name="smart-lists" options={{ headerShown: true, title: t('smartLists.title') }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="export-data" options={{ headerShown: true, title: t('export.title') }} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <PreferencesProvider>
          <LanguageProvider>
            <LibraryProvider>
              <SearchHistoryProvider>
                <NotificationProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </NotificationProvider>
              </SearchHistoryProvider>
            </LibraryProvider>
          </LanguageProvider>
        </PreferencesProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}
