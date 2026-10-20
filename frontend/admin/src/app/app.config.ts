import { CurrencyPipe, registerLocaleData } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi,
} from '@angular/common/http';
import localeEn from '@angular/common/locales/en';
import localeId from '@angular/common/locales/id';
import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { NgbDatepickerConfig } from '@ng-bootstrap/ng-bootstrap';
import { LoadingBarRouterModule } from '@ngx-loading-bar/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { NgxsModule } from '@ngxs/store';
import { ToastrModule } from 'ngx-toastr';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandlerInterceptor } from './core/interceptors/globle-error-handler.interceptor';
import { LoaderInterceptor } from './core/interceptors/loader.interceptor';
import { AppTitleService } from './core/services/app-title.service';
import { LocalizationService } from './shared/services/localization.service';
import { AccountState } from './shared/store/state/account.state';
import { AdminAccessState } from './shared/store/state/admin-access.state';
import { AdminAccountState } from './shared/store/state/admin-account.state';
import { AdminPermissionState } from './shared/store/state/admin-permission.state';
import { AttachmentState } from './shared/store/state/attachment.state';
import { AuditLogState } from './shared/store/state/audit-log.state';
import { AuthState } from './shared/store/state/auth.state';
import { BlogState } from './shared/store/state/blog.state';
import { CategoryState } from './shared/store/state/category.state';
import { ChairState } from './shared/store/state/chair.state';
import { CountryState } from './shared/store/state/country.state';
import { FaqState } from './shared/store/state/faq.state';
import { LoaderState } from './shared/store/state/loader.state';
import { OfficeState } from './shared/store/state/office.state';
import { ProductState } from './shared/store/state/product.state';
import { SettingState } from './shared/store/state/setting.state';
import { SidebarState } from './shared/store/state/sidebar.state';
import { StateState } from './shared/store/state/state.state';
import { StoreState } from './shared/store/state/store.state';
import { WebNavigationState } from './shared/store/state/web-navigation.state';

//==================================================
//==== ANGULAR LOCALE DATA
//==================================================

registerLocaleData(localeId, 'id-ID');

registerLocaleData(localeEn, 'en-US');

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    CurrencyPipe,

    provideAppInitializer(() => {
      const localization = inject(LocalizationService);

      return localization.initialize();
    }),

    provideAppInitializer(() => {
      const appTitle = inject(AppTitleService);

      appTitle.initialize();
    }),

    provideAppInitializer(() => {
      const datepicker = inject(NgbDatepickerConfig);

      datepicker.firstDayOfWeek = 1;
    }),

    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GlobalErrorHandlerInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptor,
      multi: true,
    },

    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-top-center',
        preventDuplicates: true,
      }),

      LoadingBarRouterModule,

      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),

      NgxsModule.forRoot([
        AccountState,
        AdminAccountState,
        AdminPermissionState,
        AdminAccessState,
        ChairState,
        OfficeState,
        AttachmentState,
        WebNavigationState,
        AuditLogState,
        BlogState,
        CategoryState,
        CountryState,
        FaqState,
        LoaderState,
        ProductState,
        SettingState,
        SidebarState,
        StateState,
        StoreState,
      ]),

      NgxsModule.forFeature([AuthState]),

      NgxsStoragePluginModule.forRoot({
        keys: ['account', 'country', 'state', 'setting'],
      }),
    ),

    provideAnimations(),

    provideHttpClient(withInterceptorsFromDi(), withFetch()),

    provideZoneChangeDetection({
      eventCoalescing: true,
    }),

    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
  ],
};
