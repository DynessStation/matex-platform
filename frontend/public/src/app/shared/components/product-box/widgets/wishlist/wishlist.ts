import { NgClass } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';

import { Product } from '../../../../interface/product.interface';
import { NotificationService } from '../../../../services/notification.service';
import { AddToWishlist, DeleteWishlist } from '../../../../store/action/wishlist.action';

@Component({
  selector: 'app-wishlist',
  imports: [NgClass],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private store = inject(Store);
  readonly product = input<Product>();
  readonly class = input<string>('');
  private notificationService = inject(NotificationService);

  addToWishlist(product: Product) {
    if (!this.store.selectSnapshot((state) => state.auth?.access_token)) return;

    product.is_wishlist = !product.is_wishlist;

    const action = product.is_wishlist
      ? new AddToWishlist({ product_id: product.id, product })
      : new DeleteWishlist(product.id);

    this.store.dispatch(action).subscribe(() => {
      this.notificationService.alertSubject.next({ type: 'add-wishlist', message: '', product });
    });
  }
}
