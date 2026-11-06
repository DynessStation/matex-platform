import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

import { CostingCalculator } from './costing-calculator/costing-calculator';
import { CostingChannels } from './costing-channels/costing-channels';
import { CostingImport } from './costing-import/costing-import';
import { CostingItems } from './costing-items/costing-items';
import { CostingMaterials } from './costing-materials/costing-materials';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';

const TABS = ['items', 'materials', 'channels', 'calculator', 'import'];

// Katalog > HPP & Harga: internal costs and prices, behind cost.view. See assets/help/costing.md.
@Component({
  selector: 'app-costing',
  imports: [
    NgbNavModule,
    PageWrapper,
    HasPermissionDirective,
    CostingItems,
    CostingMaterials,
    CostingChannels,
    CostingCalculator,
    CostingImport,
  ],
  templateUrl: './costing.html',
})
export class Costing implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly tab = signal('items');
  readonly itemId = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const tab = params.get('tab') ?? 'items';
    this.tab.set(TABS.includes(tab) ? tab : 'items');
    this.itemId.set(params.get('item') ?? '');
  }

  setTab(tab: string): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'items' ? null : tab, item: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
