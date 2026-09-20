import { CommonModule } from '@angular/common';
import { Component, inject, DOCUMENT } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { INotification } from '../../interface/notification.interface';
import { ILanguage, IValues } from '../../interface/setting.interface';
import { NavService } from '../../services/nav.service';
import { Languages } from './widgets/languages/languages';
import { Mode } from './widgets/mode/mode';
import { Notification } from './widgets/notification/notification';
import { Profile } from './widgets/profile/profile';
import { QuickView } from './widgets/quick-view/quick-view';
import { Search } from './widgets/search/search';
import { NotificationState } from '../../store/state/notification.state';
import { SettingState } from '../../store/state/setting.state';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    Search,
    QuickView,
    Languages,
    Notification,
    Mode,
    Profile,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  navServices = inject(NavService);
  private document = inject(DOCUMENT);

  setting$: Observable<IValues> = inject(Store).select(
    SettingState.setting,
  ) as Observable<IValues>;
  notification$: Observable<INotification[]> = inject(Store).select(
    NotificationState.notification,
  );

  public unreadNotificationCount: number;

  public active: boolean = false;
  public profileOpen: boolean = false;
  public open: boolean = false;

  public languages: ILanguage[] = [
    {
      language: 'Bahasa Indonesia',
      code: 'id',
      icon: 'id',
    },
    {
      language: 'English',
      code: 'en',
      icon: 'us',
    },
    {
      language: 'Français',
      code: 'fr',
      icon: 'fr',
    },
  ];

  public selectedLanguage: ILanguage = {
    language: 'Bahasa Indonesia',
    code: 'id',
    icon: 'id',
  };
  public elem: HTMLElement;
  public url: string;

  constructor() {
    const document = this.document;

    this.notification$.subscribe((notification) => {
      this.unreadNotificationCount = notification?.filter(
        (item) => !item.read_at,
      )?.length;
    });
    this.setting$.subscribe((setting) => {
      if (setting && setting.general) {
        this.url = setting.general.site_url;
        document.body.classList.add(setting.general.mode!);
      }
    });

    this.elem = document.documentElement;
  }

  sidebarToggle() {
    this.navServices.collapseSidebar = !this.navServices.collapseSidebar;
  }

  clickHeaderOnMobile() {
    this.navServices.search = true;
  }

  toggleFullScreen() {
    this.navServices.fullScreen = !this.navServices.fullScreen;
    if (this.navServices.fullScreen) {
      if (this.elem.requestFullscreen) {
        void this.elem.requestFullscreen();
      } else if ('mozRequestFullScreen' in this.elem) {
        void (
          this.elem as HTMLElement & {
            mozRequestFullScreen: () => Promise<void>;
          }
        ).mozRequestFullScreen();
      } else if ('webkitRequestFullscreen' in this.elem) {
        void (
          this.elem as HTMLElement & {
            webkitRequestFullscreen: () => Promise<void>;
          }
        ).webkitRequestFullscreen();
      } else if ('msRequestFullscreen' in this.elem) {
        void (
          this.elem as HTMLElement & {
            msRequestFullscreen: () => Promise<void>;
          }
        ).msRequestFullscreen();
      }
    } else {
      if (this.document.exitFullscreen) {
        void this.document.exitFullscreen();
      } else if ('mozCancelFullScreen' in this.document) {
        void (
          this.document as Document & {
            mozCancelFullScreen: () => Promise<void>;
          }
        ).mozCancelFullScreen();
      } else if ('webkitExitFullscreen' in this.document) {
        void (
          this.document as Document & {
            webkitExitFullscreen: () => Promise<void>;
          }
        ).webkitExitFullscreen();
      } else if ('msExitFullscreen' in this.document) {
        void (
          this.document as Document & {
            msExitFullscreen: () => Promise<void>;
          }
        ).msExitFullscreen();
      }
    }
  }
}
