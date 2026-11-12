import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

import { BusinessEntities } from './business-entities/business-entities';
import { BusinessRules } from './business-rules/business-rules';
import { BusinessStores } from './business-stores/business-stores';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

const TABS = ['entities', 'stores', 'rules'];

// Bisnis > Entitas & Toko: the parties of the business, their stores, and who gets what from a
// sale, behind business.view. See assets/help/business.md.
@Component({
  selector: 'app-business',
  imports: [
    NgbNavModule,
    PageWrapper,
    BusinessEntities,
    BusinessStores,
    BusinessRules,
  ],
  templateUrl: './business.html',
})
export class Business implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly tab = signal('entities');

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') ?? 'entities';
    this.tab.set(TABS.includes(tab) ? tab : 'entities');
  }

  setTab(tab: string): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'entities' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
