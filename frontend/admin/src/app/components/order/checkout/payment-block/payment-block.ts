import { Component, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-payment-block',
  imports: [TranslateModule],
  templateUrl: './payment-block.html',
  styleUrl: './payment-block.scss',
})
export class PaymentBlock {
  readonly selectPaymentMethod = output<string>();

  constructor() {}

  set(value: string) {
    this.selectPaymentMethod.emit(value);
  }
}
