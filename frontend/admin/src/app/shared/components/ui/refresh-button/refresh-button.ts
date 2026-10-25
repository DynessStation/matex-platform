import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

// The refresh button with a pause (U-6): spins while the page loads, then counts down
// inside the button, disabled, until it may be pressed again. The pause is kept per
// page in this browser, so leaving and coming back does not skip it.
@Component({
  selector: 'app-refresh-button',
  imports: [TranslateModule],
  templateUrl: './refresh-button.html',
})
export class RefreshButton {
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Name of the pause, one per page ("dashboard", "seo-console"). */
  readonly key = input.required<string>();

  readonly cooldownSeconds = input.required<number>();

  readonly loading = input(false);

  readonly refresh = output<void>();

  // Seconds left in the pause; 0 when the button may be pressed.
  readonly remaining = signal(0);

  readonly countdown = computed(() => {
    const seconds = this.remaining();

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const key = this.key();

      untracked(() => this.resume(readPauseEnd(key)));
    });

    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  press(): void {
    if (this.loading() || this.remaining() > 0) {
      return;
    }

    const end = Date.now() + this.cooldownSeconds() * 1000;

    writePauseEnd(this.key(), end);

    this.resume(end);

    this.refresh.emit();
  }

  private resume(end: number): void {
    this.stopTimer();

    this.remaining.set(secondsUntil(end));

    if (!this.isBrowser || this.remaining() === 0) {
      return;
    }

    this.timer = setInterval(() => {
      this.remaining.set(secondsUntil(end));

      if (this.remaining() === 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);

      this.timer = null;
    }
  }
}

//==================================================
//==== PAUSE STORAGE
//==================================================

const STORAGE_KEY = 'matex-admin-refresh-pause';

function secondsUntil(end: number): number {
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

function readPauses(): Record<string, number> {
  try {
    const stored = JSON.parse(
      globalThis.localStorage?.getItem(STORAGE_KEY) ?? '{}',
    );

    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

function readPauseEnd(key: string): number {
  const end = Number(readPauses()[key]);

  return Number.isFinite(end) ? end : 0;
}

function writePauseEnd(key: string, end: number): void {
  try {
    const now = Date.now();

    // Ended pauses are dropped so the record stays small.
    const pauses = Object.fromEntries(
      Object.entries(readPauses()).filter(([, value]) => Number(value) > now),
    );

    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...pauses, [key]: end }),
    );
  } catch {
    // Storage blocked: the pause lasts while this page stays open.
  }
}
