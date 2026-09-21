import {
  Component,
  TemplateRef,
  inject,
  output,
  viewChild,
} from '@angular/core';

import {
  ModalDismissReasons,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule } from '@ngx-translate/core';

import { ITableClickedAction } from '../../../../interface/table.interface';

import { Button } from '../../button/button';

@Component({
  selector: 'app-confirmation-modal',

  imports: [TranslateModule, Button],

  templateUrl: './confirmation-modal.html',

  styleUrl: './confirmation-modal.scss',
})
export class ConfirmationModal {
  //==================================================
  //==== INJECT
  //==================================================

  private modalService = inject(NgbModal);

  //==================================================
  //==== STATE
  //==================================================

  public closeResult = '';

  public modalOpen = false;

  //==================================================
  //==== CONTENT
  //==================================================

  public modalTitleKey = 'confirmation_ui.title';

  public modalMessageKey = 'confirmation_ui.continue_message';

  public modalParams: Record<string, string> = {};

  public userAction: ITableClickedAction | null = null;

  private modalRef: NgbModalRef | null = null;

  //==================================================
  //==== TEMPLATE
  //==================================================

  readonly confirmationModal =
    viewChild<TemplateRef<unknown>>('confirmationModal');

  //==================================================
  //==== OUTPUT
  //==================================================

  readonly confirmed = output<ITableClickedAction>();

  //==================================================
  //==== OPEN MODAL
  //==================================================

  openModal(action: string, data?: any, value?: any): void {
    const template = this.confirmationModal();

    if (!template) {
      return;
    }

    //==================================================
    //==== ACTION DATA
    //==================================================

    this.userAction = {
      actionToPerform: action,

      data,

      value,
    };

    //==================================================
    //==== CONTENT
    //==================================================

    this.setModalContent(action, data);

    //==================================================
    //==== OPEN
    //==================================================

    this.modalOpen = true;

    this.modalRef = this.modalService.open(template, {
      ariaLabelledBy: 'Confirmation-Modal',

      centered: true,

      windowClass: 'theme-modal text-center',

      backdrop: 'static',

      keyboard: false,
    });

    //==================================================
    //==== RESULT
    //==================================================

    this.modalRef.result
      .then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
        },

        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        },
      )
      .finally(() => {
        this.modalOpen = false;

        this.modalRef = null;

        this.userAction = null;
      });
  }

  //==================================================
  //==== SET MODAL CONTENT
  //==================================================

  private setModalContent(
    action: string,

    data?: unknown,
  ): void {
    const name = this.resolveEntityLabel(data);

    this.modalParams = name
      ? {
          name,
        }
      : {};

    switch (action) {
      //==================================================
      //==== ACTIVATE
      //==================================================

      case 'activate':
        this.modalTitleKey = 'confirmation_ui.activate_title';

        this.modalMessageKey = name
          ? 'confirmation_ui.activate_message'
          : 'confirmation_ui.activate_message_generic';

        break;

      //==================================================
      //==== DEACTIVATE
      //==================================================

      case 'deactivate':
        this.modalTitleKey = 'confirmation_ui.deactivate_title';

        this.modalMessageKey = name
          ? 'confirmation_ui.deactivate_message'
          : 'confirmation_ui.deactivate_message_generic';

        break;

      //==================================================
      //==== TRASH
      //==================================================

      case 'trash':
        this.modalTitleKey = 'confirmation_ui.trash_title';

        this.modalMessageKey = name
          ? 'confirmation_ui.trash_message'
          : 'confirmation_ui.trash_message_generic';

        break;

      //==================================================
      //==== RESTORE
      //==================================================

      case 'restore':
        this.modalTitleKey = 'confirmation_ui.restore_title';

        this.modalMessageKey = name
          ? 'confirmation_ui.restore_message'
          : 'confirmation_ui.restore_message_generic';

        break;

      //==================================================
      //==== DELETE
      //==================================================

      case 'delete':
        this.modalTitleKey = 'confirmation_ui.delete_title';

        this.modalMessageKey = name
          ? 'confirmation_ui.delete_message'
          : 'confirmation_ui.delete_message_generic';

        break;

      //==================================================
      //==== DEFAULT
      //==================================================

      default:
        this.modalTitleKey = 'confirmation_ui.title';

        this.modalMessageKey = 'confirmation_ui.continue_message';

        break;
    }
  }

  //==================================================
  //==== ENTITY LABEL
  //==================================================

  private resolveEntityLabel(data: unknown): string {
    if (!data || typeof data !== 'object') {
      return '';
    }

    const item = data as Record<string, unknown>;

    const keys = [
      'alias',
      'name',
      'access_name',
      'permission_name',
      'chair_name',
      'office_name',
      'title',
    ];

    for (const key of keys) {
      const value = item[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  //==================================================
  //==== CONFIRM
  //==================================================

  confirm(): void {
    if (!this.userAction) {
      return;
    }

    this.confirmed.emit(this.userAction);
  }

  //==================================================
  //==== CLOSE MODAL
  //==================================================

  closeModal(): void {
    if (!this.modalRef) {
      return;
    }

    this.modalRef.close('Confirmed');
  }

  //==================================================
  //==== DISMISS MODAL
  //==================================================

  dismissModal(): void {
    if (!this.modalRef) {
      return;
    }

    this.modalRef.dismiss('Cancel');
  }

  //==================================================
  //==== DISMISS REASON
  //==================================================

  private getDismissReason(reason: ModalDismissReasons | string): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    }

    if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    }

    return `with: ${reason}`;
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy(): void {
    if (this.modalOpen && this.modalRef) {
      this.modalRef.dismiss('Component destroyed');
    }
  }
}
