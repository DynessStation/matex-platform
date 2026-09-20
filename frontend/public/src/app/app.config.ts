import { CurrencyPipe } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withFetch,
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
import { provideRouter, RouterModule } from '@angular/router';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import { NgxsModule } from '@ngxs/store';
import { provideToastr, ToastrModule } from 'ngx-toastr';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandlerInterceptor } from './core/interceptors/global-error-handler.interceptor';
import { LoaderInterceptor } from './core/interceptors/loader.interceptor';
import { SeoService } from './shared/services/seo.service';
import { AccountState } from './shared/store/state/account.state';
import { AttributeState } from './shared/store/state/attribute.state';
import { AuthState } from './shared/store/state/auth.state';
import { BlogState } from './shared/store/state/blog.state';
import { BrandState } from './shared/store/state/brand.state';
import { CartState } from './shared/store/state/cart.state';
import { CategoryState } from './shared/store/state/category.state';
import { CompareState } from './shared/store/state/compare.state';
import { CountryState } from './shared/store/state/country.state';
import { CouponState } from './shared/store/state/coupon.state';
import { CurrencyState } from './shared/store/state/currency.state';
import { MenuState } from './shared/store/state/menu.state';
import { NotificationState } from './shared/store/state/notification.state';
import { OrderStatusState } from './shared/store/state/order-status.state';
import { OrderState } from './shared/store/state/order.state';
import { PageState } from './shared/store/state/page.state';
import { PointState } from './shared/store/state/point.state';
import { ProductState } from './shared/store/state/product.state';
import { QuestionAnswersState } from './shared/store/state/questions-answers.state';
import { RefundState } from './shared/store/state/refund.state';
import { ReviewState } from './shared/store/state/review.state';
import { ServiceState } from './shared/store/state/service.state';
import { SettingState } from './shared/store/state/setting.state';
import { StoreState } from './shared/store/state/store.state';
import { TagState } from './shared/store/state/tag.state';
import { ThemeOptionState } from './shared/store/state/theme-option.state';
import { ThemeState } from './shared/store/state/theme.state';
import { WalletState } from './shared/store/state/wallet.state';
import { WishlistState } from './shared/store/state/wishlist.state';

import { PaymentDetailsState } from './shared/store/state/payment-details.state';

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
    provideRouter(routes),
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
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
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
        MenuState,
        ThemeState,
        ProductState,
        CategoryState,
        TagState,
        ThemeOptionState,
        SettingState,
        AttributeState,
        CartState,
        QuestionAnswersState,
        ReviewState,
        BlogState,
        AccountState,
        OrderState,
        CouponState,
        CountryState,
        AuthState,
        WishlistState,
        CompareState,
        BrandState,
        ServiceState,
        StoreState,
        OrderStatusState,
        RefundState,
        PointState,
        PageState,
        CurrencyState,
        NotificationState,
        WalletState,
        PaymentDetailsState,
      ]),
      NgxsStoragePluginModule.forRoot({
        keys: [
          'account',
          'auth',
          'theme_option',
          'theme',
          'setting',
          'cart',
          'wishlist',
          'compare',
        ],
      }),
      RouterModule.forRoot(routes, {
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
  ],
};
