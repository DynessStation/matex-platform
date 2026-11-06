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
import { IProductInsightAudit } from '../../../shared/interface/product.interface';
import { ProductService } from '../../../shared/services/product.service';

const DAYS: Record<InsightRange, number> = { '1H': 1, '7H': 7, '1B': 30 };
const PUBLIC_PRODUCT = 'https://matexindo.com/produk/';

// The insight band of the product list: most viewed, marketplace clicks, and the data audit.
@Component({
  selector: 'app-product-insight',
  imports: [
    TranslateModule,
    InsightAudit,
    InsightColumn,
    InsightPanel,
    InsightRank,
  ],
  templateUrl: './product-insight.html',
})
export class ProductInsight {
  private readonly service = inject(ProductService);
  private readonly translate = inject(TranslateService);

  readonly topRange = signal<InsightRange>('7H');
  readonly channelRange = signal<InsightRange>('7H');
  readonly top = signal<InsightRankItem[]>([]);
  readonly channels = signal<InsightRankItem[]>([]);
  readonly audit = signal<IProductInsightAudit | null>(null);

  private name(key: string, params?: Record<string, number>): string {
    return this.translate.instant(`product_insight.${key}`, params);
  }

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
    const counts = this.audit()?.checks;
    if (!counts) return [];
    return (Object.keys(counts) as (keyof typeof counts)[]).map((key) => {
      const count = counts[key];
      return {
        state: count > 0 ? 'warn' : 'ok',
        text: this.name(`check_${key}`, { count }),
        ...(count > 0 ? { link: '/product', queryParams: { audit: key } } : {}),
      };
    });
  });

  constructor() {
    effect(() => {
      this.service.insightTop(DAYS[this.topRange()]).subscribe((response) =>
        this.top.set(
          (response.data ?? []).map((item) => ({
            title: item.name,
            sub: item.sku,
            value: item.views,
            valueLabel: this.name('views'),
            image: item.thumbnail ?? undefined,
            icon: 'ri-box-3-line',
            href: `${PUBLIC_PRODUCT}${item.slug}`,
          })),
        ),
      );
    });
    effect(() => {
      this.service
        .insightMarketplaces(DAYS[this.channelRange()])
        .subscribe((response) =>
          this.channels.set(
            (response.data ?? []).map((item) => ({
              title: item.name,
              sub: this.name('channel_products', { count: item.products }),
              value: item.clicks,
              valueLabel: this.name('clicks'),
              icon: 'ri-store-2-line',
            })),
          ),
        );
    });
    this.service
      .insightAudit()
      .subscribe((response) => this.audit.set(response.data ?? null));
  }
}
