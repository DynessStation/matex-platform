import { Component, inject, input, output, signal, SimpleChanges } from '@angular/core';

import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Attribute, AttributeValue } from '../../../../interface/attribute.interface';
import { Cart } from '../../../../interface/cart.interface';
import { Product, SelectedVariant, Variation } from '../../../../interface/product.interface';
import { CartState } from '../../../../store/state/cart.state';
import { Button } from '../../../button/button';

@Component({
  selector: 'app-product-box-variant-attributes',
  imports: [NgbTooltip, Button, TranslateModule],
  templateUrl: './product-box-variant-attributes.html',
  styleUrl: './product-box-variant-attributes.scss',
})
export class ProductBoxVariantAttributes {
  product = input<Product>();
  attributes = input<Attribute[]>([]);
  isAllVariantStyleDropdown = input<boolean>(false);
  showPrice = input<boolean>();
  showVariableType = input<string[]>([
    'color',
    'rectangle',
    'circle',
    'radio',
    'dropdown',
    'image',
  ]);

  selectVariation = output<Variation>();
  updatedProduct = signal<Product | undefined>(undefined);

  private store = inject(Store);
  cartItem$: Observable<Cart[]> = this.store.select(CartState.cartItems);

  public cartItem: Cart | null;
  public productQty: number = 1;
  public attributeValues: number[] = [];
  public variantIds: number[] = [];
  public hoverVariantIds: number[] = [];
  public soldOutAttributesIds: number[] = [];
  public selectedOptions: SelectedVariant[] = [];
  public selectedVariation: Variation | null;
  public hoverVariation: Variation | null;
  public break: boolean = false;

  constructor(private modal: NgbModal) {}

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      this.cartItem$.subscribe((items) => {
        this.cartItem = items?.find((item) => item.product.id == this.product()?.id)!;
      });

      this.checkVariantAvailability(this.product()!);
    }, 0);

    if (changes['showPrice']?.currentValue) {
      this.product()?.attributes.forEach((attribute) => {
        attribute.attribute_values.forEach((value) => {
          this.product()?.variations.forEach((variation) => {
            variation.attribute_values.forEach((att) => {
              if (att.id !== value.id) value['price'] = variation.price;
              value['sale_price'] = variation.sale_price;
            });
          });
        });
      });
    }
  }

  checkVariantAvailability(product: Product | undefined) {
    if (!product) return; // 🔒 Prevent undefined product
    if (!Array.isArray(product.attributes)) return; // 🔒 Prevent undefined attributes
    if (!Array.isArray(product.variations)) return; // 🔒 Prevent undefined variations

    this.selectedOptions = [];
    this.attributeValues = [];
    this.selectedVariation = null;
    this.hoverVariation = null;

    // Collect attributeValues safely
    product.variations.forEach((variation) => {
      variation?.attribute_values?.forEach((attribute_value) => {
        if (attribute_value?.id && !this.attributeValues.includes(attribute_value.id)) {
          this.attributeValues.push(attribute_value.id);
        }
      });
    });

    // Set cart variant default
    if (this.cartItem?.variation) {
      this.cartItem.variation.attribute_values?.forEach((attribute_val) => {
        this.setVariant(product.variations ?? [], attribute_val);
      });
    }

    // Set first variant default
    if (!this.cartItem) {
      for (const attribute of product.attributes ?? []) {
        if (Array.isArray(attribute.attribute_values)) {
          for (const value of attribute.attribute_values) {
            if (this.attributeValues.includes(value.id)) {
              this.setVariant(product.variations ?? [], value);
              if (this.break) break;
            }
          }
        }
      }
    }

    // Set variation image
    product.variations.forEach((variation) => {
      const attrValues = variation?.attribute_values?.map((av) => av.id) ?? [];
      product.attributes.forEach((attribute) => {
        if (['image', 'image_price'].includes(attribute.style)) {
          attribute.attribute_values?.forEach((attribute_value) => {
            if (
              this.attributeValues.includes(attribute_value.id) &&
              attrValues.includes(attribute_value.id)
            ) {
              attribute_value.variation_image = variation.variation_image;
              attribute_value.name = variation.name;
              attribute_value.sale_price = variation.sale_price;
            }
          });
        }
      });
    });
  }

  setVariant(variations: Variation[], value: AttributeValue, event?: string) {
    const index = this.selectedOptions.findIndex(
      (item) => Number(item.attribute_id) === Number(value?.attribute_id),
    );

    this.soldOutAttributesIds = [];

    // Update selectedOptions
    if (index === -1) {
      this.selectedOptions.push({
        id: Number(value?.id),
        attribute_id: Number(value?.attribute_id),
      });
    } else {
      this.selectedOptions[index].id = value?.id;
    }

    const variantIds = this.selectedOptions.map((v) => v.id);
    this.variantIds = variantIds;

    // Get product safely from signal
    const product = this.product();
    if (!product) return;

    // let selectedVariation: Variation | undefined;

    // Iterate through all variations
    for (const variation of variations ?? []) {
      const attrValues = variation?.attribute_values?.map((av) => av.id) ?? [];

      const doValuesMatch =
        attrValues.length === this.selectedOptions.length &&
        attrValues.every((v) => variantIds.includes(v));

      if (doValuesMatch) {
        this.selectedVariation = variation;

        // Build updated product safely
        const updatedProduct: Product = {
          ...product,
          quantity: variation?.quantity ?? product.quantity,
          sku: variation?.sku ?? product.sku,
          sale_price: variation?.sale_price ?? product.sale_price,
        };

        this.updatedProduct.set(updatedProduct);

        // Update stock
        this.checkStockAvailable();
      }

      // Handle sold-out variations
      if (variation.stock_status === 'out_of_stock' || !variation.status || !product.status) {
        variation.attribute_values.forEach((attrValue) => {
          if (attrValues.some((v) => variantIds.includes(v))) {
            if (attrValues.every((v) => variantIds.includes(v))) {
              this.soldOutAttributesIds.push(attrValue.id);
            } else if (!variantIds.includes(attrValue.id)) {
              this.soldOutAttributesIds.push(attrValue.id);
            }
          } else if (attrValues.length === 1 && attrValues.includes(attrValue.id)) {
            this.soldOutAttributesIds.push(attrValue.id);
          }
        });
      }
    }

    // Update selected attribute labels
    product?.attributes?.forEach((attribute) => {
      attribute.attribute_values.forEach((a_value) => {
        if (a_value.id === value.id) {
          attribute.selected_value = a_value.value;
        }
      });
    });

    // Update availability flags
    this.break =
      !!this.selectedVariation &&
      !!this.selectedVariation.status &&
      this.selectedVariation.stock_status === 'in_stock';

    if (event !== 'hover') {
      this.hoverVariantIds = variantIds;
      this.hoverVariation = this.selectedVariation;
    }

    if (this.selectedVariation) {
      this.selectVariation.emit(this.selectedVariation);
    }
  }

  checkStockAvailable() {
    if (this.selectedVariation) {
      this.selectedVariation['stock_status'] =
        this.selectedVariation?.quantity < this.productQty ? 'out_of_stock' : 'in_stock';
    } else {
      const product = this.product();
      if (!product) return;

      const updatedProduct = {
        ...product,
        stock_status: product.quantity < this.productQty ? 'out_of_stock' : 'in_stock',
      };

      // Assuming you have a writable signal for updated product
      this.updatedProduct.set(updatedProduct);
    }
  }

  removeVariation() {
    this.variantIds = this.hoverVariantIds;
    this.selectedVariation = this.hoverVariation;
    if (this.selectedVariation) {
      this.selectVariation.emit(this.selectedVariation);
    }
  }
}
