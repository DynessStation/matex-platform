import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';

export type AdminThemeMode = 'light-only' | 'dark-only';

const ADMIN_THEME_STORAGE_KEY = 'matex-admin-theme-mode';
const ADMIN_THEME_CLASSES: AdminThemeMode[] = ['light-only', 'dark-only'];

@Injectable({
  providedIn: 'root',
})
export class AdminThemeModeService {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private initialized = false;

  readonly mode = signal<AdminThemeMode>('light-only');
  readonly isDark = computed(() => this.mode() === 'dark-only');

  constructor() {
    const storedMode = this.readStoredMode();

    this.apply(storedMode ?? 'light-only', false);

    if (storedMode) {
      this.initialized = true;
    }
  }

  initialize(configuredMode?: string | null): void {
    if (this.initialized) {
      return;
    }

    const storedMode = this.readStoredMode();
    const initialMode =
      storedMode ?? this.normalizeMode(configuredMode) ?? 'light-only';

    this.apply(initialMode, false);
    this.initialized = true;
  }

  toggle(): void {
    this.setMode(this.isDark() ? 'light-only' : 'dark-only');
  }

  setMode(mode: AdminThemeMode): void {
    this.apply(mode, true);
    this.initialized = true;
  }

  private apply(mode: AdminThemeMode, persist: boolean): void {
    const body = this.document.body;

    body.classList.remove(...ADMIN_THEME_CLASSES);
    body.classList.add(mode);
    this.document.documentElement.style.colorScheme =
      mode === 'dark-only' ? 'dark' : 'light';
    this.mode.set(mode);

    if (persist && isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(ADMIN_THEME_STORAGE_KEY, mode);
      } catch {
        // Theme switching must keep working when browser storage is blocked.
      }
    }
  }

  private readStoredMode(): AdminThemeMode | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return this.normalizeMode(localStorage.getItem(ADMIN_THEME_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  private normalizeMode(value?: string | null): AdminThemeMode | null {
    return value === 'dark-only' || value === 'light-only' ? value : null;
  }
}
