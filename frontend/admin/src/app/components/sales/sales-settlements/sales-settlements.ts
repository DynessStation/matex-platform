import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { rupiah } from '../../../shared/interface/costing.interface';
import {
  ISalesFilter,
  ISalesListMeta,
  ISalesSettlement,
} from '../../../shared/interface/sales.interface';
import { SalesService } from '../../../shared/services/sales.service';
import { SalesFilter } from '../sales-filter/sales-filter';

/** What the channel paid out, per order or adjustment, with the fee breakdown on demand. */
@Component({
  selector: 'app-sales-settlements',
  imports: [DatePipe, SalesFilter],
  templateUrl: './sales-settlements.html',
})
export class SalesSettlements implements OnInit {
  private sales = inject(SalesService);

  readonly rupiah = rupiah;
  readonly rows = signal<ISalesSettlement[]>([]);
  readonly meta = signal<ISalesListMeta | null>(null);
  readonly open = signal<string | null>(null);
  readonly loaded = signal(false);
  private filter: ISalesFilter = {};

  ngOnInit(): void {
    this.load();
  }

  apply(filter: ISalesFilter): void {
    this.filter = { ...filter, page: 1 };
    this.load();
  }

  page(delta: number): void {
    this.filter = { ...this.filter, page: (this.filter.page ?? 1) + delta };
    this.load();
  }

  toggle(id: string): void {
    this.open.set(this.open() === id ? null : id);
  }

  details(row: ISalesSettlement): { label: string; value: number }[] {
    return Object.entries(row.detail ?? {}).map(([label, value]) => ({
      label,
      value,
    }));
  }

  private load(): void {
    this.sales.settlements(this.filter).subscribe((response) => {
      this.rows.set(response.data ?? []);
      this.meta.set(response.meta);
      this.loaded.set(true);
    });
  }
}
