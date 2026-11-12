import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { forkJoin } from 'rxjs';

import {
  ISalesProductOption,
  ISkuMap,
} from '../../../shared/interface/sales.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { SalesService } from '../../../shared/services/sales.service';
import { canImportSales } from '../sales-permission';

/** Every channel SKU seen in the imports, and the product of ours it stands for. */
@Component({
  selector: 'app-sales-sku-map',
  templateUrl: './sales-sku-map.html',
})
export class SalesSkuMap implements OnInit {
  private sales = inject(SalesService);
  private notifications = inject(NotificationService);

  readonly canImport = canImportSales();
  readonly rows = signal<ISkuMap[]>([]);
  readonly products = signal<ISalesProductOption[]>([]);
  readonly onlyUnmapped = signal(false);
  readonly loaded = signal(false);

  readonly visible = computed(() =>
    this.onlyUnmapped()
      ? this.rows().filter((row) => !row.product_id)
      : this.rows(),
  );
  readonly unmappedCount = computed(
    () => this.rows().filter((row) => !row.product_id).length,
  );

  ngOnInit(): void {
    forkJoin({
      map: this.sales.skuMap(),
      products: this.sales.products(),
    }).subscribe(({ map, products }) => {
      this.rows.set(map.data ?? []);
      this.products.set(products.data ?? []);
      this.loaded.set(true);
    });
  }

  toggleUnmapped(event: Event): void {
    this.onlyUnmapped.set((event.target as HTMLInputElement).checked);
  }

  map(row: ISkuMap, event: Event): void {
    const productId = (event.target as HTMLSelectElement).value || null;
    this.sales.mapSku(row.id, productId).subscribe({
      next: () => {
        const product = this.products().find((item) => item.id === productId);
        this.rows.update((rows) =>
          rows.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  product_id: productId,
                  product_name: product?.name ?? null,
                  product_sku: product?.sku ?? null,
                }
              : item,
          ),
        );
        this.notifications.showSuccess('Peta SKU tersimpan.');
      },
    });
  }
}
