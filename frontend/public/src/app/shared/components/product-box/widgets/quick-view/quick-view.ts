import { Component, inject, input } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Product } from '../../../../interface/product.interface';
import { ProductDetailsModal } from '../../../modal/product-details-modal/product-details-modal';

@Component({
  selector: 'app-quick-view',
  imports: [],
  templateUrl: './quick-view.html',
  styleUrl: './quick-view.scss',
})
export class QuickView {
  private modal = inject(NgbModal);

  readonly product = input<Product>();
  readonly class = input<string>();
  readonly quickViewStyle = input<string>('text');

  openModal(product: Product) {
    const modal = this.modal.open(ProductDetailsModal, {
      centered: true,
      windowClass: 'quick-view-modal theme-modal modal-custom-size',
    });
    modal.componentInstance.product = product;
  }
}
