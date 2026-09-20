import { Component, inject } from '@angular/core';

import { NotificationService } from '../../../services/notification.service';

export interface Alert {
  type: string;
  message: string;
}

@Component({
  selector: 'app-alert',
  imports: [],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class Alert {
  private notificationService = inject(NotificationService);

  public alert: Alert;

  constructor() {
    this.notificationService.alertSubject.subscribe(alert => {
      this.alert = <Alert>alert;
    });
  }

  ngOnDestroy() {
    this.notificationService.notification = true;
  }
}
