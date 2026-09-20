import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { Product } from '../../../../../../shared/interface/product.interface';
import { Option } from '../../../../../../shared/interface/theme-option.interface';

@Component({
  selector: 'app-payment-option',
  imports: [TranslateModule],
  templateUrl: './payment-option.html',
  styleUrl: './payment-option.scss',
})
export class PaymentOption {
  product = input<Product | null>(null);
  option = input<Option | null>();
}
