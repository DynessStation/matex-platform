import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { Product } from '../../../../../../shared/interface/product.interface';

@Component({
  selector: 'app-product-delivery-information',
  imports: [TranslateModule],
  templateUrl: './product-delivery-information.html',
  styleUrl: './product-delivery-information.scss',
})
export class ProductDeliveryInformation {
  product = input<Product | null>(null);
}
