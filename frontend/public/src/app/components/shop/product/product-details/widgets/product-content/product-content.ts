import { Component, effect, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { DeliveryReturnModal } from '../../../../../../shared/components/modal/delivery-return-modal/delivery-return-modal';
import { QuestionModal } from '../../../../../../shared/components/modal/question-modal/question-modal';
import { SizeChartModal } from '../../../../../../shared/components/modal/size-chart-modal/size-chart-modal';
import { Compare } from '../../../../../../shared/components/product-box/widgets/compare/compare';
import { Wishlist } from '../../../../../../shared/components/product-box/widgets/wishlist/wishlist';
import { VariantAttributes } from '../../../../../../shared/components/variant-attributes/variant-attributes';
import { Timer } from '../../../../../../shared/components/widgets/timer/timer';
import { Attachment } from '../../../../../../shared/interface/attachment.interface';
import { Cart, CartAddOrUpdate } from '../../../../../../shared/interface/cart.interface';
import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { Values } from '../../../../../../shared/interface/setting.interface';
import { Option } from '../../../../../../shared/interface/theme-option.interface';
import { CurrencySymbolPipe } from '../../../../../../shared/pipe/currency.pipe';
import { AddToCart } from '../../../../../../shared/store/action/cart.action';
import { CartState } from '../../../../../../shared/store/state/cart.state';
import { SettingState } from '../../../../../../shared/store/state/setting.state';
import { ThemeOptionState } from '../../../../../../shared/store/state/theme-option.state';
import { ProductWholesales } from '../product-wholesales/product-wholesales';

@Component({
  selector: 'app-product-content',
  imports: [
    VariantAttributes,
    ProductWholesales,
    CurrencySymbolPipe,
    Timer,
    Wishlist,
    Compare,
    TranslateModule,
  ],
  templateUrl: './product-content.html',
  styleUrl: './product-content.scss',
})
export class ProductContent {
  private store = inject(Store);

  setting$: Observable<Values | null> = this.store.select(SettingState.setting);
  cartItem$: Observable<Cart[]> = this.store.select(CartState.cartItems);
  themeOptions$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  product = input<Product | null>(null);
  option = input<Option | null>();
  variant_hover = input<boolean>(true);

  selectedVariant = output<Variation>();

  public selectedVariation: Variation | null;
  public productQty: number = 1;
  public shippingFreeAmt: number = 0;
  public totalPrice: number = 0;
  public cartItem: Cart | null;
  public policy: string;

  constructor(
    private router: Router,
    private modal: NgbModal,
  ) {
    this.setting$.subscribe(
      (setting) => (this.shippingFreeAmt = setting?.general?.min_order_free_shipping!),
    );

    this.themeOptions$.subscribe((option) => {
      this.policy = option?.product?.shipping_and_return;
    });

    effect(() => {
      const product = this.product();
      if (product) {
        this.selectedVariation = null;
        this.productQty = 1;
        this.wholesalePriceCal();
      }
    });

    this.cartItem$.subscribe((items) => {
      const currentProduct = this.product();
      if (!currentProduct) return;

      this.cartItem =
        items.find((item) => {
          if (item.variation && item.variation_id) {
            return currentProduct.variations.some((v) => v.id === item.variation_id);
          }
          return item.product.id === currentProduct.id;
        }) || null;
    });
  }

  ngOnInit() {
    this.wholesalePriceCal();
  }

  selectVariation(variation: Variation) {
    if (variation) {
      this.selectedVariation = variation;
      this.selectedVariant.emit(this.selectedVariation);
    }
  }

  updateQuantity(qty: number) {
    if (1 > this.productQty + qty) return;
    this.productQty = this.productQty + qty;

    this.wholesalePriceCal();
  }

  externalProductLink(link: string) {
    if (link) {
      window.open(link, '_blank');
    }
  }

  addToCart(product: Product, buyNow?: boolean) {
    if (product) {
      const params: CartAddOrUpdate = {
        id:
          this.cartItem &&
          this.selectedVariation &&
          this.cartItem?.variation &&
          this.selectedVariation?.id == this.cartItem?.variation?.id
            ? this.cartItem.id
            : null,
        product_id: product?.id,
        product: product ? product : null,
        variation: this.selectedVariation ? this.selectedVariation : null,
        variation_id: this.selectedVariation?.id ? this.selectedVariation?.id : null,
        quantity: this.productQty,
      };

      this.store.dispatch(new AddToCart(params)).subscribe({
        complete: () => {
          if (buyNow) {
            void this.router.navigate(['/checkout']);
          }
        },
      });
    }
  }

  wholesalePriceCal() {
    let wholesale =
      this.product()?.wholesales.find(
        (value) => value.min_qty <= this.productQty && value.max_qty >= this.productQty,
      ) || null;
    if (wholesale && this.product()?.wholesale_price_type == 'fixed') {
      this.totalPrice = this.productQty * wholesale.value;
    } else if (wholesale && this.product()?.wholesale_price_type == 'percentage') {
      this.totalPrice =
        this.productQty *
        (this.selectedVariation ? this.selectedVariation.sale_price : this.product()?.sale_price!);
      this.totalPrice = this.totalPrice - this.totalPrice * (wholesale.value / 100);
    } else {
      this.totalPrice =
        this.productQty *
        (this.selectedVariation ? this.selectedVariation.sale_price : this.product()?.sale_price!);
    }
  }

  openModal(type: string, value: Attachment | string | Product) {
    if (type == 'sizeChart') {
      const sizeChart = this.modal.open(SizeChartModal, {
        size: 'lg',
        centered: true,
        windowClass: 'theme-modal size-chart',
      });
      sizeChart.componentInstance.image = value;
    } else if (type == 'delivery') {
      const deliveryModal = this.modal.open(DeliveryReturnModal, {
        centered: true,
        windowClass: 'theme-modal delivery-return-modal',
      });
      deliveryModal.componentInstance.policy = value;
    } else if (type == 'question') {
      const questionModal = this.modal.open(QuestionModal, {
        centered: true,
        windowClass: 'theme-modal ask-question-modal',
      });
      questionModal.componentInstance.product = value;
    }
  }
}
