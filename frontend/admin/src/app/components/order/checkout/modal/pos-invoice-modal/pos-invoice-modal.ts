import { CommonModule } from '@angular/common';
import { Component, inject, TemplateRef, viewChild } from '@angular/core';

import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { NgxPrintModule } from 'ngx-print';
import { Observable } from 'rxjs';

import { IOrder } from '../../../../../shared/interface/order.interface';
import { IValues } from '../../../../../shared/interface/setting.interface';
import { CurrencySymbolPipe } from '../../../../../shared/pipe/currency-symbol.pipe';
import { SettingState } from '../../../../../shared/store/state/setting.state';

@Component({
  selector: 'app-pos-invoice-modal',
  imports: [CommonModule, TranslateModule, CurrencySymbolPipe, NgxPrintModule],
  templateUrl: './pos-invoice-modal.html',
  styleUrl: './pos-invoice-modal.scss',
})
export class PosInvoiceModal {
  private modalService = inject(NgbModal);

  public closeResult: string;
  public modalOpen: boolean = false;
  public order: IOrder;

  readonly PosInvoice = viewChild<TemplateRef<string>>('posInvoice');
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  async openModal(order: IOrder) {
    this.order = order;
    this.modalOpen = true;
    this.modalService
      .open(this.PosInvoice(), {
        ariaLabelledBy: 'add-customer-Modal',
        centered: true,
        windowClass: 'theme-modal modal-sm invoice-modal',
      })
      .result.then(
        result => {
          `Result ${result}`;
        },
        reason => {
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

  ngOnDestroy() {
    if (this.modalOpen) {
      this.modalService.dismissAll();
    }
  }
}
