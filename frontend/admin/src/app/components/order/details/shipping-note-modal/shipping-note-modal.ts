import { DatePipe } from '@angular/common';
import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  ModalDismissReasons,
  NgbDateStruct,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { Button } from '../../../../shared/components/ui/button/button';
import { UpdateOrderStatusAction } from '../../../../shared/store/action/order.action';

@Component({
  selector: 'app-shipping-note-modal',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, Button],
  templateUrl: './shipping-note-modal.html',
  styleUrl: './shipping-note-modal.scss',
})
export class ShippingNoteModal {
  private modalService = inject(NgbModal);
  private datePipe = inject(DatePipe);
  private store = inject(Store);

  public closeResult: string;
  public modalOpen: boolean = false;
  public orderId: number;
  public statusId: number;
  public date = new FormControl();

  readonly NoteModal = viewChild<TemplateRef<string>>('noteModal');

  async openModal(id: number, value: number) {
    this.modalOpen = true;
    this.orderId = id;
    this.statusId = value;
    this.date.patchValue('');
    this.modalService
      .open(this.NoteModal(), {
        ariaLabelledBy: 'Note-Modal',
        centered: true,
        backdrop: 'static',
        keyboard: false,
        windowClass: 'theme-modal',
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
  model: NgbDateStruct;
  submit(modal: NgbModalRef, value: string) {
    const currentDate = new Date();
    this.datePipe.transform(
      this.date.value ? this.date.value : currentDate,
      'yyyy-MM-ddTHH:mm:ss.SSSSSSZ',
    );
    this.store
      .dispatch(
        new UpdateOrderStatusAction(this?.orderId, {
          order_status_id: Number(this.statusId),
          note: value,
          changed_at: this.datePipe.transform(currentDate, 'yyyy-MM-ddTHH:mm:ss.SSSSSSZ')!,
        }),
      )
      .subscribe({
        complete: () => {
          modal.dismiss();
        },
      });
  }

  ngOnDestroy() {
    if (this.modalOpen) {
      this.modalService.dismissAll();
    }
  }
}
