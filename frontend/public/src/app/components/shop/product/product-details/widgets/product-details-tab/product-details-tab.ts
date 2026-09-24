import { KeyValuePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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

  constructor(private sanitizer: DomSanitizer) {}

  get isEnglish() { return this.router.url === '/en' || this.router.url.startsWith('/en/'); }
  get specifications(): Record<string, unknown> {
    const value = this.product()?.specifications;
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } }
    return {};
  }

  getTrustedHtml(data?: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(data!);
  }
}
