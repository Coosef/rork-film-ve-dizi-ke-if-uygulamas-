import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Language, translations, TranslationKeys } from '@/locales';
import { trpc } from '@/lib/trpc';

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
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const updateMutation = trpc.preferences.update.useMutation({
    onSuccess: () => {
      utils.preferences.get.invalidate();
    },
  });

  const [currentLanguage, setCurrentLanguage] = useState<Language>('tr');

  useEffect(() => {
    if (preferencesQuery.data?.uiLanguage) {
      console.log('[Language] Setting language from preferences:', preferencesQuery.data.uiLanguage);
      setCurrentLanguage(preferencesQuery.data.uiLanguage as Language);
    }
  }, [preferencesQuery.data?.uiLanguage]);

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
      try {
        console.log('[Language] Changing language to:', language);
        setCurrentLanguage(language);
        await updateMutation.mutateAsync({ uiLanguage: language });
        console.log('[Language] Language changed successfully');
      } catch (error) {
        console.error('[Language] Error changing language:', error);
      }
    },
    [updateMutation]
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
