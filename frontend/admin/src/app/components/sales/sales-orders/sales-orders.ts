import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { rupiah } from '../../../shared/interface/costing.interface';
import {
  ISalesFilter,
  ISalesListMeta,
  ISalesOrder,
} from '../../../shared/interface/sales.interface';
import { SalesService } from '../../../shared/services/sales.service';
import { SalesFilter } from '../sales-filter/sales-filter';

/** Imported orders, newest first, each with its SKUs and the product behind them. */
@Component({
  selector: 'app-sales-orders',
  imports: [DatePipe, SalesFilter],
  templateUrl: './sales-orders.html',
})
export class SalesOrders implements OnInit {
  private sales = inject(SalesService);

  readonly rupiah = rupiah;
  readonly rows = signal<ISalesOrder[]>([]);
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

  private load(): void {
    this.sales.orders(this.filter).subscribe((response) => {
      this.rows.set(response.data ?? []);
      this.meta.set(response.meta);
      this.loaded.set(true);
    });
  }
}
