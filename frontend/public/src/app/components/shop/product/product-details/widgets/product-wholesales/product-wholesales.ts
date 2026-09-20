import { Component, Input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { Product } from '../../../../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../../../../shared/pipe/currency.pipe';

@Component({
  selector: 'app-product-wholesales',
  standalone: true,
  imports: [CurrencySymbolPipe, TranslateModule],
  templateUrl: './product-wholesales.html',
  styleUrl: './product-wholesales.scss',
})
export class ProductWholesales {
  @Input() product: Product | null;
}
