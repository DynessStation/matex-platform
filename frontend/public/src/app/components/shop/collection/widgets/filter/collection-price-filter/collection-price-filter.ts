import { Component, input } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

@Component({
  selector: 'app-collection-price-filter',
  standalone: true,
  imports: [],
  templateUrl: './collection-price-filter.html',
  styleUrl: './collection-price-filter.scss',
})
export class CollectionPriceFilter {
  filter = input<Params>();

  public prices = [
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
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value);
    if (price.maxPrice === 2000000000)
      return `${this.isEnglish ? 'Above' : 'Di atas'} ${currency(price.minPrice ?? 0)}`;
    return `${currency(price.minPrice ?? 0)} – ${currency(price.maxPrice ?? 0)}`;
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
