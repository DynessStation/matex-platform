import { Component, inject, input, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Product } from '../../interface/product.interface';
import { ProductState } from '../../store/state/product.state';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  class = input<string>();
  iconClass = input<string | null>(null);
  id = input<string>();
  label = input<string>();
  type = input<string>('submit');
  spinner = input<boolean>(true);
  disabled = input<boolean>(false);
  data = input<any>();
  buttonText = input<string | null>(null);
  buttonLink = input<string | null>(null);

  public buttonId: string | null;

  private store = inject(Store);
  product$: Observable<Product[]> = this.store.select(ProductState.productByIds);

  public onClick(id: string) {
    this.buttonId = id;
  }

  ngOnChanges(change: SimpleChanges) {
    if (
      change['data']?.currentValue &&
      typeof change['data']?.currentValue?.redirect_link?.link === 'number'
    ) {
      this.product$.subscribe((res) => {
        res.map((product) => {
          if (product.id === change['data']?.currentValue?.redirect_link?.link) {
            this.data()['product_slug'] = product!.slug;
          }
        });
      });
    }
  }

  getProductSlug(id: number, products: Product[]) {
    let product = products.find((product) => {
      product.id === id;
    });
    return product ? product!.slug : null;
  }
}
