import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { Language, translations, TranslationKeys } from '@/locales';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type { Language };

const LANGUAGE_KEY = '@ui_language';

type TranslationPath<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${TranslationPath<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = TranslationPath<TranslationKeys>;

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('tr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), 500);
      });
      
      const storagePromise = AsyncStorage.getItem(LANGUAGE_KEY);
      const stored = await Promise.race([storagePromise, timeoutPromise]) as string | null;
      
      if (stored) {
        console.log('[Language] Loaded language from storage:', stored);
        setCurrentLanguage(stored as Language);
      } else {
        console.log('[Language] No stored language, using default: tr');
      }
    } catch (error) {
      console.error('[Language] Failed to load language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const t = useCallback(
    (key: TranslationKey): string => {
      const keys = key.split('.');
      let value: any = translations[currentLanguage];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          console.warn(`Translation key not found: ${key} for language: ${currentLanguage}`);
          return key;
        }
      }

      return typeof value === 'string' ? value : key;
    },
    [currentLanguage]
  );

  const changeLanguage = useCallback(
    async (language: Language) => {
      console.log('[Language] Changing language to:', language);
      try {
        await AsyncStorage.setItem(LANGUAGE_KEY, language);
        console.log('[Language] Language saved to storage');
        setCurrentLanguage(language);
        console.log('[Language] Language state updated successfully');
      } catch (error) {
        console.error('[Language] Failed to save language:', error);
      }
    },
    []
  );

  return useMemo(
    () => ({
      language: currentLanguage,
      isLoading,
      t,
      changeLanguage,
      availableLanguages: Object.keys(translations) as Language[],
    }),
    [currentLanguage, isLoading, t, changeLanguage]
  );
});
