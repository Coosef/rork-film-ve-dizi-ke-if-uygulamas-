import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Modal, StyleSheet, Text, View, Pressable } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { PreferencesProvider, usePreferences } from "@/contexts/PreferencesContext";
import { SearchHistoryProvider } from "@/contexts/SearchHistoryContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
  const authContext = useAuth();
  const [appReady, setAppReady] = React.useState(false);
  const [hasNavigated, setHasNavigated] = React.useState(false);
  const [showBackupWarning, setShowBackupWarning] = useState(false);

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
    if (!appReady || !preferencesContext || !authContext || hasNavigated || authContext.isLoading) {
      return;
    }

    const inOnboarding = segments[0] === 'onboarding';
    const inAuth = segments[0] === 'auth';
    const hasCompletedOnboarding = preferencesContext.preferences?.hasCompletedOnboarding;
    const isAuthenticated = authContext.isAuthenticated;

    console.log('[RootLayout] Navigation check:', { hasCompletedOnboarding, isAuthenticated, inOnboarding, inAuth, segments });

    if (!isAuthenticated && !inAuth) {
      console.log('[RootLayout] Redirecting to auth/login');
      setHasNavigated(true);
      router.replace('/auth/login');
    } else if (isAuthenticated && !hasCompletedOnboarding && !inOnboarding) {
      console.log('[RootLayout] Redirecting to onboarding');
      setHasNavigated(true);
      router.replace('/onboarding');
    } else if (isAuthenticated && hasCompletedOnboarding && (inOnboarding || inAuth)) {
      console.log('[RootLayout] Redirecting to home');
      setHasNavigated(true);
      router.replace('/(tabs)/(home)');
    }
  }, [preferencesContext, authContext, appReady, segments, router, hasNavigated]);

  useEffect(() => {
    if (!appReady || !preferencesContext || !authContext || authContext.isLoading) {
      return;
    }

    const isAuthenticated = authContext.isAuthenticated;
    const hasCompletedOnboarding = preferencesContext.preferences?.hasCompletedOnboarding;
    const hasSeenBackupWarning = preferencesContext.preferences?.hasSeenBackupWarning;

    if (isAuthenticated && hasCompletedOnboarding && !hasSeenBackupWarning) {
      const timer = setTimeout(() => {
        setShowBackupWarning(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [appReady, preferencesContext, authContext]);

  if (!appReady || !preferencesContext || !languageContext || !authContext) {
    return null;
  }

  const { t } = languageContext;

  const handleBackupNow = () => {
    setShowBackupWarning(false);
    preferencesContext.updatePreferences({ hasSeenBackupWarning: true });
    router.push('/export-data');
  };

  const handleBackupLater = () => {
    setShowBackupWarning(false);
    preferencesContext.updatePreferences({ hasSeenBackupWarning: true });
  };

  return (
    <>
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
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="smart-lists" options={{ headerShown: true, title: t('smartLists.title') }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="export-data" options={{ headerShown: true, title: t('export.title') }} />
      <Stack.Screen name="stats" options={{ headerShown: true, title: t('stats.title') }} />
      <Stack.Screen name="social" options={{ headerShown: true, title: t('social.title') }} />
      <Stack.Screen name="watch-party" options={{ headerShown: true, title: t('social.watchParty') }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: true, title: t('notifications.settings') }} />
      <Stack.Screen 
        name="movie/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'card',
        }} 
      />
    </Stack>

    <Modal
      visible={showBackupWarning}
      transparent
      animationType="fade"
      onRequestClose={handleBackupLater}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.modal}>
          <View style={modalStyles.iconContainer}>
            <AlertCircle size={56} color={Colors.dark.accent} />
          </View>
          
          <Text style={modalStyles.title}>{t('backup.warningTitle')}</Text>
          
          <Text style={modalStyles.message}>
            {t('backup.warningMessage')}
          </Text>

          <View style={modalStyles.buttonContainer}>
            <Pressable
              style={[modalStyles.button, modalStyles.primaryButton]}
              onPress={handleBackupNow}
            >
              <Text style={modalStyles.primaryButtonText}>
                {t('backup.warningCta')}
              </Text>
            </Pressable>

            <Pressable
              style={[modalStyles.button, modalStyles.secondaryButton]}
              onPress={handleBackupLater}
            >
              <Text style={modalStyles.secondaryButtonText}>
                {t('backup.warningUnderstood')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <AuthProvider>
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
        </AuthProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.dark.accent,
  },
  secondaryButton: {
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
  },
});
