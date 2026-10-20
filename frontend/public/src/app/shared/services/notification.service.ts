import { Injectable, NgZone } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';

import { AlertPayload } from '../components/widgets/alert/alert';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  public alertSubject = new Subject<AlertPayload>();

  public notification: boolean = true;

  constructor(
    private zone: NgZone,
    private modalService: NgbModal,
    private toastr: ToastrService,
  ) {}

  showSuccess(message: string): void {
    this.alertSubject.next({ type: 'success', message: message });
    this.zone.run(() => {
      this.modalService.dismissAll();
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
