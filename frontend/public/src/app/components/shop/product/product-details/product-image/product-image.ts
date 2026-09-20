import { Component, input } from '@angular/core';

import { Product, Variation } from '../../../../../shared/interface/product.interface';
import { Option } from '../../../../../shared/interface/theme-option.interface';
import { PaymentOption } from '../widgets/payment-option/payment-option';
import { ProductBundle } from '../widgets/product-bundle/product-bundle';
import { ProductContent } from '../widgets/product-content/product-content';
import { ProductDeliveryInformation } from '../widgets/product-delivery-information/product-delivery-information';
import { ProductDetails } from '../widgets/product-details/product-details';
import { ProductDetailsTab } from '../widgets/product-details-tab/product-details-tab';
import { ProductInformation } from '../widgets/product-information/product-information';
import { ProductSelectedVariant } from '../widgets/product-selected-variant/product-selected-variant';
import { ProductSocialShare } from '../widgets/product-social-share/product-social-share';

@Component({
  selector: 'app-product-image',
  imports: [
    ProductDetails,
    ProductContent,
    ProductInformation,
    ProductDeliveryInformation,
    PaymentOption,
    ProductSocialShare,
    ProductSelectedVariant,
    ProductDetailsTab,
    ProductBundle,
  ],
  templateUrl: './product-image.html',
  styleUrl: './product-image.scss',
})
export class ProductImage {
  product = input<Product | null>(null);
  option = input<Option | null>();
  layout = input<string>();

  public videType = ['video/mp4', 'video/webm', 'video/ogg'];
  public audioType = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
  public selectedVariation: Variation;

  selectedVariant(variant: Variation) {
    this.selectedVariation = variant;
  }
}
