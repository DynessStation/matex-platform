import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { SettingState } from '../../../../../../shared/store/state/setting.state';

@Component({
  selector: 'app-collection-price-filter',
  standalone: true,
  imports: [],
  templateUrl: './collection-price-filter.html',
  styleUrl: './collection-price-filter.scss',
})
export class CollectionPriceFilter {
  filter = input<Params>();
  private selectedCurrency = inject(Store).selectSignal(SettingState.selectedCurrency);

  private readonly idrPrices = [
    {
      id: 1,
      minPrice: 0,
      maxPrice: 250000,
      value: '0-250000',
    },
    {
      id: 2,
      minPrice: 250001,
      maxPrice: 500000,
      value: '250001-500000',
    },
    {
      id: 3,
      minPrice: 500001,
      maxPrice: 1000000,
      value: '500001-1000000',
    },
    {
      id: 4,
      minPrice: 1000001,
      maxPrice: 2000000,
      value: '1000001-2000000',
    },
    {
      id: 5,
      minPrice: 2000001,
      maxPrice: 2000000000,
      value: '2000001-2000000000',
    },
  ];
  private readonly usdPrices = [
    { id: 1, minPrice: 0, maxPrice: 25, value: '0-25' },
    { id: 2, minPrice: 25.01, maxPrice: 50, value: '25.01-50' },
    { id: 3, minPrice: 50.01, maxPrice: 100, value: '50.01-100' },
    { id: 4, minPrice: 100.01, maxPrice: 200, value: '100.01-200' },
    { id: 5, minPrice: 200.01, maxPrice: 999999, value: '200.01-999999' },
  ];

  get prices() {
    return this.currencyCode === 'USD' ? this.usdPrices : this.idrPrices;
  }

  public selectedPrices: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }

  priceLabel(price: { minPrice?: number; maxPrice?: number }) {
    const currency = (value: number) =>
      new Intl.NumberFormat(this.isEnglish ? 'en-US' : 'id-ID', {
        style: 'currency',
        currency: this.currencyCode,
        maximumFractionDigits: this.currencyCode === 'IDR' ? 0 : 2,
      }).format(value);
    if (price === this.prices[this.prices.length - 1])
      return `${this.isEnglish ? 'Above' : 'Di atas'} ${currency(price.minPrice ?? 0)}`;
    return `${currency(price.minPrice ?? 0)} – ${currency(price.maxPrice ?? 0)}`;
  }

  private get currencyCode() {
    const requestedCode = this.route.snapshot.queryParamMap.get('currency')?.toUpperCase();
    if (requestedCode === 'IDR' || requestedCode === 'USD') return requestedCode;
    return this.selectedCurrency()?.code?.toUpperCase() || 'IDR';
  }

  ngOnChanges() {
    this.selectedPrices = this.filter()!['price'] ? this.filter()!['price'].split(',') : [];
  }

  applyFilter(event: Event) {
    const index = this.selectedPrices.indexOf((<HTMLInputElement>event?.target)?.value); // checked and unchecked value

    if ((<HTMLInputElement>event?.target)?.checked)
      this.selectedPrices.push((<HTMLInputElement>event?.target)?.value); // push in array cheked value
    else this.selectedPrices.splice(index, 1); // removed in array unchecked value

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        price: this.selectedPrices.length ? this.selectedPrices?.join(',') : null,
        page: 1,
      },
      queryParamsHandling: 'merge', // preserve the existing query params in the route
      skipLocationChange: false, // do trigger navigation
    });
  }

  // check if the item are selected
  checked(item: string) {
    if (this.selectedPrices?.indexOf(item) != -1) {
      return true;
    }
    return false;
  }
}
