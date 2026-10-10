import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { combineLatest, map, Observable } from 'rxjs';

import { ProductBox } from '../../../../../../shared/components/product-box/product-box';
import { Product } from '../../../../../../shared/interface/product.interface';
import { ProductState } from '../../../../../../shared/store/state/product.state';

@Component({
  selector: 'app-related-product',
  imports: [ProductBox, AsyncPipe],
  templateUrl: './related-product.html',
  styleUrl: './related-product.scss',
})
export class RelatedProduct {
  product = input<Product>();

  private store = inject(Store);
  private router = inject(Router);
  relatedProduct$: Observable<Product[]> = this.store.select(ProductState.relatedProducts);

  public matchedRelatedProducts$: Observable<Product[]> = combineLatest([
    toObservable(this.product),
    this.relatedProduct$,
  ]).pipe(
    map(([product, products]) => {
      return (products ?? []).filter((item) => item.id !== product?.id).slice(0, 8);
    }),
  );

  get isEnglish() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
}
