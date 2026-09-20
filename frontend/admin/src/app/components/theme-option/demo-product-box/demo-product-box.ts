import { Component } from '@angular/core';

import { CurrencySymbolPipe } from '../../../shared/pipe/currency-symbol.pipe';

@Component({
  selector: 'app-demo-product-box',
  imports: [CurrencySymbolPipe],
  templateUrl: './demo-product-box.html',
  styleUrl: './demo-product-box.scss',
})
export class DemoProductBox {
  public open: boolean = false;

  show(val: boolean) {
    this.open = val;
  }
}
