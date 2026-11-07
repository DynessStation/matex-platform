import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { LocalizedNumberInputDirective } from '../../../shared/directives/localized-number-input.directive';
import {
  COST_KIND_LABELS,
  ICalculatedChannel,
  ICostItem,
  ICostMaterial,
  percent,
  PRICE_STATUS_LABELS,
  rupiah,
} from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';

const numberOr = (value: unknown, fallback: number | null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/**
 * HPP, margin, price, and profit per channel of one product, in one place. Lives in the product
 * form and in the popup of the HPP & Harga list. Give it a product (the HPP starts on request)
 * or an item.
 */
@Component({
  selector: 'app-cost-panel',
  imports: [
    FormsModule,
    RouterLink,
    InlineTable,
    HasPermissionDirective,
    LocalizedNumberInputDirective,
  ],
  templateUrl: './cost-panel.html',
})
export class CostPanel {
  private costing = inject(CostingService);
  private notifications = inject(NotificationService);

  readonly productId = input<string | null>(null);
  readonly itemId = input<string | null>(null);
  /** The website price changed: the form should read its price rows again. */
  readonly pricesApplied = output<void>();
  /** Whether the price follows the calculation, so nobody types over it. */
  readonly locked = output<boolean>();
  /** The panel's item changed, for whoever shows more of it. */
  readonly itemChange = output<ICostItem | null>();

  readonly rupiah = rupiah;
  readonly percent = percent;
  readonly statusLabels = PRICE_STATUS_LABELS;
  readonly kindLabels = COST_KIND_LABELS;

  readonly item = signal<ICostItem | null>(null);
  readonly loading = signal(true);
  readonly materials = signal<ICostMaterial[]>([]);
  readonly lines = signal<InlineRow[]>([]);
  readonly channels = signal<ICalculatedChannel[]>([]);
  readonly saving = signal(false);
  readonly recipeChanged = signal(false);
  readonly rowOpen = signal(false);

  rates: { gpm: number | null; affiliate: number | null; app: number | null } =
    {
      gpm: null,
      affiliate: null,
      app: null,
    };

  readonly blank: InlineRow = {
    material: '',
    label: '',
    qty: 1,
    formula: '',
    own_price: null,
  };

  readonly columns = computed<InlineColumn[]>(() => [
    {
      key: 'material',
      label: 'Bahan / biaya',
      type: 'select',
      width: '230px',
      options: [
        { value: '', label: '(Tulis sendiri, isi harga)' },
        ...this.materials().map((material) => ({
          value: material.id,
          label: `${material.name} (${rupiah(material.price)}/${material.unit})`,
        })),
      ],
    },
    { key: 'label', label: 'Keterangan', placeholder: 'Otomatis dari bahan' },
    {
      key: 'qty',
      label: 'Jumlah',
      type: 'number',
      decimals: 6,
      width: '100px',
    },
    {
      key: 'formula',
      label: 'Rumus ukuran',
      width: '160px',
      placeholder: '(2*L + 5*T) / 100',
    },
    {
      key: 'own_price',
      label: 'Harga khusus',
      type: 'number',
      decimals: 2,
      width: '120px',
      validate: (value, row) =>
        !row['material'] &&
        (value === null || value === '' || value === undefined)
          ? 'Wajib tanpa bahan.'
          : null,
    },
    {
      key: 'total',
      label: 'Total',
      type: 'computed',
      width: '110px',
      compute: (row) => rupiah(this.lineTotal(row)),
    },
  ]);

  readonly total = computed(() =>
    this.lines().reduce((sum, row) => sum + this.lineTotal(row), 0),
  );

  constructor() {
    this.costing
      .materials()
      .subscribe((response) => this.materials.set(response.data ?? []));
    effect(() => {
      const productId = this.productId();
      const itemId = this.itemId();
      untracked(() => this.load(productId, itemId));
    });
  }

  private lineTotal(row: InlineRow): number {
    const own = numberOr(row['own_price'], null);
    const material = this.materials().find(
      (item) => item.id === row['material'],
    );
    const known = row['price'] as number | undefined;
    const price = own ?? material?.price ?? known ?? 0;
    return (numberOr(row['qty'], 0) ?? 0) * price;
  }

  private load(productId: string | null, itemId: string | null): void {
    if (itemId) {
      this.costing
        .item(itemId)
        .subscribe((response) => this.show(response.data));
      return;
    }
    if (productId) {
      this.costing
        .itemOfProduct(productId)
        .subscribe((response) => this.show(response.data));
      return;
    }
    this.show(null);
  }

  private reload(): void {
    const item = this.item();
    if (item) this.load(null, item.id);
  }

  private show(item: ICostItem | null): void {
    this.loading.set(false);
    this.item.set(item);
    this.itemChange.emit(item);
    this.locked.emit(
      Boolean(item) && item!.hpp > 0 && item!.price_mode === 'follow',
    );
    if (!item) {
      this.lines.set([]);
      this.channels.set([]);
      return;
    }
    const pct = (value: number | null) =>
      value === null ? null : Math.round(value * 10000) / 100;
    this.rates = {
      gpm: pct(item.own_rates.gpm),
      affiliate: pct(item.own_rates.affiliate),
      app: pct(item.own_rates.app),
    };
    this.lines.set(
      (item.lines ?? []).map((line) => ({
        material: line.material_id ?? '',
        label: line.label,
        qty: Math.round(line.qty * 1e6) / 1e6,
        formula: line.formula ?? '',
        own_price: line.own_price,
        price: line.price,
      })),
    );
    this.recipeChanged.set(false);
    this.costing
      .calculate({
        item_id: item.id,
        ...(item.price_mode === 'manual' && item.live.idr
          ? { price: item.live.idr }
          : {}),
        qty: 1,
        discount: 0,
        voucher: 0,
        ads_rate: 0,
        shipping: 0,
        tax_rate: 0,
        target_margin: item.rates.gpm,
      })
      .subscribe((response) =>
        this.channels.set(response.data?.channels ?? []),
      );
  }

  start(): void {
    const productId = this.productId();
    if (!productId) return;
    this.saving.set(true);
    this.costing.startProductItem(productId).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.show(response.data);
      },
      error: () => this.saving.set(false),
    });
  }

  keepLine(change: InlineChange): void {
    this.recipeChanged.set(true);
    change.done(true);
  }

  saveRecipe(): void {
    const item = this.item();
    if (!item) return;
    const lines = this.lines().map((row) => {
      const material = this.materials().find(
        (entry) => entry.id === row['material'],
      );
      return {
        material_id: material?.id ?? null,
        label:
          String(row['label'] ?? '').trim() || material?.name || 'Lain-lain',
        qty: numberOr(row['qty'], 1) ?? 1,
        formula: String(row['formula'] ?? '').trim() || null,
        own_price: numberOr(row['own_price'], null),
      };
    });
    this.saving.set(true);
    this.costing.saveRecipe(item.id, lines).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.showSuccess(
          `Resep tersimpan sebagai versi ${response.data?.version}.`,
        );
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  private savePricing(mode: string): void {
    const item = this.item();
    if (!item) return;
    const fraction = (value: number | null) =>
      value === null ? null : value / 100;
    this.saving.set(true);
    this.costing
      .savePricing(item.id, {
        gpm: fraction(this.rates.gpm),
        affiliate: fraction(this.rates.affiliate),
        app: fraction(this.rates.app),
        price_mode: mode,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  saveRates(): void {
    this.savePricing(this.item()?.price_mode ?? 'follow');
  }

  setMode(mode: 'follow' | 'manual'): void {
    this.savePricing(mode);
  }

  apply(): void {
    const item = this.item();
    if (!item) return;
    this.saving.set(true);
    this.costing.applyPrices([item.id]).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.showSuccess('Harga produk ini sudah diganti.');
        this.reload();
        this.pricesApplied.emit();
      },
      error: () => this.saving.set(false),
    });
  }
}
