import { CommonModule } from '@angular/common';
import { Component, inject, TemplateRef, viewChild, output, input } from '@angular/core';

import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IPayoutStatus, IRefund } from 'src/app/shared/interface/refund.interface';

import { HasPermissionDirective } from '../../../../directive/has-permission.directive';
import { IValues } from '../../../../interface/setting.interface';
import { CurrencySymbolPipe } from '../../../../pipe/currency-symbol.pipe';
import { SettingState } from '../../../../store/state/setting.state';
import { Button } from '../../button/button';

@Component({
  selector: 'app-payout-modal',
  imports: [CommonModule, TranslateModule, CurrencySymbolPipe, HasPermissionDirective, Button],
  templateUrl: './payout-modal.html',
  styleUrl: './payout-modal.scss',
})
export class PayoutModal {
  private modalService = inject(NgbModal);

  public modalOpen: boolean = false;
  public closeResult: string;
  public active = 'upload';
  public payoutData: IRefund;
  public payoutStatus: IPayoutStatus = { data: {} as IRefund };

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  readonly label = input<string>(undefined);
  readonly action = input<boolean>(undefined);

  readonly payout = output<IPayoutStatus>();
  readonly PayoutModal = viewChild<TemplateRef<string>>('payoutModal');

  async openModal(data: IRefund) {
    this.payoutData = data;
    this.payoutStatus.data = data;
    this.modalOpen = true;
    this.modalService
      .open(this.PayoutModal(), {
        ariaLabelledBy: 'Payout-Modal',
        centered: true,
        windowClass: 'theme-modal text-center payout-modal',
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

  private getDismissReason(reason: ModalDismissReasons): string {
    this.active = 'upload';
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  actionPerform(status: string) {
    this.payoutStatus.status = status;
    this.payout.emit(this.payoutStatus);
  }

  ngOnDestroy() {
    if (this.modalOpen) {
      this.modalService.dismissAll();
    }
  }
}
