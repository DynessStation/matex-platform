import { Component, TemplateRef, inject, viewChild } from '@angular/core';

import {
  ModalDismissReasons,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import {
  Select2Data,
  Select2Module,
  Select2UpdateEvent,
} from 'ng-select2-component';

import { IProduct, IVariation } from '../../../../interface/product.interface';
import { DownloadAction } from '../../../../store/action/product.action';
import { Button } from '../../button/button';

@Component({
  selector: 'app-digital-download-modal',
  imports: [TranslateModule, Select2Module, Button],
  templateUrl: './digital-download-modal.html',
  styleUrl: './digital-download-modal.scss',
})
export class DigitalDownloadModal {
  private modalService = inject(NgbModal);
  private store = inject(Store);

  public closeResult: string;
  public modalOpen: boolean = false;
  public product: IProduct;
  public variations: Select2Data = [];
  public variation_id: number;

  readonly DownloadModal = viewChild<TemplateRef<string>>('downloadModal');

  async openModal(data: IProduct) {
    this.modalOpen = true;
    this.product = data;
    if (data.variations.length) {
      this.variations = data.variations
        .filter((res) => res?.digital_files?.length)
        .map((res: IVariation) => {
          return { label: res?.name, value: res?.id! };
        });
    }
    this.modalService
      .open(this.DownloadModal(), {
        ariaLabelledBy: 'Download-Modal',
        centered: true,
        windowClass: 'theme-modal',
      })
      .result.then(
        (result) => {
          `Result ${result}`;
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        },
      );
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

  download(modal: NgbModalRef) {
    this.store.dispatch(
      new DownloadAction({
        product_id: this.product.id,
        variation_id: this.variation_id,
      }),
    );
    modal.close();
  }

  selectProduct(data: Select2UpdateEvent) {
    this.variation_id = +data.value;
  }

  ngOnDestroy() {
    if (this.modalOpen) {
      this.modalService.dismissAll();
    }
  }
}
