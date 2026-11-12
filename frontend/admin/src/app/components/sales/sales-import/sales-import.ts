import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { rupiah } from '../../../shared/interface/costing.interface';
import {
  ISalesImport,
  ISalesImportReport,
  ISalesStore,
} from '../../../shared/interface/sales.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { SalesService } from '../../../shared/services/sales.service';
import { canImportSales } from '../sales-permission';

export const KIND_LABELS: Record<string, string> = {
  orders: 'Pesanan',
  settlement: 'Dana cair',
};

/** One store, one file: read and reported first, saved when asked again. */
@Component({
  selector: 'app-sales-import',
  imports: [DatePipe],
  templateUrl: './sales-import.html',
})
export class SalesImport implements OnInit {
  private sales = inject(SalesService);
  private notifications = inject(NotificationService);

  readonly rupiah = rupiah;
  readonly kindLabels = KIND_LABELS;
  readonly canImport = canImportSales();
  readonly stores = signal<ISalesStore[]>([]);
  readonly store = signal('');
  readonly file = signal<File | null>(null);
  readonly report = signal<ISalesImportReport | null>(null);
  readonly history = signal<ISalesImport[]>([]);
  readonly busy = signal(false);
  readonly loaded = signal(false);

  ngOnInit(): void {
    this.sales.stores().subscribe((response) => {
      const stores = (response.data ?? []).filter((store) => store.status);
      this.stores.set(stores);
      if (stores.length === 1) this.store.set(stores[0].id);
      this.loaded.set(true);
      this.loadHistory();
    });
  }

  chooseStore(event: Event): void {
    this.store.set((event.target as HTMLSelectElement).value);
    this.report.set(null);
  }

  chooseFile(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.report.set(null);
  }

  run(apply: boolean): void {
    const file = this.file();
    const store = this.store();
    if (!file || !store) return;
    this.busy.set(true);
    this.sales.importFile(store, file, apply).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.report.set(response.data);
        if (apply) {
          this.notifications.showSuccess('File tersimpan.');
          this.loadHistory();
          this.sales.stores().subscribe((stores) => {
            this.stores.set((stores.data ?? []).filter((item) => item.status));
          });
        }
      },
      error: () => this.busy.set(false),
    });
  }

  private loadHistory(): void {
    this.sales.imports().subscribe((response) => {
      this.history.set(response.data ?? []);
    });
  }
}
