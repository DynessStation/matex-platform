import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

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

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    //==================================================
    //==== SIDEBAR READY
    //==================================================

    this.navServices.sidebarLoading = false;
  }
}
