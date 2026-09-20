import { DOCUMENT, isPlatformBrowser } from '@angular/common';

import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import {
  APP_LANGUAGES,
  APP_LANGUAGE_CODES,
  AppLanguageCode,
  DEFAULT_LANGUAGE_CODE,
  FALLBACK_LANGUAGE_CODE,
  IAppLanguage,
  LANGUAGE_STORAGE_KEY,
} from '../config/localization.config';

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class LocalizationService {
  //==================================================
  //==== INJECT
  //==================================================

  private translate = inject(TranslateService);

  private platformId = inject(PLATFORM_ID);

  private document = inject(DOCUMENT);

  //==================================================
  //==== CURRENT LANGUAGE
  //==================================================

  readonly currentLanguage = signal<IAppLanguage>(
    this.getLanguage(DEFAULT_LANGUAGE_CODE),
  );

  //==================================================
  //==== LOCALIZATION FORMAT
  //==================================================

  readonly locale = computed(() => this.currentLanguage().locale);

  readonly dateFormat = computed(() => this.currentLanguage().dateFormat);

  readonly dateTimeFormat = computed(
    () => this.currentLanguage().dateTimeFormat,
  );

  readonly timeFormat = computed(() => this.currentLanguage().timeFormat);

  readonly useMeridian = computed(() => this.currentLanguage().useMeridian);

  //==================================================
  //==== WEEKDAY
  //==================================================

  weekdayLong(dayOfWeek: number): string {
    const monday = new Date(Date.UTC(2024, 0, 1));

    monday.setUTCDate(monday.getUTCDate() + Math.max(0, dayOfWeek - 1));

    return new Intl.DateTimeFormat(this.locale(), {
      weekday: 'long',

      timeZone: 'UTC',
    }).format(monday);
  }

  //==================================================
  //==== NUMBER
  //==================================================

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  //==================================================
  //==== CURRENCY
  //==================================================

  formatCurrency(
    value: number,

    currency: string,
  ): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',

      currency,

      currencyDisplay: 'narrowSymbol',
    }).format(value);
  }

  //==================================================
  //==== INITIALIZE
  //==================================================

  async initialize(): Promise<void> {
    //==================================================
    //==== REGISTER LANGUAGES
    //==================================================

    this.translate.addLangs(APP_LANGUAGE_CODES);

    //==================================================
    //==== FALLBACK
    //==================================================

    this.translate.setDefaultLang(FALLBACK_LANGUAGE_CODE);

    //==================================================
    //==== RESOLVE LANGUAGE
    //==================================================

    const code = this.resolveInitialLanguage();

    await this.applyLanguage(code, false);
  }

  //==================================================
  //==== SET LANGUAGE
  //==================================================

  async setLanguage(code: AppLanguageCode): Promise<void> {
    await this.applyLanguage(code, true);
  }

  //==================================================
  //==== APPLY LANGUAGE
  //==================================================

  private async applyLanguage(
    code: AppLanguageCode,
    persist: boolean,
  ): Promise<void> {
    const language = this.getLanguage(code);

    try {
      await firstValueFrom(this.translate.use(language.code));

      //==================================================
      //==== STATE
      //==================================================

      this.currentLanguage.set(language);

      //==================================================
      //==== DOCUMENT
      //==================================================

      this.applyDocumentLanguage(language);

      //==================================================
      //==== STORAGE
      //==================================================

      if (persist && isPlatformBrowser(this.platformId)) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language.code);
      }
    } catch {
      //==================================================
      //==== FALLBACK
      //==================================================

      if (code !== DEFAULT_LANGUAGE_CODE) {
        await this.applyLanguage(DEFAULT_LANGUAGE_CODE, persist);
      }
    }
  }

  //==================================================
  //==== INITIAL LANGUAGE
  //==================================================

  private resolveInitialLanguage(): AppLanguageCode {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LANGUAGE_CODE;
    }

    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (!stored) {
      return DEFAULT_LANGUAGE_CODE;
    }

    //==================================================
    //==== NEW FORMAT
    //==================================================

    if (this.isSupportedLanguage(stored)) {
      return stored;
    }

    //==================================================
    //==== LEGACY TEMPLATE FORMAT
    //==================================================

    try {
      const legacy = JSON.parse(stored) as
        | {
            code?: string;
          }
        | string;

      if (typeof legacy === 'string' && this.isSupportedLanguage(legacy)) {
        return legacy;
      }

      if (
        typeof legacy === 'object' &&
        legacy?.code &&
        this.isSupportedLanguage(legacy.code)
      ) {
        //==================================================
        //==== MIGRATE STORAGE
        //==================================================

        localStorage.setItem(LANGUAGE_STORAGE_KEY, legacy.code);

        return legacy.code;
      }
    } catch {
      // Ignore invalid legacy value.
    }

    //==================================================
    //==== INVALID STORAGE
    //==================================================

    localStorage.removeItem(LANGUAGE_STORAGE_KEY);

    return DEFAULT_LANGUAGE_CODE;
  }

  //==================================================
  //==== GET LANGUAGE
  //==================================================

  getLanguage(code: AppLanguageCode): IAppLanguage {
    return (
      APP_LANGUAGES.find((language) => language.code === code) ??
      APP_LANGUAGES[0]
    );
  }

  //==================================================
  //==== SUPPORTED LANGUAGE
  //==================================================

  private isSupportedLanguage(value: string): value is AppLanguageCode {
    return APP_LANGUAGE_CODES.includes(value as AppLanguageCode);
  }

  //==================================================
  //==== DOCUMENT LANGUAGE
  //==================================================

  private applyDocumentLanguage(language: IAppLanguage): void {
    const html = this.document.documentElement;

    html.setAttribute('lang', language.locale);

    html.setAttribute('dir', language.direction);
  }
}
