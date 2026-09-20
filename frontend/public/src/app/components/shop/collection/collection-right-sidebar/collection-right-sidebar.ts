import { Component, inject, input } from '@angular/core';

import { Params } from '../../../../shared/interface/core.interface';
import { LayoutService } from '../../../../shared/services/layout.service';
import { CollectionProducts } from '../widgets/collection-products/collection-products';
import { Sidebar } from '../widgets/sidebar/sidebar';

@Component({
  selector: 'app-collection-right-sidebar',
  imports: [Sidebar, CollectionProducts],
  templateUrl: './collection-right-sidebar.html',
  styleUrl: './collection-right-sidebar.scss',
})
export class CollectionRightSidebar {
  filter = input<Params>();
  layoutService = inject(LayoutService);
}
