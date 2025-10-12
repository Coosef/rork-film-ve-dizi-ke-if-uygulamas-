import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/locales';
import Colors from '@/constants/colors';

const LANGUAGE_NAMES: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
};

const LANGUAGE_FLAGS: Record<Language, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
};

export default function LanguageSelector() {
  const { language, changeLanguage, availableLanguages } = useLanguage();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {availableLanguages.map((lang) => (
        <Pressable
          key={lang}
          style={[
            styles.languageItem,
            language === lang && styles.languageItemActive,
          ]}
          onPress={() => changeLanguage(lang)}
        >
          <View style={styles.languageInfo}>
            <Text style={styles.languageFlag}>{LANGUAGE_FLAGS[lang]}</Text>
            <Text style={styles.languageName}>{LANGUAGE_NAMES[lang]}</Text>
          </View>
          {language === lang && (
            <Check size={24} color={Colors.dark.primary} />
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}15`,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center' as const,
    gap: 12,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageName: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
});
