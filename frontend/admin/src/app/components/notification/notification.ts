import { CommonModule, isPlatformBrowser } from "@angular/common";
import { Component, inject, PLATFORM_ID } from "@angular/core";

import { Store } from "@ngxs/store";
import { Observable } from "rxjs";

import { PageWrapper } from "../../shared/components/page-wrapper/page-wrapper";
import { INotification } from "../../shared/interface/notification.interface";
import {
  GetNotificationAction,
  MarkAsReadNotificationAction,
} from "../../shared/store/action/notification.action";
import { NotificationState } from "../../shared/store/state/notification.state";

@Component({
  selector: "app-notification",
  imports: [CommonModule, PageWrapper],
  templateUrl: "./notification.html",
  styleUrl: "./notification.scss",
})
export class Notification {
  private store = inject(Store);

  notification$: Observable<INotification[]> = inject(Store).select(
    NotificationState.notification,
  );

  public isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    this.store.dispatch(new GetNotificationAction());
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.store.dispatch(new MarkAsReadNotificationAction());
    }
  }
}
