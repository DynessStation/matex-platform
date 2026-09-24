import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

@Component({
  selector: 'app-mobile-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
})
export class MobileMenu {
  public navigation = inject(PublicNavigationContextService);

  path(id: 'home' | 'catalog' | 'search' | 'articles' | 'contact'): string {
    const english = this.navigation.locale() === 'en-US';
    const paths = english
      ? { home: '/en', catalog: '/en/catalog', search: '/en/search', articles: '/en/articles', contact: '/en/contact-us' }
      : { home: '/', catalog: '/katalog', search: '/search', articles: '/artikel', contact: '/kontak' };
    return paths[id];
  }
}
