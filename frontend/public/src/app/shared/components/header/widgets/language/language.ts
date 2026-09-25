import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ClickOutsideDirective } from '../../../../directive/out-side-directive';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

@Component({
  selector: 'app-language',
  imports: [ClickOutsideDirective],
  templateUrl: './language.html',
  styleUrl: './language.scss',
})
export class Language {
  private router = inject(Router);
  public navigation = inject(PublicNavigationContextService);
  public active = false;

  openDropDown(): void {
    this.active = !this.active;
  }

  hideDropdown(): void {
    this.active = false;
  }

  selectLocale(locale: 'id-ID' | 'en-US'): void {
    this.active = false;
    void this.router.navigateByUrl(this.localizedPath(locale));
  }

  private localizedPath(locale: 'id-ID' | 'en-US'): string {
    const current = this.router.url.split('?')[0].split('#')[0];
    const mappings: Array<[RegExp, (match: RegExpMatchArray) => string]> =
      locale === 'en-US'
        ? [
            [/^\/$|^\/home$/, () => '/en'],
            [/^\/katalog$/, () => '/en/catalog'],
            [/^\/kategori\/([^/]+)$/, (match) => `/en/category/${match[1]}`],
            [/^\/produk\/([^/]+)$/, (match) => `/en/product/${match[1]}`],
            [/^\/artikel$/, () => '/en/articles'],
            [/^\/artikel\/([^/]+)$/, (match) => `/en/article/${match[1]}`],
            [/^\/kontak$/, () => '/en/contact-us'],
            [/^\/tentang-matex$/, () => '/en/about-matex'],
            [/^\/faq$/, () => '/en/faq'],
            [/^\/search$/, () => '/en/search'],
          ]
        : [
            [/^\/en$/, () => '/'],
            [/^\/en\/catalog$/, () => '/katalog'],
            [/^\/en\/category\/([^/]+)$/, (match) => `/kategori/${match[1]}`],
            [/^\/en\/product\/([^/]+)$/, (match) => `/produk/${match[1]}`],
            [/^\/en\/articles$/, () => '/artikel'],
            [/^\/en\/article\/([^/]+)$/, (match) => `/artikel/${match[1]}`],
            [/^\/en\/contact-us$/, () => '/kontak'],
            [/^\/en\/about-matex$/, () => '/tentang-matex'],
            [/^\/en\/faq$/, () => '/faq'],
            [/^\/en\/search$/, () => '/search'],
          ];

    for (const [pattern, destination] of mappings) {
      const match = current.match(pattern);
      if (match) return destination(match);
    }

    if (locale === 'en-US') return current.startsWith('/en/') ? current : `/en${current}`;
    return current.replace(/^\/en(?=\/|$)/, '') || '/';
  }
}
