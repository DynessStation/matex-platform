import { isPlatformBrowser, ViewportScroller } from '@angular/common';
import { DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class NavigationScrollService {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly positions = new Map<number, [number, number]>();
  private currentNavigationId = 0;
  private currentUrl = '';
  private pendingPosition: [number, number] | null = null;
  private restoreTimers: number[] = [];

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const browserWindow = this.document.defaultView;
    if (!browserWindow) return;

    browserWindow.history.scrollRestoration = 'manual';
    this.currentUrl = this.router.url;

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.cancelRestore();
        const currentPosition: [number, number] = [browserWindow.scrollX, browserWindow.scrollY];
        if (this.currentNavigationId) {
          this.positions.set(this.currentNavigationId, currentPosition);
        }

        const restoredId = event.restoredState?.navigationId;
        if (event.navigationTrigger === 'popstate' && restoredId) {
          this.pendingPosition = this.positions.get(restoredId) ?? [0, 0];
        } else if (this.routePath(event.url) === this.routePath(this.currentUrl)) {
          // Filters and pagination only change query parameters. Keep the user's
          // reading position while the list refreshes.
          this.pendingPosition = currentPosition;
        } else {
          this.pendingPosition = [0, 0];
        }
      }

      if (event instanceof NavigationEnd) {
        this.currentNavigationId = event.id;
        this.currentUrl = event.urlAfterRedirects;
        const target = this.pendingPosition ?? [0, 0];
        this.positions.set(event.id, target);
        this.restore(target);
        this.pendingPosition = null;
      }
    });

    this.destroyRef.onDestroy(() => this.cancelRestore());
  }

  private routePath(url: string): string {
    return url.split(/[?#]/, 1)[0];
  }

  private restore(position: [number, number]): void {
    const browserWindow = this.document.defaultView;
    if (!browserWindow) return;

    // SSR hydration and API-backed lists can grow after NavigationEnd. A few
    // bounded retries restore Back navigation after that content has settled.
    const delays = position[1] > 0 ? [0, 60, 180, 420] : [0];
    let lastAppliedY: number | null = null;
    for (const delay of delays) {
      const timer = browserWindow.setTimeout(() => {
        if (lastAppliedY !== null && Math.abs(browserWindow.scrollY - lastAppliedY) > 4) {
          this.cancelRestore();
          return;
        }
        browserWindow.requestAnimationFrame(() => {
          this.viewport.scrollToPosition(position);
          lastAppliedY = browserWindow.scrollY;
        });
      }, delay);
      this.restoreTimers.push(timer);
    }
  }

  private cancelRestore(): void {
    const browserWindow = this.document.defaultView;
    if (!browserWindow) return;
    this.restoreTimers.forEach((timer) => browserWindow.clearTimeout(timer));
    this.restoreTimers = [];
  }
}
