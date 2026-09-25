import { AsyncPipe, NgClass } from '@angular/common';
import { afterNextRender, Component, DestroyRef, HostListener, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { combineLatest, Observable } from 'rxjs';

import { CartAddOrUpdate, ICart } from '../../../../interface/cart.interface';
import { Values } from '../../../../interface/setting.interface';
import { Option } from '../../../../interface/theme-option.interface';
import { CurrencySymbolPipe } from '../../../../pipe/currency.pipe';
import { CartService } from '../../../../services/cart.service';
import {
  ClearCart,
  DeleteCart,
  ToggleSidebarCart,
  UpdateCart,
} from '../../../../store/action/cart.action';
import { CartState } from '../../../../store/state/cart.state';
import { SettingState } from '../../../../store/state/setting.state';
import { ThemeOptionState } from '../../../../store/state/theme-option.state';
import { Button } from '../../../button/button';

@Component({
  selector: 'app-cart',
  imports: [AsyncPipe, Button, CurrencySymbolPipe, RouterLink, TranslateModule, AsyncPipe, NgClass],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);

  cartItem$: Observable<ICart[]> = this.store.select(CartState.cartItems);
  cartTotal$: Observable<number> = this.store.select(CartState.cartTotal);
  sidebarCartOpen$: Observable<boolean> = this.store.select(CartState.sidebarCartOpen);
  themeOption$: Observable<Option> = this.store.select(ThemeOptionState.themeOptions);
  setting$: Observable<Values | null> = this.store.select(SettingState.setting);

  style = input<string>('basic');

  public cartStyle: string = 'cart_sidebar';
  public cart: string;
  public shippingFreeAmt: number = 0;
  public cartTotal: number = 0;
  public shippingCal: number = 0;
  public confettiItems = Array.from({ length: 150 }, (_, index) => index);
  public confetti: number = 0;
  public loader: boolean = false;
  public width: number;

  constructor(
    public cartService: CartService,
    private modal: NgbModal,
  ) {
    this.themeOption$.subscribe((option) => {
      this.cartStyle = option?.general?.cart_style;
      this.cart = this.cartStyle;
    });

    afterNextRender(() => {
      combineLatest([this.cartTotal$, this.setting$])
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(([total, setting]) => {
          this.shippingFreeAmt = Number(setting?.general?.min_order_free_shipping) || 0;
          this.cartTotal = total;
          this.shippingCal =
            this.shippingFreeAmt > 0 ? (this.cartTotal * 100) / this.shippingFreeAmt : 0;
          if (this.shippingCal > 100) {
            this.shippingCal = 100;
            if (this.confetti == 0) {
              this.confetti = 1;
              setTimeout(() => {
                this.confetti = 2;
              }, 4500);
            }
          } else {
            this.confetti = 0;
          }
        });
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(_event: UIEvent) {
    if (this.cartStyle === 'cart_mini') {
      const width = window.innerWidth;

      this.cart = width <= 767 ? 'cart_sidebar' : 'cart_mini';
    }
  }

  cartToggle(value: boolean) {
    this.store.dispatch(new ToggleSidebarCart(value));
  }

  updateQuantity(item: ICart, qty: number) {
    const params: CartAddOrUpdate = {
      id: item?.id,
      product_id: item?.product?.id,
      product: item?.product ? item?.product : null,
      variation_id: item?.variation_id ? item?.variation_id : null,
      variation: item?.variation ? item?.variation : null,
      quantity: qty,
    };
    this.store.dispatch(new UpdateCart(params));
    this.cartService.updateQty();
  }

  delete(id: number) {
    this.store.dispatch(new DeleteCart(id));
  }

  clearCart() {
    this.store.dispatch(new ClearCart());
  }
}
