import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { Notification } from '../../../shared/interface/notification.interface';
import {
  GetNotification,
  MarkAsReadNotification,
} from '../../../shared/store/action/notification.action';
import { NotificationState } from '../../../shared/store/state/notification.state';

@Component({
  selector: 'app-notifications',
  imports: [NoData, AsyncPipe, DatePipe, TranslateModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  private store = inject(Store);
  notification$: Observable<Notification[]> = this.store.select(NotificationState.notification);

  ngOnInit() {
    this.store.dispatch(new GetNotification());
  }

  ngOnDestroy() {
    this.store.dispatch(new MarkAsReadNotification());
  }
}
