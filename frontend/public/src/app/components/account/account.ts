import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from './sidebar/sidebar';
import { Breadcrumb } from '../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../shared/interface/breadcrumb.interface';
import { AccountService } from '../../shared/services/account.service';
import { HomeNewsletter } from '../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-account',
  imports: [Sidebar, RouterOutlet, Breadcrumb, HomeNewsletter],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  constructor(public accountService: AccountService) {}

  public breadcrumb: breadcrumb = {
    title: 'User Dashboard',
    items: [{ label: 'User Dashboard', active: true }],
  };

  openMenu() {
    this.accountService.isOpenMenu = !this.accountService.isOpenMenu;
  }
}
