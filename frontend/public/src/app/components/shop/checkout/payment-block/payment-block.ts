import { UpperCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { Values } from '../../../../shared/interface/setting.interface';

@Component({
  selector: 'app-payment-block',
  imports: [UpperCasePipe],
  templateUrl: './payment-block.html',
  styleUrl: './payment-block.scss',
})
export class PaymentBlock {
  setting = input<Values>();

  selectPaymentMethod = output<string>();

  constructor() {}

  ngOnInit() {
    // Automatically emit the selectAddress event for the first item if it's available
    if (this.setting() && this.setting()?.payment_methods?.length! > 0) {
      if (this.setting()?.payment_methods?.[0].status) {
        this.selectPaymentMethod.emit(this.setting()?.payment_methods?.[0].name!);
      }
    }
  }

  set(value: string) {
    this.selectPaymentMethod.emit(value);
  }
}
