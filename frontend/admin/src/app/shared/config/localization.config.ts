//==================================================
//==== LANGUAGE CODE
//==================================================

export type AppLanguageCode = 'id' | 'en';

//==================================================
//==== LANGUAGE DIRECTION
//==================================================

export type AppLanguageDirection = 'ltr' | 'rtl';

//==================================================
//==== LANGUAGE
//==================================================

export interface IAppLanguage {
  language: string;

  code: AppLanguageCode;

  locale: string;

  icon: string;

  direction: AppLanguageDirection;

  dateFormat: string;

  dateTimeFormat: string;

  timeFormat: string;

  useMeridian: boolean;
}

//==================================================
//==== STORAGE
//==================================================

export const LANGUAGE_STORAGE_KEY = 'language';

//==================================================
//==== DEFAULT LANGUAGE
//==================================================

export const DEFAULT_LANGUAGE_CODE: AppLanguageCode = 'id';

//==================================================
//==== FALLBACK LANGUAGE
//==================================================

export const FALLBACK_LANGUAGE_CODE: AppLanguageCode = 'en';

//==================================================
//==== SUPPORTED LANGUAGES
//==================================================

export const APP_LANGUAGES: IAppLanguage[] = [
  {
    language: 'Bahasa Indonesia',

    code: 'id',

    locale: 'id-ID',

    icon: 'id',

    direction: 'ltr',

    dateFormat: 'dd MMM yyyy',

    dateTimeFormat: 'dd MMM yyyy HH:mm',

    timeFormat: 'HH:mm',

    useMeridian: false,
  },

  {
    language: 'English',

    code: 'en',

    locale: 'en-US',

    icon: 'us',

    direction: 'ltr',

    dateFormat: 'MMM d, y',

    dateTimeFormat: 'MMM d, y h:mm a',

    timeFormat: 'h:mm a',

    useMeridian: true,
  },
];

//==================================================
//==== LANGUAGE CODES
//==================================================

export const APP_LANGUAGE_CODES = APP_LANGUAGES.map(
  (language) => language.code,
);
