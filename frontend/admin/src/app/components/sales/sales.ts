import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

import { SalesImport } from './sales-import/sales-import';
import { SalesOrders } from './sales-orders/sales-orders';
import { SalesSettlements } from './sales-settlements/sales-settlements';
import { SalesSkuMap } from './sales-sku-map/sales-sku-map';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

const TABS = ['import', 'orders', 'settlements', 'sku-map'];

// Bisnis > Penjualan: what each store sold and what the channel paid out, read from the files
// the team downloads from Seller Center, behind sales.view. See assets/help/sales.md.
@Component({
  selector: 'app-sales',
  imports: [
    NgbNavModule,
    PageWrapper,
    SalesImport,
    SalesOrders,
    SalesSettlements,
    SalesSkuMap,
  ],
  templateUrl: './sales.html',
})
export class Sales implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly tab = signal('import');

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') ?? 'import';
    this.tab.set(TABS.includes(tab) ? tab : 'import');
  }

  setTab(tab: string): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'import' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
