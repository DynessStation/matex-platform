import { CommonModule } from '@angular/common';

import { Component, inject, viewChild } from '@angular/core';

import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { IAuthAdminUser } from '../../../../interface/auth.interface';

import { LogoutAction } from '../../../../store/action/auth.action';

import { AuthState } from '../../../../store/state/auth.state';

import { ConfirmationModal } from '../../../ui/modal/confirmation-modal/confirmation-modal';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-profile',

  imports: [CommonModule, RouterModule, TranslateModule, ConfirmationModal],

  templateUrl: './profile.html',

  styleUrl: './profile.scss',
})
export class Profile {
  private store = inject(Store);

  //==================================================
  //==== AUTH USER
  //==================================================

  user$: Observable<IAuthAdminUser | null> = this.store.select(AuthState.user);

  //==================================================
  //==== MODAL
  //==================================================

  readonly ConfirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  public active: boolean = false;

  //==================================================
  //==== MOBILE
  //==================================================

  clickHeaderOnMobile(): void {
    this.active = !this.active;
  }

  //==================================================
  //==== LOGOUT
  //==================================================

  logout(): void {
    this.store.dispatch(new LogoutAction());
  }
}
