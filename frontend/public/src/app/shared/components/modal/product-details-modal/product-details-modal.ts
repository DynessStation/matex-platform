import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, inject, Input, PLATFORM_ID, viewChild } from '@angular/core';

import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import SwiperCore from 'swiper';
import { Autoplay, Navigation, Pagination, Thumbs } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';

import { ProductContent } from '../../../../components/shop/product/product-details/widgets/product-content/product-content';
import { ProductDetails } from '../../../../components/shop/product/product-details/widgets/product-details/product-details';
import { Cart, CartAddOrUpdate } from '../../../interface/cart.interface';
import { Product, Variation } from '../../../interface/product.interface';
import { AddToCart } from '../../../store/action/cart.action';
import { CartState } from '../../../store/state/cart.state';
import { Button } from '../../button/button';

SwiperCore.use([Navigation, Pagination, Autoplay, Thumbs]);

@Component({
  selector: 'app-product-details-modal',
  imports: [NgbModule, ProductContent, Button, ProductDetails, TranslateModule],
  templateUrl: './product-details-modal.html',
  styleUrl: './product-details-modal.scss',
})
export class ProductDetailsModal {
  modal = inject(NgbActiveModal);
  private store = inject(Store);
  private platformId = inject<Object>(PLATFORM_ID);

  cartItem$: Observable<Cart[]> = inject(Store).select(CartState.cartItems);

  @Input() product: Product;

  readonly swiperContainer = viewChild<ElementRef>('swiperContainer');
  readonly swiperContainer2 = viewChild<ElementRef>('swiperContainer2');

  public modalOpen: boolean = false;
  public videType = ['video/mp4', 'video/webm', 'video/ogg'];
  public audioType = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
  public videoType = ['mp4', 'mov', 'avi'];
  public audio = ['mpeg', 'wav', 'ogg', 'mp3'];
  public cartItem: Cart | null;
  public productQty: number = 1;
  public selectedVariation: Variation;
  public totalPrice: number = 0;
  public activeSlide: string = '0';

  public isBrowser: boolean;
  private thumbSwiper!: SwiperCore;

  public swiperConfig: SwiperOptions = {
    spaceBetween: 15,
    slidesPerView: 3,
    freeMode: true,
    watchSlidesProgress: true,
    breakpoints: {
      0: {
        slidesPerView: 2,
      },
      420: {
        slidesPerView: 3,
      },
    },
  };
  public swiperConfig2: SwiperOptions = {
    loop: true,
    spaceBetween: 0,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  ngOnInit() {
    this.cartItem$.subscribe((items) => {
      this.cartItem = items?.find((item) => item?.product?.id == this.product?.id) || null;
    });
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  selectedVariant(variant: Variation) {
    this.selectedVariation = variant;
  }

  updateQuantity(qty: number) {
    if (1 > this.productQty + qty) return;
    this.productQty = this.productQty + qty;
  }

  addToCart(product: Product) {
    if (product) {
      const params: CartAddOrUpdate = {
        id:
          this.cartItem &&
            this.selectedVariation &&
            this.cartItem?.variation &&
            this.selectedVariation?.id == this.cartItem?.variation?.id
            ? this.cartItem.id
            : null,
        product_id: product?.id!,
        product: product ? product : null,
        variation: this.selectedVariation ? this.selectedVariation : null,
        variation_id: this.selectedVariation?.id ? this.selectedVariation?.id! : null,
        quantity: this.productQty,
      };
      this.store.dispatch(new AddToCart(params)).subscribe({
        complete: () => {
          this.modal.close();
        },
      });
    }
  }

  ngAfterViewInit() {
    const thumbEl = this.swiperContainer();
    if (thumbEl) {
      this.thumbSwiper = new SwiperCore(thumbEl.nativeElement, this.swiperConfig);
    }

    const mainEl = this.swiperContainer2();
    if (mainEl) {
      new SwiperCore(mainEl.nativeElement, {
        ...this.swiperConfig2,
        thumbs: {
          swiper: this.thumbSwiper,
        },
      });
    }
  }
}
