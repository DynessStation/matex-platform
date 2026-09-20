import { Component, inject } from '@angular/core';

import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';

import { GetNotificationAction } from '../../../store/action/notification.action';

import { NavService } from '../../../services/nav.service';

import { Footer } from '../../footer/footer';

import { Header } from '../../header/header';

import { Sidebar } from '../../sidebar/sidebar';

import { SidebarMenuSkeleton } from '../../ui/skeleton/sidebar-menu-skeleton/sidebar-menu-skeleton';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-content',

  imports: [RouterModule, Header, Footer, SidebarMenuSkeleton, Sidebar],

  templateUrl: './content.html',

  styleUrl: './content.scss',
})
export class Content {
  //==================================================
  //==== INJECT
  //==================================================

  navServices = inject(NavService);

  private store = inject(Store);

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    //==================================================
    //==== SIDEBAR READY
    //==================================================

    this.navServices.sidebarLoading = false;

    //==================================================
    //==== NOTIFICATION
    //==================================================

    this.store.dispatch(new GetNotificationAction());
  }
}
