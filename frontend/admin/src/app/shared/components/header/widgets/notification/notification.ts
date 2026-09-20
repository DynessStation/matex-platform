import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { INotification } from '../../../../../shared/interface/notification.interface';
import { SummaryPipe } from '../../../../pipe/summary.pipe';
import { NavService } from '../../../../services/nav.service';
import { NotificationState } from '../../../../store/state/notification.state';

@Component({
  selector: 'app-notification',
  imports: [CommonModule, TranslateModule, RouterModule, SummaryPipe],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class Notification {
  navServices = inject(NavService);

  notification$: Observable<INotification[]> = inject(Store).select(NotificationState.notification);

  public unreadNotificationCount: number;
  public active: boolean = false;

  constructor() {
    this.notification$.subscribe(notification => {
      this.unreadNotificationCount = notification?.filter(item => !item.read_at)?.length;
    });
  }

  clickHeaderOnMobile() {
    this.active = !this.active;
  }
}
