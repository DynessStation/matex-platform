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

import {
  IAnalyticsDailyPoint,
  IAnalyticsOverview,
} from '../../shared/interface/analytics.interface';
import { AnalyticsService } from '../../shared/services/analytics.service';

interface DashboardChartPoint extends IAnalyticsDailyPoint {
  label: string;
  pageViewHeight: number;
  visitorHeight: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private analytics = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  readonly rangeOptions = [7, 30, 90] as const;
  readonly selectedDays = signal<7 | 30 | 90>(30);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<IAnalyticsOverview | null>(null);

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
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  selectRange(days: 7 | 30 | 90): void {
    if (days === this.selectedDays() && this.overview()) return;
    this.selectedDays.set(days);
    this.load();
  }

  load(): void {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (this.selectedDays() - 1));

    this.loading.set(true);
    this.error.set('');
    this.analytics
      .getOverview(this.dateKey(from), this.dateKey(to))
      .pipe(
        finalize(() => this.loading.set(false)),
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
