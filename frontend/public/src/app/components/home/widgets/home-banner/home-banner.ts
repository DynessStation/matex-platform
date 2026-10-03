import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { BannerLink } from '../../../../shared/interface/core.interface';

@Component({
  selector: 'app-home-banner',
  imports: [RouterLink],
  templateUrl: './home-banner.html',
  styleUrl: './home-banner.scss',
})
export class HomeBanner {
  private readonly router = inject(Router);

  image = input<BannerLink>();
  className = input<string | null>(null);
  bgImage = input<boolean>(false);
  imageClass = input<string | null>('img-fluid');

  get internalTarget(): string {
    const banner = this.image();
    const value = banner?.link?.trim() ?? '';

    if (banner?.redirection_type === 'internal') {
      return value.startsWith('/') ? value : `/${value}`;
    }

    const english = this.router.url === '/en' || this.router.url.startsWith('/en/');
    if (banner?.redirection_type === 'product') {
      return `${english ? '/en/product' : '/produk'}/${value}`;
    }
    if (banner?.redirection_type === 'category') {
      return `${english ? '/en/category' : '/kategori'}/${value}`;
    }

    return '/';
  }
}
