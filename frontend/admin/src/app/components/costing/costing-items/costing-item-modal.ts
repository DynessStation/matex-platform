import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  ICostItem,
  ICostItemPayload,
  ICostMaterial,
  percent,
  rupiah,
} from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';

const numberOr = (value: unknown, fallback: number | null) => {
  const text = String(value ?? '')
    .trim()
    .replace(',', '.');
  if (text === '') return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
};
const notNumber = (value: unknown) =>
  String(value ?? '').trim() !== '' &&
  !Number.isFinite(Number(String(value).trim().replace(',', '.')));

/** One item: its identity, its rates, and its recipe. Saving a recipe adds a version. */
@Component({
  selector: 'app-costing-item-modal',
  imports: [FormsModule, RouterLink, InlineTable, HasPermissionDirective],
  templateUrl: './costing-item-modal.html',
})
export class CostingItemModal {
  readonly modal = inject(NgbActiveModal);
  private costing = inject(CostingService);
  private notifications = inject(NotificationService);

  readonly rupiah = rupiah;
  readonly percent = percent;

  readonly itemId = signal<string | null>(null);
  readonly item = signal<ICostItem | null>(null);
  readonly materials = signal<ICostMaterial[]>([]);
  readonly lines = signal<InlineRow[]>([]);
  readonly saving = signal(false);
  readonly recipeChanged = signal(false);
  readonly rowOpen = signal(false);

  form: Record<string, string> = {
    name: '',
    group: '',
    sku: '',
    width: '',
    length: '',
    height: '',
    gpm: '',
    affiliate: '',
    app: '',
  };

  readonly blank: InlineRow = {
    material: '',
    label: '',
    qty: '1',
    formula: '',
    own_price: '',
  };

  readonly columns = computed<InlineColumn[]>(() => [
    {
      key: 'material',
      label: 'Bahan',
      type: 'select',
      width: '220px',
      options: [
        { value: '', label: '(Tanpa bahan, isi harga)' },
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
      width: '90px',
      validate: (value) => (notNumber(value) ? 'Isi angka.' : null),
    },
    {
      key: 'formula',
      label: 'Rumus (L, P, T)',
      width: '170px',
      placeholder: '(2*L + 5*T) / 100',
    },
    {
      key: 'own_price',
      label: 'Harga khusus',
      width: '110px',
      validate: (value, row) =>
        notNumber(value)
          ? 'Isi angka.'
          : !row['material'] && String(value ?? '').trim() === ''
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

  /** What the lines add up to while editing; the server's answer counts after saving. */
  readonly total = computed(() =>
    this.lines().reduce((sum, row) => sum + this.lineTotal(row), 0),
  );

  constructor() {
    this.costing
      .materials()
      .subscribe((response) => this.materials.set(response.data ?? []));
    effect(() => {
      const id = this.itemId();
      if (id) this.load(id);
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

  private load(id: string): void {
    this.costing.item(id).subscribe((response) => {
      const item = response.data;
      this.item.set(item);
      const pct = (value: number | null) =>
        value == null ? '' : String(Math.round(value * 10000) / 100);
      this.form = {
        name: item.name,
        group: item.group ?? '',
        sku: item.sku ?? '',
        width: item.width == null ? '' : String(item.width),
        length: item.length == null ? '' : String(item.length),
        height: item.height == null ? '' : String(item.height),
        gpm: pct(item.own_rates.gpm),
        affiliate: pct(item.own_rates.affiliate),
        app: pct(item.own_rates.app),
      };
      this.lines.set(
        (item.lines ?? []).map((line) => ({
          material: line.material_id ?? '',
          label: line.label,
          qty: String(Math.round(line.qty * 1e6) / 1e6),
          formula: line.formula ?? '',
          own_price: line.own_price == null ? '' : String(line.own_price),
          price: line.price,
        })),
      );
      this.recipeChanged.set(false);
    });
  }

  /** A blank percentage means "use the general rate". */
  private rate(value: string): number | null {
    const number = numberOr(value, null);
    return number == null ? null : number / 100;
  }

  saveIdentity(): void {
    const payload: ICostItemPayload = {
      name: this.form['name'],
      group: this.form['group'] || null,
      sku: this.form['sku'] || null,
      width: numberOr(this.form['width'], null),
      length: numberOr(this.form['length'], null),
      height: numberOr(this.form['height'], null),
      gpm: this.rate(this.form['gpm']),
      affiliate: this.rate(this.form['affiliate']),
      app: this.rate(this.form['app']),
    };
    this.saving.set(true);
    this.costing.saveItem(this.itemId(), payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.showSuccess('Item tersimpan.');
        const created = response.data?.id;
        if (created) this.itemId.set(created);
        else this.load(this.itemId()!);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  keepLine(change: InlineChange): void {
    this.recipeChanged.set(true);
    change.done(true);
  }

  saveRecipe(): void {
    const id = this.itemId();
    if (!id) return;
    const lines = this.lines().map((row) => {
      const material = this.materials().find(
        (item) => item.id === row['material'],
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
    this.costing.saveRecipe(id, lines).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.notifications.showSuccess(
          `Resep tersimpan sebagai versi ${response.data?.version}.`,
        );
        this.load(id);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
