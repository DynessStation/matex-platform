import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InsightAudit } from '../../../shared/components/ui/insight/insight-audit';
import { InsightLine } from '../../../shared/components/ui/insight/insight-line';
import {
  InsightColumn,
  InsightPanel,
} from '../../../shared/components/ui/insight/insight-panel';
import { InsightRank } from '../../../shared/components/ui/insight/insight-rank';
import {
  InsightCheck,
  InsightRange,
  InsightRankItem,
  InsightSegment,
} from '../../../shared/components/ui/insight/insight.model';
import {
  IArticleInsightAudit,
  IArticleInsightChart,
} from '../../../shared/interface/blog.interface';
import { BlogService } from '../../../shared/services/blog.service';
import { ArticleTagsModal } from '../article-tags-modal/article-tags-modal';

const DAYS: Record<InsightRange, number> = { '1H': 1, '7H': 7, '1B': 30 };

// The website's address for article links in this panel.
const PUBLIC_ARTICLE = 'https://matexindo.com/artikel/';

// The insight band of the article list: most read, trend with the publishing score, audit.
@Component({
  selector: 'app-blog-insight',
  imports: [
    TranslateModule,
    InsightAudit,
    InsightColumn,
    InsightLine,
    InsightPanel,
    InsightRank,
  ],
  providers: [DatePipe],
  templateUrl: './blog-insight.html',
})
export class BlogInsight {
  private readonly service = inject(BlogService);
  private readonly modal = inject(NgbModal);
  private readonly translate = inject(TranslateService);
  private readonly date = inject(DatePipe);

  readonly topRange = signal<InsightRange>('7H');
  readonly chartRange = signal<InsightRange>('7H');

  readonly top = signal<InsightRankItem[]>([]);
  readonly topLoading = signal(true);
  readonly chart = signal<IArticleInsightChart | null>(null);
  readonly audit = signal<IArticleInsightAudit | null>(null);

  readonly chartLabels = computed(() =>
    (this.chart()?.labels ?? []).map((label) =>
      label.includes(':')
        ? label.slice(11, 16)
        : `${label.slice(8, 10)}/${label.slice(5, 7)}`,
    ),
  );

  readonly series = computed(() => {
    const chart = this.chart();
    const name = (key: string) =>
      this.translate.instant(`article_insight.${key}`);
    return [
      {
        label: name('published_new'),
        color: '#16a34a',
        values: chart?.published ?? [],
      },
      { label: name('views'), color: '#ea580c', values: chart?.views ?? [] },
      { label: name('shares'), color: '#6366f1', values: chart?.shares ?? [] },
      { label: name('reach'), color: '#0ea5e9', values: chart?.reach ?? [] },
    ];
  });

  readonly scoreLabel = computed(() => {
    const score = this.audit()?.score ?? 0;
    const key = score >= 70 ? 'good' : score >= 40 ? 'fair' : 'low';
    return this.translate.instant(`article_insight.score_${key}`);
  });

  readonly segments = computed<InsightSegment[]>(() => {
    const audit = this.audit();
    const name = (key: string) =>
      this.translate.instant(`article_insight.${key}`);
    return [
      {
        label: name('published'),
        value: audit?.published ?? 0,
        tone: 'success',
      },
      { label: name('scheduled'), value: audit?.scheduled ?? 0, tone: 'info' },
      { label: name('draft'), value: audit?.draft ?? 0, tone: 'warning' },
      { label: name('archived'), value: audit?.archived ?? 0, tone: 'muted' },
    ];
  });

  readonly checks = computed<InsightCheck[]>(() => {
    const counts = this.audit()?.checks;
    if (!counts) return [];
    return (Object.keys(counts) as (keyof typeof counts)[]).map((key) => {
      const count = counts[key];
      return {
        state: count > 0 ? 'warn' : 'ok',
        text: this.translate.instant(`article_insight.check_${key}`, { count }),
        ...(count > 0 ? { link: '/blog', queryParams: { audit: key } } : {}),
      };
    });
  });

  constructor() {
    effect(() => this.loadTop(DAYS[this.topRange()]));
    effect(() => this.loadChart(DAYS[this.chartRange()]));
    this.service.insightAudit().subscribe((response) => {
      this.audit.set(response.data ?? null);
    });
  }

  private loadTop(days: number): void {
    this.topLoading.set(true);
    this.service.insightTop(days).subscribe({
      next: (response) => {
        this.top.set(
          (response.data ?? []).map((item) => ({
            title: item.title,
            sub: this.date.transform(item.published_at, 'dd MMM yyyy') ?? '',
            value: item.views,
            image: item.thumbnail ?? undefined,
            href: `${PUBLIC_ARTICLE}${item.slug}`,
          })),
        );
        this.topLoading.set(false);
      },
      error: () => this.topLoading.set(false),
    });
  }

  private loadChart(days: number): void {
    this.service.insightChart(days).subscribe((response) => {
      this.chart.set(response.data ?? null);
    });
  }

  openTags(): void {
    this.modal.open(ArticleTagsModal, { size: 'lg', centered: true });
  }
}
