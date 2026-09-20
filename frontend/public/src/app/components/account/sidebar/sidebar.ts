import { Component, inject } from '@angular/core';
import { RouterLinkActive, RouterLinkWithHref } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';

import { ConfirmationModal } from '../../../shared/components/modal/confirmation-modal/confirmation-modal';
import { AccountService } from '../../../shared/services/account.service';
import { Logout } from '../../../shared/store/action/auth.action';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLinkActive, RouterLinkWithHref],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  store = inject(Store);
  private modal = inject(NgbModal);
  constructor(public accountService: AccountService) {}

  logout() {
    const modal = this.modal.open(ConfirmationModal, {
      centered: true,
      windowClass: 'log-out-modal theme-modal',
    });
    modal.componentInstance.confirm.subscribe((val: boolean) => {
      if (val === true) {
        this.store.dispatch(new Logout());
        this.modal.dismissAll();
      }
    });
  }
  closeMenu() {
    this.accountService.isOpenMenu = false;
  }
}
