import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Href } from 'expo-router';
import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import Colors from '@/constants/colors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GENRES } from '@/services/tvmaze';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { updatePreferences, preferences } = usePreferences();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const isReturningUser = preferences.hasCompletedOnboarding;
  
  const initialGenres = React.useMemo(() => {
    if (preferences.favoriteGenres && preferences.favoriteGenres.length > 0) {
      return preferences.favoriteGenres.map((index: number) => GENRES[index]).filter(Boolean);
    }
    return [];
  }, [preferences.favoriteGenres]);
  
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleComplete = async () => {
    try {
      console.log('[Onboarding] Completing with genres:', selectedGenres);
      await updatePreferences({ 
        favoriteGenres: selectedGenres.map(g => GENRES.indexOf(g)),
        hasCompletedOnboarding: true,
      });
      console.log('[Onboarding] Preferences saved successfully');
      
      setTimeout(() => {
        console.log('[Onboarding] Navigating back');
        if (isReturningUser) {
          router.back();
        } else {
          router.replace('/(tabs)/(home)' as Href);
        }
      }, 300);
    } catch (error) {
      console.error('[Onboarding] Failed to save preferences:', error);
    }
  };

  const canContinue = selectedGenres.length >= 3;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.dark.primary, Colors.dark.background]}
        style={styles.gradient}
      />
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={styles.iconImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>
              {isReturningUser ? t('onboarding.genrePreferences') : t('onboarding.welcome')}
            </Text>
            <Text style={styles.subtitle}>
              {isReturningUser 
                ? t('onboarding.updatePreferences')
                : t('onboarding.selectAtLeast3')
              }
            </Text>
          </View>

          <ScrollView
            style={styles.genreList}
            contentContainerStyle={styles.genreListContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.genreGrid}>
              {GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <Pressable
                    key={genre}
                    style={[
                      styles.genreCard,
                      isSelected && styles.genreCardSelected,
                    ]}
                    onPress={() => toggleGenre(genre)}
                  >
                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Check size={20} color={Colors.dark.text} />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.genreText,
                        isSelected && styles.genreTextSelected,
                      ]}
                    >
                      {genre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {selectedGenres.length} / 3 {t('onboarding.genresSelected')}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((selectedGenres.length / 3) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
            <Pressable
              style={[
                styles.continueButton,
                !canContinue && styles.continueButtonDisabled,
              ]}
              onPress={handleComplete}
              disabled={!canContinue}
            >
              <Text
                style={[
                  styles.continueButtonText,
                  !canContinue && styles.continueButtonTextDisabled,
                ]}
              >
                {isReturningUser ? t('onboarding.save') : t('onboarding.getStarted')}
              </Text>
            </Pressable>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  genreList: {
    flex: 1,
  },
  genreListContent: {
    paddingBottom: 20,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  genreCardSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  genreTextSelected: {
    color: Colors.dark.text,
    fontWeight: '700' as const,
  },
  footer: {
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  progressContainer: {
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center' as const,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 3,
  },
  continueButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  continueButtonTextDisabled: {
    color: Colors.dark.textSecondary,
  },
});
