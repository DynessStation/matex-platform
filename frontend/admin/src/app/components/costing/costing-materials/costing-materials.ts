import { Component, inject, OnInit, signal } from '@angular/core';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import {
  ICostImpact,
  ICostMaterial,
  rupiah,
} from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

/** Materials, services, and packaging, with what a new price would do to each item. */
@Component({
  selector: 'app-costing-materials',
  imports: [InlineTable],
  templateUrl: './costing-materials.html',
})
export class CostingMaterials implements OnInit {
  private costing = inject(CostingService);

  readonly rupiah = rupiah;
  readonly rows = signal<InlineRow[]>([]);
  readonly impact = signal<{ name: string; items: ICostImpact[] } | null>(null);

  readonly blank: InlineRow = {
    name: '',
    kind: 'material',
    unit: 'kg',
    price: '',
    from: today(),
    used_by: 0,
  };

  readonly columns: InlineColumn[] = [
    {
      key: 'name',
      label: 'Nama',
      validate: (value) =>
        String(value ?? '').trim() ? null : 'form_kit.required',
    },
    {
      key: 'kind',
      label: 'Jenis',
      type: 'select',
      width: '130px',
      options: [
        { value: 'material', label: 'Bahan' },
        { value: 'service', label: 'Jasa' },
        { value: 'packaging', label: 'Kemasan' },
        { value: 'shipping', label: 'Ongkir' },
        { value: 'other', label: 'Lainnya' },
      ],
    },
    {
      key: 'unit',
      label: 'Satuan',
      width: '90px',
      validate: (value) =>
        String(value ?? '').trim() ? null : 'form_kit.required',
    },
    {
      key: 'price',
      label: 'Harga',
      width: '130px',
      compute: (row) => rupiah(Number(row['price'])),
      validate: (value) =>
        String(value ?? '').trim() !== '' && Number(value) >= 0
          ? null
          : 'Isi angka.',
    },
    {
      key: 'from',
      label: 'Berlaku dari',
      width: '130px',
      placeholder: 'YYYY-MM-DD',
      validate: (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) ? null : 'YYYY-MM-DD',
    },
    {
      key: 'used_by',
      label: 'Dipakai',
      type: 'computed',
      width: '80px',
      compute: (row) => `${row['used_by'] ?? 0} item`,
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.costing.materials().subscribe((response) => {
      this.rows.set((response.data ?? []).map((item) => this.toRow(item)));
    });
  }

  private toRow(item: ICostMaterial): InlineRow {
    return {
      id: item.id,
      name: item.name,
      kind: item.kind,
      unit: item.unit,
      price: item.price ?? '',
      was_price: item.price,
      from: item.price_from ?? today(),
      was_from: item.price_from,
      used_by: item.used_by,
    };
  }

  save(change: InlineChange): void {
    const { row } = change;
    const payload = { name: row['name'], kind: row['kind'], unit: row['unit'] };
    const price = Number(row['price']);
    if (change.isNew) {
      this.costing.createMaterial({ ...payload, price }).subscribe({
        next: () => {
          change.done(true);
          this.load();
        },
        error: () => change.done(false),
      });
      return;
    }
    const id = String(row['id']);
    const changed =
      price !== row['was_price'] || row['from'] !== row['was_from'];
    this.costing.updateMaterial(id, payload).subscribe({
      next: () => {
        if (!changed) {
          change.done(true);
          return;
        }
        this.costing
          .addMaterialPrice(id, price, String(row['from']))
          .subscribe({
            next: () => {
              change.done(true);
              this.load();
            },
            error: () => change.done(false),
          });
      },
      error: () => change.done(false),
    });
  }

  remove(change: InlineChange): void {
    this.costing.deleteMaterial(String(change.row['id'])).subscribe({
      next: () => change.done(true),
      error: () => change.done(false),
    });
  }

  /** Shown before saving: what this price would do to the HPP of each item. */
  showImpact(row: InlineRow): void {
    const price = Number(row['price']);
    if (!row['id'] || !Number.isFinite(price)) return;
    this.costing
      .materialImpact(String(row['id']), price)
      .subscribe((response) => {
        this.impact.set({
          name: String(row['name']),
          items: response.data ?? [],
        });
      });
  }
}
