import tr from './tr';
import en from './en';
import de from './de';
import fr from './fr';
import es from './es';
import it from './it';

export type Language = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'it';

export const translations = {
  tr,
  en,
  de,
  fr,
  es,
  it,
};

export type TranslationKeys = typeof tr;
