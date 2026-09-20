import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { User, UserAddress } from '../../../shared/interface/user.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { AccountState } from '../../../shared/store/state/account.state';

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, TitleCasePipe, CurrencySymbolPipe, RouterModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private store = inject(Store);

  user$: Observable<User | null> = this.store.select(AccountState.user);

  public address: UserAddress | null;

  constructor(private modal: NgbModal) {
    this.user$.subscribe((user) => {
      this.address = user?.address?.length ? user?.address?.[0] : null;
    });
  }

  openModal(value: string) {
    if (value == 'profile') {
    } else if (value == 'password') {
    }
  }
}
