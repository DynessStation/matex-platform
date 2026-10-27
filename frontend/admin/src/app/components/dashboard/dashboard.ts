import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Store } from '@ngxs/store';
import { combineLatest, finalize } from 'rxjs';

import { HelpTip } from '../../shared/components/ui/help/help-tip/help-tip';
import { RefreshButton } from '../../shared/components/ui/refresh-button/refresh-button';
import { TextFitDirective } from '../../shared/directives/text-fit.directive';
import {
  IAnalyticsDailyPoint,
  IAnalyticsOverview,
} from '../../shared/interface/analytics.interface';
import { AnalyticsService } from '../../shared/services/analytics.service';
import { AuthState } from '../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../shared/utils/permission.util';

interface DashboardChartPoint extends IAnalyticsDailyPoint {
  label: string;
  pageViewHeight: number;
  visitorHeight: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, HelpTip, RefreshButton, TextFitDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private analytics = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private store = inject(Store);

  /**
   * Every account lands here after login, but the figures need dashboard.view. Without it the
   * page shows a note instead of asking the API (which would answer 403).
   */
  readonly canView = signal(false);

  readonly rangeOptions = [7, 30, 90] as const;
  readonly selectedDays = signal<7 | 30 | 90>(30);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<IAnalyticsOverview | null>(null);
  private refreshTimer?: ReturnType<typeof setInterval>;

  readonly chartPoints = computed<DashboardChartPoint[]>(() => {
    const overview = this.overview();
    if (!overview) return [];
    const values = new Map(
      overview.daily.map((point) => [this.dateKey(point.date), point]),
    );
    const points: IAnalyticsDailyPoint[] = [];
    const cursor = new Date(`${overview.range.from}T00:00:00`);
    const end = new Date(`${overview.range.to}T00:00:00`);

    while (cursor <= end) {
      const key = this.dateKey(cursor);
      points.push(values.get(key) ?? { date: key, page_views: 0, visitors: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const maximum = Math.max(1, ...points.map((point) => point.page_views));
    return points.map((point) => ({
      ...point,
      label: new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(`${this.dateKey(point.date)}T00:00:00`)),
      pageViewHeight: Math.max(
        point.page_views ? 8 : 2,
        (point.page_views / maximum) * 100,
      ),
      visitorHeight: Math.max(
        point.visitors ? 8 : 2,
        (point.visitors / maximum) * 100,
      ),
    }));
  });

  readonly contactConversion = computed(() => {
    const totals = this.overview()?.totals;
    if (!totals?.contact_starts) return 0;
    return Math.round(
      (totals.contact_submissions / totals.contact_starts) * 100,
    );
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    combineLatest([
      this.store.select(AuthState.permissions),
      this.store.select(AuthState.isAllAccess),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([permissions, isAllAccess]) => {
        const allowed = hasPermissionAccess(
          'dashboard.view',
          permissions ?? [],
          isAllAccess === true,
        );
        this.canView.set(allowed);
        if (allowed && !this.refreshTimer) {
          this.load();
          this.refreshTimer = setInterval(() => this.load(true), 30_000);
        } else if (!allowed) {
          clearInterval(this.refreshTimer);
          this.refreshTimer = undefined;
          this.loading.set(false);
        }
      });
    this.destroyRef.onDestroy(() => clearInterval(this.refreshTimer));
  }

  selectRange(days: 7 | 30 | 90): void {
    if (days === this.selectedDays() && this.overview()) return;
    this.selectedDays.set(days);
    this.load();
  }

  load(silent = false): void {
    if (silent && this.loading()) return;
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (this.selectedDays() - 1));

    if (!silent) this.loading.set(true);
    this.error.set('');
    this.analytics
      .getOverview(this.dateKey(from), this.dateKey(to))
      .pipe(
        finalize(() => {
          if (!silent) this.loading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.error.set('Ringkasan dashboard belum tersedia.');
            return;
          }
          this.overview.set(response.data);
        },
        error: () => {
          this.error.set(
            'Data dashboard belum dapat dimuat. Periksa koneksi API atau hak akses dashboard.',
          );
        },
      });
  }

  trackDate(_index: number, point: DashboardChartPoint): string {
    return point.date;
  }

  private dateKey(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
