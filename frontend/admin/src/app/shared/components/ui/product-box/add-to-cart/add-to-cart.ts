import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, TemplateRef, viewChild } from '@angular/core';

import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IAttributeValue } from '../../../../interface/attribute.interface';
import { ICart, ICartAddOrUpdate } from '../../../../interface/cart.interface';
import { IProduct, ISelectedVariant, IVariation } from '../../../../interface/product.interface';
import { CurrencySymbolPipe } from '../../../../pipe/currency-symbol.pipe';
import { AddToCartAction } from '../../../../store/action/cart.action';
import { CartState } from '../../../../store/state/cart.state';
import { Button } from '../../button/button';

@Component({
  selector: 'app-add-to-cart',
  imports: [TranslateModule, CurrencySymbolPipe, CommonModule, Button],
  templateUrl: './add-to-cart.html',
  styleUrl: './add-to-cart.scss',
})
export class AddToCart {
  private modalService = inject(NgbModal);
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID);

  cartItem$: Observable<ICart[]> = inject(Store).select(CartState.cartItems) as Observable<ICart[]>;

  public cartItem: ICart | null;

  public modalOpen: boolean = false;
  public closeResult: string;
  public product: IProduct;
  public productQty: number = 1;
  public soldOutAttributesIds: number[] = [];
  public attributeValues: number[] = [];
  public variantIds: number[] = [];
  public selectedOptions: ISelectedVariant[] = [];
  public selectedVariation: IVariation | null;

  public totalPrice: number = 0;

  readonly addToCartModal = viewChild<TemplateRef<string>>('addToCartModal');

  constructor() {
    this.cartItem$.subscribe(items => {
      this.cartItem = items.find(item => item?.product?.id == this.product?.id)!;
    });
  }

  async openModal(product: IProduct) {
    this.product = product;
    this.checkVariantAvailability(product);
    this.wholesalePriceCal();
    this.modalOpen = true;
    this.modalService
      .open(this.addToCartModal(), {
        ariaLabelledBy: 'AddToCartModal',
        centered: true,
        windowClass: 'theme-modal modal-lg view-modal',
      })
      .result.then(
        result => {
          `Result ${result}`;
          this.closeResult = `Closed with: ${result}`;
        },
        reason => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        },
      );
  }

  checkVariantAvailability(product: IProduct) {
    this.selectedOptions = [];
    this.attributeValues = [];
    this.selectedVariation = null;

    product?.variations?.forEach(variation => {
      variation?.attribute_values?.filter(attribute_value => {
        if (this.attributeValues.indexOf(attribute_value?.id) === -1)
          this.attributeValues.push(attribute_value?.id);
      });
    });

    // Set cart variant Default
    if (this.cartItem?.variation) {
      this.cartItem?.variation.attribute_values.filter(attribute_val => {
        this.setVariant(this.product.variations, attribute_val);
      });
    }

    if (!this.cartItem) {
      // Set First variant Default
      for (const attribute of product?.attributes) {
        if (this.attributeValues?.length && attribute?.attribute_values?.length) {
          let values: number[] = [];
          for (const value of attribute.attribute_values) {
            if (values.indexOf(value.id) === -1) values.push(value.id);

            if (this.attributeValues.includes(value.id)) {
              this.setVariant(product.variations, value);
              break; // Break out of the inner loop after setting the first variant
            }
          }
        }
      }
    }

    // Set Variation Image
    product.variations?.forEach(variation => {
      let attrValues = variation?.attribute_values?.map(attribute_value => attribute_value?.id);
      product?.attributes.filter(attribute => {
        if (attribute.style == 'image') {
          attribute.attribute_values.filter(attribute_value => {
            if (this.attributeValues.includes(attribute_value.id)) {
              if (attrValues.includes(attribute_value.id)) {
                attribute_value.variation_image = variation.variation_image;
              }
            }
          });
        }
      });
    });
  }

  setVariant(variations: IVariation[], value: IAttributeValue) {
    const index = this.selectedOptions.findIndex(
      item => Number(item.attribute_id) === Number(value?.attribute_id),
    );
    this.soldOutAttributesIds = [];
    if (index === -1) {
      this.selectedOptions.push({
        id: Number(value?.id),
        attribute_id: Number(value?.attribute_id),
      });
    } else {
      this.selectedOptions[index].id = value?.id;
    }
    variations?.forEach(variation => {
      let attrValues = variation?.attribute_values?.map(attribute_value => attribute_value?.id);
      this.variantIds = this.selectedOptions?.map(variants => variants?.id);
      let doValuesMatch =
        attrValues.length === this.selectedOptions.length &&
        attrValues.every(value => this.variantIds.includes(value));
      if (doValuesMatch) {
        this.selectedVariation = variation;
        this.product &&
          (this.product['quantity'] = this.selectedVariation
            ? this.selectedVariation?.quantity
            : this.product?.quantity);
        this.product &&
          (this.product['sku'] = this.selectedVariation
            ? this.selectedVariation?.sku
            : this.product?.sku);
        this.checkStockAvailable();
      }

      if (variation.stock_status == 'out_of_stock') {
        variation?.attribute_values.filter(attr_value => {
          if (attrValues.some(value => this.variantIds.includes(value))) {
            if (attrValues.every(value => this.variantIds.includes(value))) {
              this.soldOutAttributesIds.push(attr_value.id);
            } else if (!this.variantIds.includes(attr_value.id)) {
              this.soldOutAttributesIds.push(attr_value.id);
            }
          } else if (attrValues.length == 1 && attrValues.includes(attr_value.id)) {
            this.soldOutAttributesIds.push(attr_value.id);
          }
        });
      }
    });

    // Set Attribute Value
    this.product?.attributes.filter(attribute => {
      attribute.attribute_values.filter(a_value => {
        if (a_value.id == value.id) {
          attribute.selected_value = a_value.value;
        }
      });
    });
  }

  updateQuantity(qty: number) {
    if (1 > this.productQty + qty) return;
    this.productQty = this.productQty + qty;
    this.wholesalePriceCal();
    this.checkStockAvailable();
  }

  wholesalePriceCal() {
    let wholesale =
      this.product.wholesales.find(
        value => value.min_qty <= this.productQty && value.max_qty >= this.productQty,
      ) || null;
    if (wholesale && this.product.wholesale_price_type == 'fixed') {
      this.totalPrice = this.productQty * wholesale.value;
    } else if (wholesale && this.product.wholesale_price_type == 'percentage') {
      this.totalPrice =
        this.productQty *
        (this.selectedVariation ? this.selectedVariation.sale_price : this.product.sale_price);
      this.totalPrice = this.totalPrice - this.totalPrice * (wholesale.value / 100);
    } else {
      this.totalPrice =
        this.productQty *
        (this.selectedVariation ? this.selectedVariation.sale_price : this.product.sale_price);
    }
  }

  checkStockAvailable() {
    if (this.selectedVariation) {
      this.selectedVariation['stock_status'] =
        this.selectedVariation?.quantity < this.productQty ? 'out_of_stock' : 'in_stock';
    } else {
      this.product['stock_status'] =
        this.product?.quantity < this.productQty ? 'out_of_stock' : 'in_stock';
    }
  }

  addToCart(product: IProduct) {
    const params: ICartAddOrUpdate = {
      product_id: product?.id!,
      product: product!,
      variation_id: this.selectedVariation ? this.selectedVariation?.id! : null,
      variation: this.selectedVariation ? this.selectedVariation! : null,
      quantity: this.productQty,
    };
    this.store.dispatch(new AddToCartAction(params)).subscribe({
      complete: () => {
        this.modalService.dismissAll();
      },
    });
  }

  externalProductLink(link: string) {
    if (isPlatformBrowser(this.platformId)) {
      if (link) {
        window.open(link, '_blank');
      }
    }
  }

  private getDismissReason(reason: ModalDismissReasons): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
}
