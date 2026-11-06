import { Component, computed, effect, inject, signal } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InsightAudit } from '../../../shared/components/ui/insight/insight-audit';
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
import { ICategoryInsightAudit } from '../../../shared/interface/category.interface';
import { CategoryService } from '../../../shared/services/category.service';

const DAYS: Record<InsightRange, number> = { '1H': 1, '7H': 7, '1B': 30 };
const PUBLIC_CATEGORY = 'https://matexindo.com/kategori/';

// The insight band of the category page: most viewed, products per category, and the audit. The
// tree has no filter, so "Perbaiki" opens the first category with the problem.
@Component({
  selector: 'app-category-insight',
  imports: [
    TranslateModule,
    InsightAudit,
    InsightColumn,
    InsightPanel,
    InsightRank,
  ],
  templateUrl: './category-insight.html',
})
export class CategoryInsight {
  private readonly service = inject(CategoryService);
  private readonly translate = inject(TranslateService);

  readonly topRange = signal<InsightRange>('7H');
  readonly top = signal<InsightRankItem[]>([]);
  readonly audit = signal<ICategoryInsightAudit | null>(null);

  private name(key: string, params?: Record<string, number>): string {
    return this.translate.instant(`category_insight.${key}`, params);
  }

  readonly products = computed<InsightRankItem[]>(() =>
    (this.audit()?.products ?? []).map((item) => ({
      title: item.name,
      sub: this.name('published_of', {
        published: item.published_products,
        total: item.products,
      }),
      value: item.products,
      valueLabel: this.name('products'),
      icon: 'ri-folder-3-line',
    })),
  );

  readonly segments = computed<InsightSegment[]>(() => {
    const audit = this.audit();
    return [
      {
        label: this.name('published'),
        value: audit?.published ?? 0,
        tone: 'success',
      },
      { label: this.name('draft'), value: audit?.draft ?? 0, tone: 'warning' },
      {
        label: this.name('archived'),
        value: audit?.archived ?? 0,
        tone: 'muted',
      },
    ];
  });

  readonly checks = computed<InsightCheck[]>(() => {
    const checks = this.audit()?.checks;
    if (!checks) return [];
    return (Object.keys(checks) as (keyof typeof checks)[]).map((key) => {
      const { count, first_id: first } = checks[key];
      return {
        state: count > 0 ? 'warn' : 'ok',
        text: this.name(`check_${key}`, { count }),
        ...(first ? { link: `/category/edit/${first}` } : {}),
      };
    });
  });

  constructor() {
    effect(() => {
      this.service.insightTop(DAYS[this.topRange()]).subscribe((response) =>
        this.top.set(
          (response.data ?? []).map((item) => ({
            title: item.name,
            value: item.views,
            valueLabel: this.name('views'),
            icon: 'ri-folder-3-line',
            href: `${PUBLIC_CATEGORY}${item.slug}`,
          })),
        ),
      );
    });
    this.service
      .insightAudit()
      .subscribe((response) => this.audit.set(response.data ?? null));
  }
}
