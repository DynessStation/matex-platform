import { NgClass } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';

import { Product } from '../../../interface/product.interface';
import { NotificationService } from '../../../services/notification.service';
import { AddToWishlist, DeleteWishlist } from '../../../store/action/wishlist.action';
import { ProductCartButton } from '../../product-box/widgets/product-cart-button/product-cart-button';

export interface AlertPayload {
  type: string | null;
  message: string | null;
  product?: Product;
}

@Component({
  selector: 'app-alert',
  imports: [ProductCartButton, NgClass],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class Alert {
  private notificationService = inject(NotificationService);
  private store = inject(Store);

  type = input<string>('');
  public product: Product | null = null;

  public showAlert = false;
  public alertTitle = '';
  public alertClass = '';
  public timeoutId: any;
  private isHovering = false;

  public alert: AlertPayload = {
    type: null,
    message: null,
  };

  constructor() {
    this.notificationService.alertSubject.subscribe((alert) => {
      this.alert = <AlertPayload>alert;

      if (!alert || !alert.product) return;
      this.product = alert.product;
      this.showPopup(this.product);
    });
  }

  showPopup(product: Product) {
    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.alertTitle = product.is_wishlist
      ? 'Product Added Successfully'
      : 'Product Removed Successfully';
    this.alertClass = product.is_wishlist ? 'added' : 'removed';
    setTimeout(() => {
      this.showAlert = true;
    });

    this.startAutoCloseTimer();
  }

  private startAutoCloseTimer() {
    this.timeoutId = setTimeout(() => {
      if (!this.isHovering) {
        this.closeAlert();
      } else {
        this.startAutoCloseTimer();
      }
    }, 3000);
  }

  onHover(state: boolean) {
    this.isHovering = state;
    if (!state) {
      this.startAutoCloseTimer();
    }
  }

  closeAlert() {
    this.showAlert = false;
    this.alertClass = '';
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

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

  ngOnDestroy() {
    this.notificationService.notification = true;
  }
}
