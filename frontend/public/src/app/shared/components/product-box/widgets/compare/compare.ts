import { Component, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Product } from '../../../../interface/product.interface';
import { AddToCompare } from '../../../../store/action/compare.action';
import { CompareState } from '../../../../store/state/compare.state';

@Component({
  selector: 'app-compare',
  imports: [RouterModule],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
})
export class Compare {
  private store = inject(Store);

  compareItems$: Observable<Product[]> = inject(Store).select(CompareState.compareItems);

  readonly product = input<Product>();
  readonly text = input<string>('');

  addToCompare(product: Product) {
    this.store.dispatch(new AddToCompare({ product: product }));
  }
}
