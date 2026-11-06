import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';

import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  ICalculatedChannel,
  ICostItem,
  percent,
  rupiah,
} from '../../../shared/interface/costing.interface';
import {
  IProduct,
  IProductRawColumns,
} from '../../../shared/interface/product.interface';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ProductService } from '../../../shared/services/product.service';
import { AuthState } from '../../../shared/store/state/auth.state';

type RawProduct = IProduct &
  IProductRawColumns & {
    updated?: string;
    created?: string;
    product_stock_quantity?: number | string | null;
    product_lead_time_days?: number | string | null;
    product_min_order_qty?: number | string | null;
    product_length_mm?: number | string | null;
    product_width_mm?: number | string | null;
    product_height_mm?: number | string | null;
    product_weight_grams?: number | string | null;
  };

const SINCE: [number, string][] = [
  [31536000, 'tahun'],
  [2592000, 'bulan'],
  [86400, 'hari'],
  [3600, 'jam'],
  [60, 'menit'],
];

/** "3 jam lalu". */
export const timeSince = (
  value: string | undefined,
  now = Date.now(),
): string => {
  if (!value) return '-';
  const seconds = Math.floor((now - new Date(value).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '-';
  for (const [size, unit] of SINCE) {
    if (seconds >= size) return `${Math.floor(seconds / size)} ${unit} lalu`;
  }
  return 'baru saja';
};

/** Everything about one product on one screen; costs only for those allowed to see them. */
@Component({
  selector: 'app-product-detail-modal',
  imports: [RouterLink],
  templateUrl: './product-detail-modal.html',
})
export class ProductDetailModal {
  readonly modal = inject(NgbActiveModal);
  private products = inject(ProductService);
  private costing = inject(CostingService);
  private notifications = inject(NotificationService);
  private store = inject(Store);

  readonly rupiah = rupiah;
  readonly percent = percent;

  readonly product = signal<RawProduct | null>(null);
  readonly cost = signal<ICostItem | null>(null);
  readonly channels = signal<ICalculatedChannel[]>([]);

  readonly canSeeCost = computed(
    () =>
      this.store.selectSnapshot(AuthState.isAllAccess) === true ||
      (this.store.selectSnapshot(AuthState.permissions) ?? []).includes(
        'cost.view',
      ),
  );

  readonly since = computed(() =>
    timeSince(this.product()?.updated ?? this.product()?.updated_at),
  );

  readonly gallery = computed<IAttachment[]>(
    () => this.product()?.product_galleries ?? [],
  );

  readonly socialImage = computed(
    () => this.product()?.media?.find((item) => item.role === 'og') ?? null,
  );

  readonly seo = computed(() =>
    (this.product()?.translations ?? []).map((translation) => ({
      locale: translation.locale === 'en-US' ? 'English' : 'Indonesia',
      title: translation.meta_title,
      description: translation.meta_description,
      slug: translation.slug,
    })),
  );

  load(id: string): void {
    this.products.getProduct(id).subscribe((response) => {
      this.product.set(response.data as RawProduct);
    });
    if (!this.canSeeCost()) return;
    this.costing.itemOfProduct(id).subscribe((response) => {
      const item = response.data;
      this.cost.set(item);
      if (!item) return;
      this.costing
        .calculate({
          item_id: item.id,
          qty: 1,
          discount: 0,
          voucher: 0,
          ads_rate: 0,
          shipping: 0,
          tax_rate: 0,
        })
        .subscribe((result) => this.channels.set(result.data?.channels ?? []));
    });
  }

  text(value: unknown): string {
    return value === null || value === undefined || value === ''
      ? '-'
      : String(value);
  }

  /** Grams as kilograms, millimetres as centimetres, for the small line under a size. */
  converted(value: unknown, divide: number, unit: string): string {
    const number = Number(value);
    if (value === null || value === '' || !Number.isFinite(number)) return '';
    return `= ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(number / divide)} ${unit}`;
  }

  copy(value: unknown): void {
    const text = this.text(value);
    if (text === '-') return;
    void navigator.clipboard?.writeText(text).then(
      () => this.notifications.showSuccess('Tersalin.'),
      () => undefined,
    );
  }
}
