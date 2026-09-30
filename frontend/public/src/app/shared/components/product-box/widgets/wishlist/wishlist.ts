import { AsyncPipe, NgClass } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Product } from '../../../../interface/product.interface';
import { NotificationService } from '../../../../services/notification.service';
import { AddToWishlist, DeleteWishlist } from '../../../../store/action/wishlist.action';
import { WishlistState } from '../../../../store/state/wishlist.state';

@Component({
  selector: 'app-wishlist',
  imports: [AsyncPipe, NgClass],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private store = inject(Store);
  readonly product = input<Product>();
  readonly class = input<string>('');
  private notificationService = inject(NotificationService);
  wishlistIds$: Observable<number[]> = this.store.select(WishlistState.wishlistIds);

  addToWishlist(product: Product) {
    const wishlistIds = this.store.selectSnapshot(WishlistState.wishlistIds) || [];
    const isWishlisted = wishlistIds.includes(product.id);
    product.is_wishlist = !isWishlisted;

    const action = !isWishlisted
      ? new AddToWishlist({ product_id: product.id, product })
      : new DeleteWishlist(product.id);

    this.store.dispatch(action).subscribe(() => {
      this.notificationService.alertSubject.next({ type: 'add-wishlist', message: '', product });
    });
  }
}
