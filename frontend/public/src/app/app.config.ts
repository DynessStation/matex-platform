import { CurrencyPipe } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { NgxsModule } from '@ngxs/store';
import { provideToastr, ToastrModule } from 'ngx-toastr';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandlerInterceptor } from './core/interceptors/global-error-handler.interceptor';
import { LoaderInterceptor } from './core/interceptors/loader.interceptor';
import { ssrApiOriginInterceptor } from './core/interceptors/ssr-api-origin.interceptor';
import { SeoService } from './shared/services/seo.service';
import { BlogState } from './shared/store/state/blog.state';
import { CartState } from './shared/store/state/cart.state';
import { CategoryState } from './shared/store/state/category.state';
import { CurrencyState } from './shared/store/state/currency.state';
import { LoaderState } from './shared/store/state/loader.state';
import { ProductState } from './shared/store/state/product.state';
import { SettingState } from './shared/store/state/setting.state';
import { TagState } from './shared/store/state/tag.state';
import { ThemeOptionState } from './shared/store/state/theme-option.state';
import { ThemeState } from './shared/store/state/theme.state';
import { WishlistState } from './shared/store/state/wishlist.state';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    CurrencyPipe,
    BrowserModule,
    SeoService,
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled', // Tells Angular to look at the URL fragment and scroll to the matching ID
        scrollPositionRestoration: 'disabled',
      }),
    ),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: GlobalErrorHandlerInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withInterceptors([ssrApiOriginInterceptor]),
      withInterceptorsFromDi(),
      withFetch(),
    ),
    provideToastr(),
    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        timeOut: 3000,
      }),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
        defaultLanguage: 'en',
      }),
      NgxsModule.forRoot([
        LoaderState,
        ThemeState,
        ProductState,
        CategoryState,
        TagState,
        ThemeOptionState,
        SettingState,
        CartState,
        BlogState,
        WishlistState,
        CurrencyState,
      ]),
      NgxsStoragePluginModule.forRoot({
        keys: ['theme_option', 'theme', 'setting', 'cart', 'wishlist', 'compare'],
      }),
    ),
  ],
};
