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

import { finalize } from 'rxjs';

import { HelpTip } from '../../shared/components/ui/help/help-tip/help-tip';
import { TextFitDirective } from '../../shared/directives/text-fit.directive';
import {
  IAnalyticsDailyPoint,
  IAnalyticsOverview,
} from '../../shared/interface/analytics.interface';
import { AnalyticsService } from '../../shared/services/analytics.service';

interface AnalyticsChartPoint extends IAnalyticsDailyPoint {
  label: string;
  pageViewHeight: number;
  visitorHeight: number;
  showLabel: boolean;
}

@Component({
  selector: 'app-public-analytics',
  imports: [CommonModule, RouterLink, HelpTip, TextFitDirective],
  templateUrl: './public-analytics.html',
  styleUrl: './public-analytics.scss',
})
export class PublicAnalytics {
  private analytics = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  readonly rangeOptions = [7, 30, 90] as const;
  readonly selectedDays = signal<7 | 30 | 90>(30);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<IAnalyticsOverview | null>(null);
  private refreshTimer?: ReturnType<typeof setInterval>;

  readonly chartPoints = computed<AnalyticsChartPoint[]>(() => {
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

    const maximum = Math.max(
      1,
      ...points.flatMap((point) => [point.page_views, point.visitors]),
    );
    const labelInterval =
      overview.range.days > 45 ? 7 : overview.range.days > 14 ? 3 : 1;

    return points.map((point, index) => ({
      ...point,
      label: new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(`${this.dateKey(point.date)}T00:00:00`)),
      pageViewHeight: this.chartHeight(point.page_views, maximum),
      visitorHeight: this.chartHeight(point.visitors, maximum),
      showLabel: index % labelInterval === 0 || index === points.length - 1,
    }));
  });

  readonly contactConversion = computed(() => {
    const totals = this.overview()?.totals;
    if (!totals?.contact_starts) return 0;
    return Math.round(
      (totals.contact_submissions / totals.contact_starts) * 100,
    );
  });

  readonly maxPageViews = computed(() =>
    Math.max(
      1,
      ...(this.overview()?.top_pages.map((item) => item.page_views) ?? []),
    ),
  );

  readonly maxSourceViews = computed(() =>
    Math.max(
      1,
      ...(this.overview()?.sources.map((item) => item.page_views) ?? []),
    ),
  );

  readonly maxLocationVisitors = computed(() =>
    Math.max(
      1,
      ...(this.overview()?.locations.map((item) => item.visitors) ?? []),
    ),
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.load();
      this.refreshTimer = setInterval(() => this.load(true), 30_000);
      this.destroyRef.onDestroy(() => clearInterval(this.refreshTimer));
    }
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
            this.error.set('Data analitik belum tersedia.');
            return;
          }
          this.overview.set(response.data);
        },
        error: () => {
          this.error.set(
            'Analitik belum dapat dimuat. Periksa koneksi API atau hak akses dasbor.',
          );
        },
      });
  }

  barWidth(value: number, maximum: number): number {
    return value > 0 ? Math.max(4, (value / maximum) * 100) : 0;
  }

  metricLabel(metric: 'LCP' | 'INP' | 'CLS'): string {
    if (metric === 'LCP') return 'Kecepatan konten utama';
    if (metric === 'INP') return 'Respons interaksi';
    return 'Stabilitas tampilan';
  }

  metricValue(metric: 'LCP' | 'INP' | 'CLS', value: number): string {
    if (metric === 'CLS') return value.toFixed(3);
    return `${Math.round(value).toLocaleString('id-ID')} ms`;
  }

  metricThreshold(metric: 'LCP' | 'INP' | 'CLS'): string {
    if (metric === 'LCP') return 'Baik ≤ 2.500 ms';
    if (metric === 'INP') return 'Baik ≤ 200 ms';
    return 'Baik ≤ 0,1';
  }

  trackDate(_index: number, point: AnalyticsChartPoint): string {
    return point.date;
  }

  private chartHeight(value: number, maximum: number): number {
    return value > 0 ? Math.max(7, (value / maximum) * 100) : 1;
  }

  private dateKey(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
