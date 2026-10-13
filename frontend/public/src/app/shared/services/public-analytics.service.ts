import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { distinctUntilChanged, filter, map } from 'rxjs';

import { environment } from '../../../environments/environment';

type PublicEventName =
  'page_view' | 'outbound_click' | 'contact_start' | 'contact_submit' | 'web_vital';

interface AnalyticsConfigResponse {
  data?: { enabled?: boolean };
}

@Injectable({ providedIn: 'root' })
export class PublicAnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;
  private enabled = false;
  private lastPagePath = '';
  private sessionId = '';

  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId) || this.privacyOptOut()) return;
    this.started = true;
    void this.loadConfig();
  }

  contactStarted(): void {
    this.track('contact_start', 'contact-form');
  }

  contactSubmitted(): void {
    this.track('contact_submit', 'contact-form');
  }

  private async loadConfig(): Promise<void> {
    try {
      const response = await fetch(`${environment.publicApiURL}/analytics/config`, {
        credentials: 'omit',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as AnalyticsConfigResponse;
      this.enabled = payload.data?.enabled === true;
      if (!this.enabled) return;

      this.sessionId = this.readSessionId();
      this.trackPage(this.router.url);
      const subscription = this.router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          map((event) => event.urlAfterRedirects),
          distinctUntilChanged(),
        )
        .subscribe((url) => this.trackPage(url));
      this.destroyRef.onDestroy(() => subscription.unsubscribe());
      this.listenForOutboundClicks();
      this.listenForWebVitals();
    } catch (error) {
      if (isDevMode()) console.debug('[Analytics] Config unavailable', error);
    }
  }

  private trackPage(url: string): void {
    const path = this.pathOf(url);
    if (path === this.lastPagePath) return;
    this.lastPagePath = path;
    this.track('page_view');
  }

  private track(eventName: PublicEventName, targetKey?: string, numericValue?: number): void {
    if (!this.enabled || !this.sessionId || this.privacyOptOut()) return;
    const location = this.document.location;
    const search = new URLSearchParams(location.search);
    const payload = {
      event_id: crypto.randomUUID(),
      session_id: this.sessionId,
      event_name: eventName,
      path: location.pathname,
      locale:
        location.pathname === '/en' || location.pathname.startsWith('/en/') ? 'en-US' : 'id-ID',
      referrer: this.document.referrer || null,
      utm_source: search.get('utm_source'),
      utm_medium: search.get('utm_medium'),
      utm_campaign: search.get('utm_campaign'),
      target_key: targetKey || null,
      numeric_value: Number.isFinite(numericValue) ? numericValue : null,
      occurred_at: new Date().toISOString(),
    };

    void fetch(`${environment.publicApiURL}/analytics/event`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error) => {
      if (isDevMode()) console.debug('[Analytics] Event unavailable', error);
    });
  }

  private listenForOutboundClicks(): void {
    const listener = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      const href = target?.getAttribute('href');
      if (!href) return;
      try {
        const url = new URL(href, this.document.location.href);
        if (
          url.origin === this.document.location.origin &&
          ['http:', 'https:'].includes(url.protocol)
        ) {
          return;
        }
        this.track(
          'outbound_click',
          url.protocol === 'http:' || url.protocol === 'https:'
            ? url.hostname
            : url.protocol.replace(':', ''),
        );
      } catch {
        return;
      }
    };
    this.document.addEventListener('click', listener, { capture: true });
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('click', listener, { capture: true }),
    );
  }

  private listenForWebVitals(): void {
    void import('web-vitals')
      .then(({ onCLS, onINP, onLCP }) => {
        const report = (metric: { name: string; value: number }) => {
          if (!['CLS', 'INP', 'LCP'].includes(metric.name)) return;
          this.track('web_vital', metric.name, metric.value);
        };
        onCLS(report);
        onINP(report);
        onLCP(report);
      })
      .catch((error) => {
        if (isDevMode()) console.debug('[Analytics] Web Vitals unavailable', error);
      });
  }

  private pathOf(url: string): string {
    try {
      return new URL(url, this.document.location.origin).pathname;
    } catch {
      return '/';
    }
  }

  private readSessionId(): string {
    const key = 'matex_analytics_session';
    try {
      const current = sessionStorage.getItem(key);
      if (current) return current;
      const created = crypto.randomUUID();
      sessionStorage.setItem(key, created);
      return created;
    } catch {
      return crypto.randomUUID();
    }
  }

  private privacyOptOut(): boolean {
    const browserNavigator = this.document.defaultView?.navigator as
      (Navigator & { globalPrivacyControl?: boolean }) | undefined;
    return browserNavigator?.doNotTrack === '1' || browserNavigator?.globalPrivacyControl === true;
  }
}
