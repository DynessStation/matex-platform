import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AlertPayload } from '../components/widgets/alert/alert';
import { Params } from '../interface/core.interface';
import { NotificationModel } from '../interface/notification.interface';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  public alertSubject = new Subject<AlertPayload>();

  public notification: boolean = true;

  constructor(
    private zone: NgZone,
    private http: HttpClient,
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

  getNotifications(payload?: Params): Observable<NotificationModel> {
    return this.http.get<NotificationModel>(`${environment.URL}/notifications.json`, {
      params: payload,
    });
  }

  markAsReadNotification(): Observable<NotificationModel> {
    return this.http.put<NotificationModel>(`${environment.URL}/notifications/markAsRead`, {});
  }

  deleteNotification(id: string): Observable<number> {
    return this.http.delete<number>(`${environment.URL}/notifications/${id}`);
  }
}
