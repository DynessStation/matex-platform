import { inject, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Product } from '../interface/product.interface';
import { SettingState } from '../store/state/setting.state';

@Pipe({
  name: 'productPrice',
  standalone: true,
  pure: false,
})
export class ProductPricePipe implements PipeTransform {
  private router = inject(Router);
  private selectedCurrency = inject(Store).selectSignal(SettingState.selectedCurrency);

  transform(product: Product | null | undefined, mode: 'amount' | 'compare' = 'amount'): string {
    const requestedCode = String(
      this.router.parseUrl(this.router.url).queryParams['currency'] ?? '',
    ).toUpperCase();
    const selectedCode =
      (requestedCode === 'IDR' || requestedCode === 'USD' ? requestedCode : null) ??
      this.selectedCurrency()?.code?.toUpperCase() ??
      product?.currency ??
      'IDR';
    const consumerPrices = (product?.prices ?? []).filter((price) => price.type === 'end_user');
    const selectedPrice =
      consumerPrices.find((price) => price.currency.toUpperCase() === selectedCode) ??
      consumerPrices.find((price) => price.currency.toUpperCase() === 'IDR') ??
      consumerPrices[0];
    const code = selectedPrice?.currency || product?.currency || selectedCode;
    const fallbackCompare =
      Number(product?.price) !== Number(product?.sale_price) ? product?.price : null;
    const value =
      mode === 'compare'
        ? (selectedPrice?.compare_at ?? fallbackCompare)
        : (selectedPrice?.amount ?? product?.sale_price ?? 0);
    if (value == null) return '';

    return new Intl.NumberFormat(this.isEnglish ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'IDR' ? 0 : 2,
      maximumFractionDigits: code === 'IDR' ? 0 : 2,
    }).format(Number(value) || 0);
  }

  private get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
}
