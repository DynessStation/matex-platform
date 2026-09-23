import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, inject, PLATFORM_ID } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Analytics, Values } from './shared/interface/setting.interface';
import { Option } from './shared/interface/theme-option.interface';
import { SeoService } from './shared/services/seo.service';
import { GetCurrencies } from './shared/store/action/currency.action';
import { GetSettingOption } from './shared/store/action/setting.action';
import { GetThemes } from './shared/store/action/theme.action';
import { SettingState } from './shared/store/state/setting.state';
import { ThemeOptionState } from './shared/store/state/theme-option.state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  meta = inject(Meta);
  private store = inject(Store);
  seoService = inject(SeoService);
  private platformId = inject<Object>(PLATFORM_ID);

  setting$: Observable<Values> = inject(Store).select(SettingState.setting) as Observable<Values>;
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public isTabInFocus = true;
  private maintenance_mode: boolean = false;
  public isBrowser: boolean;

  constructor() {
    this.store.dispatch(new GetThemes());
    this.store.dispatch(new GetCurrencies({ status: 1 }));
    this.store.dispatch(new GetSettingOption());

    const document = inject<Document>(DOCUMENT);
    const config = inject(NgbRatingConfig);
    const platformId = this.platformId;

    this.isBrowser = isPlatformBrowser(platformId);
    config.max = 5;
    config.readonly = true;

    this.setting$.subscribe((option) => {
      this.maintenance_mode = option && option.maintenance && option.maintenance.maintenance_mode;
      if (option?.analytics) {
        if (option?.analytics?.google_analytics && option?.analytics?.google_analytics.status) {
          this.loadScript(option?.analytics);
        }
      }
    });

    if (this.isBrowser) {
      this.themeOption$.subscribe((theme) => {
        this.meta.updateTag({ name: 'title', content: theme?.seo?.meta_title || 'sdsff' });
        this.meta.updateTag({ name: 'description', content: theme?.seo?.meta_description });
        // Set Mode
        if (theme?.general?.mode === 'dark') {
          document.body.classList.add(theme?.general && theme?.general?.mode);
        } else {
          document.body.classList.remove('dark');
        }

        // Set Direction
        if (theme?.general?.language_direction === 'rtl') {
          document.getElementsByTagName('html')[0].setAttribute('dir', 'rtl');
          document.body.classList.add('rtl');
        } else {
          document.getElementsByTagName('html')[0].removeAttribute('dir');
          document.body.classList.remove('rtl');
        }
      });
    }
  }

  // Function to dynamically load analytics scripts based on configuration values.
  loadScript(val: Analytics): void {
    if (this.isBrowser) {
      // Load Google Analytics script if enabled
      if (val.google_analytics.status) {
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${val.google_analytics.measurement_id}`;
        document.head.appendChild(script);

        const configScript = document.createElement('script');
        configScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${val.google_analytics.measurement_id}');
          `;
        document.head.appendChild(configScript);
      }

      // Load Facebook Pixel script if enabled
      if (val.facebook_pixel.status) {
        const script = document.createElement('script');
        script.src = `https://www.facebook.com/tr?id=${val.facebook_pixel.pixel_id}`;
        document.head.appendChild(script);

        const configScript = document.createElement('script');
        configScript.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${val.facebook_pixel.pixel_id}');
          fbq('track', 'PageView');
          `;
        document.head.appendChild(configScript);
      }
    }
  }
}
