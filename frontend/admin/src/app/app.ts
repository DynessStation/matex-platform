import { Component, DOCUMENT, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';

import { NgbNavConfig } from '@ng-bootstrap/ng-bootstrap';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { Actions, Store, ofActionDispatched } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IValues } from './shared/interface/setting.interface';
import { LogoutAction } from './shared/store/action/auth.action';
import { GetCountriesAction } from './shared/store/action/country.action';
import { GetStatesAction } from './shared/store/action/state.action';
import { SettingState } from './shared/store/state/setting.state';
import { GetSettingOptionAction } from './shared/store/action/setting.action';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingBarRouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private actions = inject(Actions);
  private router = inject(Router);
  private titleService = inject(Title);
  private store = inject(Store);

  setting$: Observable<IValues> = inject(Store).select(
    SettingState.setting,
  ) as Observable<IValues>;

  public favIcon: HTMLLinkElement | null;

  constructor() {
    const config = inject(NgbNavConfig);
    const document = inject<Document>(DOCUMENT);

    this.store.dispatch(new GetCountriesAction());
    this.store.dispatch(new GetStatesAction());
    this.store.dispatch(new GetSettingOptionAction());
    this.setting$.subscribe((setting) => {
      // Set Direction
      if (setting?.general?.admin_site_language_direction === 'rtl') {
        document.getElementsByTagName('html')[0].setAttribute('dir', 'rtl');
        document.body.classList.add('ltr');
      } else {
        document.getElementsByTagName('html')[0].removeAttribute('dir');
        document.body.classList.remove('ltr');
      }

      // Set Favicon
      this.favIcon = document.querySelector('#appIcon');
      if (this.favIcon && this.favIcon.href)
        this.favIcon.href = setting?.general?.favicon_image?.asset_url!;

      // Set site title
      this.titleService.setTitle(
        setting?.general?.site_title && setting?.general?.site_tagline
          ? `${setting?.general?.site_title} | ${setting?.general?.site_tagline}`
          : 'Marketplace: Where Vendors Shine Together',
      );
    });

    // customize default values of navs used by this component tree
    config.destroyOnHide = false;
    config.roles = false;

    this.actions.pipe(ofActionDispatched(LogoutAction)).subscribe(() => {
      void this.router.navigate(['/auth/login']);
    });
  }
}
