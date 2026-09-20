import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { NgbAccordionModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { AttributeModel } from '../../../../../shared/interface/attribute.interface';
import { Params } from '../../../../../shared/interface/core.interface';
import { LayoutService } from '../../../../../shared/services/layout.service';
import { GetAttributes } from '../../../../../shared/store/action/attribute.action';
import { AttributeState } from '../../../../../shared/store/state/attribute.state';
import { CollectionAttributeFilter } from '../filter/collection-attribute-filter/collection-attribute-filter';
import { CollectionCategoryFilter } from '../filter/collection-category-filter/collection-category-filter';
import { CollectionFilterComponent } from '../filter/collection-filter/collection-filter';
import { CollectionPriceFilter } from '../filter/collection-price-filter/collection-price-filter';
import { CollectionRatingFilter } from '../filter/collection-rating-filter/collection-rating-filter';

@Component({
  selector: 'app-collection-sidebar',
  imports: [
    CollectionFilterComponent,
    NgbModule,
    NgbAccordionModule,
    CollectionCategoryFilter,
    CollectionPriceFilter,
    CollectionRatingFilter,
    CollectionAttributeFilter,
    AsyncPipe,
    AsyncPipe,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  filter = input<Params>();
  sidebarPopup = input<boolean>();
  hideFilter = input<string[]>([]);

  private store = inject(Store);
  attribute$: Observable<AttributeModel> = this.store.select(AttributeState.attribute);

  constructor(public layoutService: LayoutService) {
    this.store.dispatch(new GetAttributes({ status: 1 }));
  }

  openOffCanvasFilter(value: boolean) {
    this.layoutService.offCanvasFilterMenu = value;
  }
}
