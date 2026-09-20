import { Component, inject, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { AccountUser } from '../../../../interface/account.interface';
import { AuthService } from '../../../../services/auth.service';
import { AccountState } from '../../../../store/state/account.state';
import { AuthState } from '../../../../store/state/auth.state';
import { ConfirmationModal } from '../../../modal/confirmation-modal/confirmation-modal';
import { LoginModal } from '../../../modal/login-modal/login-modal';

@Component({
  selector: 'app-user-profile',
  imports: [RouterModule, LoginModal],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {
  private authService = inject(AuthService);
  private modal = inject(NgbModal);
  route = inject(Router);
  private store = inject(Store);

  public isLogin: boolean;

  @ViewChild('loginModal') loginModal: LoginModal;

  user$: Observable<AccountUser> = inject(Store).select(
    AccountState.user,
  ) as Observable<AccountUser>;
  isAuthenticated$: Observable<Boolean> = inject(Store).select(AuthState.isAuthenticated);

  ngOnInit() {
    this.isAuthenticated$.subscribe((res) => {
      this.isLogin = Boolean(res);
    });
  }

  account() {
    this.authService.redirectUrl = '/account/dashboard';

    if (this.isLogin) {
      void this.route.navigate(['/account/dashboard']);
    } else {
      this.openLoginModal();
    }
  }

  openLoginModal() {
    void this.loginModal.openModal();
  }

  logout() {
    alert(this.authService.isLogin);
    if (!this.store.selectSnapshot((state) => state.auth && state.auth.access_token)) {
      this.authService.isLogin = true;
    } else {
      this.modal.open(ConfirmationModal, { centered: true });
    }
  }
  goToRegister() {
    this.openLoginModal();
    this.loginModal.activeForm = 'register';
  }
}
