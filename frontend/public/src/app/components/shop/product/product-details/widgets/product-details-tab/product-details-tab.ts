import { KeyValuePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Product } from '../../../../../../shared/interface/product.interface';

@Component({
  selector: 'app-product-details-tab',
  imports: [NgbModule, KeyValuePipe],
  templateUrl: './product-details-tab.html',
  styleUrl: './product-details-tab.scss',
})
export class ProductDetailsTab {
  product = input<Product | null>(null);
  private router = inject(Router);

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
  get specifications(): Record<string, string> {
    const value = this.product()?.specifications;
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return this.normalizeSpecifications(JSON.parse(value));
      } catch {
        return { [this.isEnglish ? 'Information' : 'Informasi']: value };
      }
    }
    return this.normalizeSpecifications(value);
  }

  private normalizeSpecifications(value: unknown): Record<string, string> {
    if (Array.isArray(value)) {
      return Object.fromEntries(
        value
          .map((item: any, index) => [
            String(
              item?.label ??
                item?.key ??
                `${this.isEnglish ? 'Specification' : 'Spesifikasi'} ${index + 1}`,
            ),
            String(item?.value ?? item?.text ?? ''),
          ])
          .filter(([, itemValue]) => itemValue),
      );
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([key, itemValue]) => [
            key === 'text' ? (this.isEnglish ? 'Information' : 'Informasi') : key,
            typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue ?? ''),
          ])
          .filter(([, itemValue]) => itemValue),
      );
    }
    return {};
  }
}
