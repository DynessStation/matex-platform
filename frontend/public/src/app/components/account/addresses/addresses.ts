import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { AccountUser } from '../../../shared/interface/account.interface';
import { UserAddress } from '../../../shared/interface/user.interface';
import { DeleteAddress } from '../../../shared/store/action/account.action';
import { AccountState } from '../../../shared/store/state/account.state';

@Component({
  selector: 'app-addresses',
  imports: [NoData, AsyncPipe, TitleCasePipe, TranslateModule],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class Addresses {
  private store = inject(Store);

  user$: Observable<AccountUser | null> = this.store.select(AccountState.user);

  AddressModal(_address?: UserAddress) {}

  removeAddress(_address: UserAddress) {}

  delete(action: string, data: UserAddress) {
    if (action == 'delete' && data) this.store.dispatch(new DeleteAddress(data.id));
  }
}
