import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';

import { Product } from '../interface/product.interface';

@Injectable({ providedIn: 'root' })
export class RecentProductService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly limit = 8;

  get(): Product[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const value = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(value) ? value.slice(0, this.limit) : [];
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }

  private get storageKey() {
    const locale = this.router.url === '/en' || this.router.url.startsWith('/en/') ? 'en' : 'id';
    return `matex_recent_products_${locale}`;
  }

  add(product: Product): void {
    if (!isPlatformBrowser(this.platformId) || !product?.id) return;
    const snapshot = {
      ...product,
      description: undefined,
      specifications: undefined,
      related_products: [],
      cross_sell_products: [],
      product_galleries: [],
    } as Product;
    const products = [snapshot, ...this.get().filter((item) => item.id !== product.id)].slice(
      0,
      this.limit,
    );
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(products));
    } catch {
      // Browsing remains functional when storage is unavailable or full.
    }
  }
}
