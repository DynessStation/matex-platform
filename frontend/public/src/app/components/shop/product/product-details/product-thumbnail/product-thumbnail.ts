import { Component, input } from '@angular/core';

import { Product, Variation } from '../../../../../shared/interface/product.interface';
import { Option } from '../../../../../shared/interface/theme-option.interface';
import { ProductBundle } from '../widgets/product-bundle/product-bundle';
import { ProductContent } from '../widgets/product-content/product-content';
import { ProductDetails } from '../widgets/product-details/product-details';
import { ProductDetailsTab } from '../widgets/product-details-tab/product-details-tab';
import { ProductInformation } from '../widgets/product-information/product-information';
import { ProductSelectedVariant } from '../widgets/product-selected-variant/product-selected-variant';

@Component({
  selector: 'app-product-thumbnail',
  imports: [
    ProductDetails,
    ProductContent,
    ProductInformation,
    ProductDetailsTab,
    ProductSelectedVariant,
    ProductBundle,
  ],
  templateUrl: './product-thumbnail.html',
  styleUrl: './product-thumbnail.scss',
})
export class ProductThumbnail {
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
