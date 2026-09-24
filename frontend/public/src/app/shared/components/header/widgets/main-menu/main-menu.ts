import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IPublicNavigationItem } from '../../../../interface/public-navigation.interface';
import { MenuService } from '../../../../services/menu.service';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

@Component({
  selector: 'app-main-menu',
  imports: [RouterLink],
  templateUrl: './main-menu.html',
  styleUrl: './main-menu.scss',
})
export class MainMenu {
  readonly navClass = input<string>('');
  private router = inject(Router);
  public menuService = inject(MenuService);
  public navigation = inject(PublicNavigationContextService);

  get items(): IPublicNavigationItem[] {
    const managedItems = this.navigation.primaryItems();
    if (managedItems.length) return managedItems;

    const english = this.navigation.locale() === 'en-US';
    const fallback = english
      ? [
          ['home', 'Home', '/en'],
          ['catalog', 'Product Catalog', '/en/catalog'],
          ['articles', 'Articles', '/en/articles'],
          ['contact', 'Contact Us', '/en/contact-us'],
        ]
      : [
          ['home', 'Beranda', '/'],
          ['catalog', 'Katalog Produk', '/katalog'],
          ['articles', 'Artikel', '/artikel'],
          ['contact', 'Hubungi Kami', '/kontak'],
        ];

    return fallback.map(([key, label, path]) => ({
      key,
      label,
      path,
      url: null,
      link_type: 'internal',
      target_blank: false,
      icon: null,
      badge: null,
      children: [],
    }));
  }

  toggle(item: IPublicNavigationItem) {
    item.active = !item.active;
  }

  close() {
    this.menuService.mainMenuToggle = false;
  }

  navigate(path: string | null) {
    if (!path) return;
    this.close();
    void this.router.navigateByUrl(path);
  }
}
