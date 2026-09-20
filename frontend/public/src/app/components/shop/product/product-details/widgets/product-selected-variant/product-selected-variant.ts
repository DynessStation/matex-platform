import { Component, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ShareModal } from '../../../../../../shared/components/modal/share-modal/share-modal';
import { Product, Variation } from '../../../../../../shared/interface/product.interface';
import { Option } from '../../../../../../shared/interface/theme-option.interface';
import { ProductBuyButton } from '../product-buy-button/product-buy-button';

@Component({
  selector: 'app-product-selected-variant',
  imports: [ProductBuyButton, RouterModule],
  templateUrl: './product-selected-variant.html',
  styleUrl: './product-selected-variant.scss',
})
export class ProductSelectedVariant {
  product = input<Product | null>(null);
  option = input<Option | null>();
  selectedVariation = input<Variation | null>(null);

  private modalOpen = inject(NgbModal);

  isVariation(obj: Variation | Product | null): obj is Variation {
    return obj !== null && 'variation_image' in obj;
  }

  openShareModal(product: Product) {
    const modal = this.modalOpen.open(ShareModal, {
      centered: true,
      windowClass: 'theme-modal product-share-modal',
    });
    modal.componentInstance.product = product;
  }
}
