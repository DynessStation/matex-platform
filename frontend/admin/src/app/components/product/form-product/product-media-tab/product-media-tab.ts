import { Component, inject } from '@angular/core';

import { ImageUpload } from '../../../../shared/components/ui/image-upload/image-upload';
import { ProductFormService } from '../product-form.service';

// Media tab (thumbnail, share image, gallery) of the product form.
// Shared state lives in ProductFormService.
@Component({
  selector: 'app-product-media-tab',

  imports: [ImageUpload],

  templateUrl: './product-media-tab.html',

  // Shared with the other tabs (see FormProduct).
  styleUrl: '../form-product.scss',
})
export class ProductMediaTab {
  readonly editor = inject(ProductFormService);
}
