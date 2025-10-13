import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { Check, AlertCircle } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/locales';
import Colors from '@/constants/colors';
import GlassPanel from '@/components/GlassPanel';

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
  const { language, changeLanguage, availableLanguages, t } = useLanguage();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  const handleLanguagePress = (lang: Language) => {
    if (lang === language) {
      return;
    }
    setSelectedLanguage(lang);
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (selectedLanguage) {
      console.log('[LanguageSelector] Changing language to:', selectedLanguage);
      try {
        await changeLanguage(selectedLanguage);
        console.log('[LanguageSelector] Language changed successfully');
      } catch (error) {
        console.error('[LanguageSelector] Failed to change language:', error);
      } finally {
        setShowConfirmModal(false);
        setSelectedLanguage(null);
      }
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setSelectedLanguage(null);
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {availableLanguages.map((lang) => (
          <Pressable
            key={lang}
            style={[
              styles.languageItem,
              language === lang && styles.languageItemActive,
            ]}
            onPress={() => handleLanguagePress(lang)}
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

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.confirmModalOverlay}>
          <Pressable style={styles.confirmModalBackdrop} onPress={handleCancel} />
          <GlassPanel style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <AlertCircle size={48} color={Colors.dark.warning} />
            </View>
            <Text style={styles.confirmTitle}>{t('profile.changeLanguage')}</Text>
            <Text style={styles.confirmMessage}>
              {t('profile.changeLanguageConfirm').replace('{language}', selectedLanguage ? LANGUAGE_NAMES[selectedLanguage] : '')}
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmButtonCancel} onPress={handleCancel}>
                <Text style={styles.confirmButtonCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.confirmButtonConfirm} onPress={handleConfirm}>
                <Text style={styles.confirmButtonConfirmText}>{t('profile.changeLanguage')}</Text>
              </Pressable>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </>
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
  confirmModalOverlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  confirmModalBackdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confirmModalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center' as const,
    gap: 16,
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.dark.warning}20`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  confirmTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  confirmMessage: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  confirmButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center' as const,
  },
  confirmButtonCancelText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center' as const,
  },
  confirmButtonConfirmText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
