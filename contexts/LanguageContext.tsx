import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Language, translations, TranslationKeys } from '@/locales';
import { usePreferences } from '@/contexts/PreferencesContext';

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
  const { preferences, updatePreferences } = usePreferences();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(preferences.uiLanguage as Language || 'tr');

  useEffect(() => {
    if (preferences.uiLanguage) {
      console.log('[Language] Setting language from preferences:', preferences.uiLanguage);
      setCurrentLanguage(preferences.uiLanguage as Language);
    }
  }, [preferences.uiLanguage]);

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
      setCurrentLanguage(language);
      await updatePreferences({ uiLanguage: language });
      console.log('[Language] Language changed successfully');
    },
    [updatePreferences]
  );

  return useMemo(
    () => ({
      language: currentLanguage,
      t,
      changeLanguage,
      availableLanguages: Object.keys(translations) as Language[],
    }),
    [currentLanguage, t, changeLanguage]
  );
});
