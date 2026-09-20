import { Component, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { UserAddress } from '../../../../shared/interface/user.interface';

@Component({
  selector: 'app-address-block',
  imports: [TranslateModule],
  templateUrl: './address-block.html',
  styleUrl: './address-block.scss',
})
export class AddressBlock {
  addresses = input<UserAddress[] | []>([]);
  type = input<string>('shipping');

  selectAddress = output<number>();

  constructor() {}

  ngOnChanges() {
    // Automatically emit the selectAddress event for the first item if it's available
    if (this.addresses() && this.addresses().length > 0) {
      const firstAddressId = this.addresses()[0].id;
      this.selectAddress.emit(firstAddressId);
    }
  }

  set(event: Event) {
    this.selectAddress.emit(Number((<HTMLInputElement>event.target)?.value));
  }
}
