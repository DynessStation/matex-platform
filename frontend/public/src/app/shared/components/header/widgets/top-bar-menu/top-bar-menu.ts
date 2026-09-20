import { Component, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

import { LoginModal } from '../../../modal/login-modal/login-modal';

@Component({
  selector: 'app-top-bar-menu',
  imports: [RouterModule, LoginModal],
  templateUrl: './top-bar-menu.html',
  styleUrl: './top-bar-menu.scss',
})
export class TopBarMenu {
  @ViewChild('loginModal') loginModal: LoginModal;

  openLoginModal() {
    void this.loginModal.openModal();
  }
}
