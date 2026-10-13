import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { NgbAccordionModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Params } from '../../../../../shared/interface/core.interface';
import { LayoutService } from '../../../../../shared/services/layout.service';
import { CollectionCategoryFilter } from '../filter/collection-category-filter/collection-category-filter';
import { CollectionFilterComponent } from '../filter/collection-filter/collection-filter';
import { CollectionPriceFilter } from '../filter/collection-price-filter/collection-price-filter';

@Component({
  selector: 'app-collection-sidebar',
  imports: [
    CollectionFilterComponent,
    NgbModule,
    NgbAccordionModule,
    CollectionCategoryFilter,
    CollectionPriceFilter,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  filter = input<Params>();
  sidebarPopup = input<boolean>();
  hideFilter = input<string[]>([]);

  private router = inject(Router);

  constructor(public layoutService: LayoutService) {}

  openOffCanvasFilter(value: boolean) {
    this.layoutService.offCanvasFilterMenu = value;
  }

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
}
