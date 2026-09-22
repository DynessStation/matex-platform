import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Language } from '../../../shared/components/header/widgets/language/language';
import { PublicPageContextService } from '../../../shared/services/public-page-context.service';

@Component({
  selector: 'app-matex-header',
  imports: [Language, RouterLink, RouterLinkActive],
  templateUrl: './matex-header.html',
  styleUrl: './matex-header.scss',
})
export class MatexHeader {
  private publicPageContext = inject(PublicPageContextService);

  readonly menuOpen = signal(false);

  readonly isEnglish = computed(() => this.publicPageContext.page()?.locale === 'en-US');

  readonly homePath = computed(() => (this.isEnglish() ? '/en' : '/'));

  readonly catalogPath = computed(() => (this.isEnglish() ? '/en/products' : '/produk'));

  readonly contactPath = computed(() => (this.isEnglish() ? '/en/contact-us' : '/kontak'));

  readonly navigation = computed(() =>
    this.isEnglish()
      ? [
          { label: 'Home', path: '/en', exact: true },
          { label: 'About Us', path: '/en/about-us', exact: false },
          { label: 'Products', path: '/en/products', exact: false },
          { label: 'News', path: '/en/news', exact: false },
          { label: 'Contact', path: '/en/contact-us', exact: false },
        ]
      : [
          { label: 'Beranda', path: '/', exact: true },
          { label: 'Tentang Kami', path: '/tentang-kami', exact: false },
          { label: 'Produk', path: '/produk', exact: false },
          { label: 'Berita', path: '/berita', exact: false },
          { label: 'Kontak', path: '/kontak', exact: false },
        ],
  );

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
