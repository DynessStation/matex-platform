import { Injectable, NgZone, inject } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private zone = inject(NgZone);
  private modalService = inject(NgbModal);
  private toastr = inject(ToastrService);

  public alertSubject = new Subject();

  public notification: boolean = true;

  // By default a success message also closes every open modal (template behaviour many
  // forms rely on). Pass { dismissModals: false } when the success happens inside a modal
  // that must stay open, such as uploading from the media picker.
  showSuccess(
    message: string,
    options: { dismissModals?: boolean } = {},
  ): void {
    this.alertSubject.next({ type: 'success', message: message });
    this.zone.run(() => {
      if (options.dismissModals !== false) {
        this.modalService.dismissAll();
      }
      if (this.notification) {
        this.toastr.success(message);
      }
    });
  }

  showError(message: string): void {
    this.alertSubject.next({ type: 'error', message: message });
    this.zone.run(() => {
      if (this.notification) {
        this.toastr.error(message);
      }
    });
  }
}
