import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { finalize } from 'rxjs';

import { HelpTip } from '../../shared/components/ui/help/help-tip/help-tip';
import { TextFitDirective } from '../../shared/directives/text-fit.directive';
import {
  IPageSpeedResult,
  ISeoConsoleOverview,
} from '../../shared/interface/seo-console.interface';
import { SeoConsoleService } from '../../shared/services/seo-console.service';

@Component({
  selector: 'app-seo-console',
  imports: [CommonModule, HelpTip, TextFitDirective],
  templateUrl: './seo-console.html',
  styleUrl: './seo-console.scss',
})
export class SeoConsole {
  private service = inject(SeoConsoleService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  readonly rangeOptions = [7, 28, 90] as const;
  readonly selectedDays = signal<7 | 28 | 90>(28);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly overview = signal<ISeoConsoleOverview | null>(null);
  readonly pageSpeedLoading = signal<'mobile' | 'desktop' | null>(null);
  readonly pageSpeedError = signal('');
  readonly pageSpeed = signal<IPageSpeedResult | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.load();
  }

  selectRange(days: 7 | 28 | 90): void {
    if (days === this.selectedDays() && this.overview()) return;
    this.selectedDays.set(days);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .getOverview(this.selectedDays())
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.error.set('Status Search Console belum tersedia.');
            return;
          }
          this.overview.set(response.data);
        },
        error: (error) => {
          this.error.set(
            error?.error?.message ||
              'Search Console belum dapat dimuat. Periksa konfigurasi dan akses properti.',
          );
        },
      });
  }

  runPageSpeed(strategy: 'mobile' | 'desktop'): void {
    this.pageSpeedLoading.set(strategy);
    this.pageSpeedError.set('');
    this.service
      .runPageSpeed(strategy)
      .pipe(
        finalize(() => this.pageSpeedLoading.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!response.data?.configured) {
            this.pageSpeedError.set(
              'PageSpeed API belum dikonfigurasi di server.',
            );
            return;
          }
          this.pageSpeed.set(response.data);
        },
        error: (error) => {
          this.pageSpeedError.set(
            error?.error?.message ||
              'Audit PageSpeed belum dapat diselesaikan.',
          );
        },
      });
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'score-good';
    if (score >= 50) return 'score-needs-work';
    return 'score-poor';
  }
}
