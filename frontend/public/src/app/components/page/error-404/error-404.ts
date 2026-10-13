import { Component, DestroyRef, inject, RESPONSE_INIT } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { ErrorPage, Option } from '../../../shared/interface/theme-option.interface';
import { PublicSeoService } from '../../../shared/services/public-seo.service';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-error-404',
  imports: [HomeNewsletter, RouterModule, Breadcrumb],
  templateUrl: './error-404.html',
  styleUrl: './error-404.scss',
})
export class Error404 {
  private readonly router = inject(Router);
  private readonly seo = inject(PublicSeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: '404',
    items: [{ label: '404', active: true }],
  };

  public errorPage: ErrorPage = {
    error_page_content: 'Halaman tidak ditemukan',
    back_button_enable: true,
    back_button_text: 'Kembali ke beranda',
    error_400: this.fallbackDetails('Permintaan tidak valid', '400'),
    error_404: this.fallbackDetails('Halaman tidak ditemukan', '404'),
    error_500: this.fallbackDetails('Terjadi gangguan pada server', '500'),
  };
  public errorDescription = 'Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.';

  constructor() {
    const english = this.router.url === '/en' || this.router.url.startsWith('/en/');
    this.errorDescription = english
      ? 'The page you are looking for is unavailable or has moved.'
      : 'Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.';
    this.seo.apply({
      locale: english ? 'en-US' : 'id-ID',
      title: `${english ? 'Page not found' : 'Halaman tidak ditemukan'} | MATEX`,
      description: english
        ? 'The requested page could not be found.'
        : 'Halaman yang diminta tidak ditemukan.',
      robots: 'noindex, nofollow',
      canonicalPath: null,
    });

    if (this.response) {
      this.response.status = 404;
      const headers = new Headers(this.response.headers);
      headers.set('Cache-Control', 'no-store');
      this.response.headers = headers;
    }

    this.themeOption$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((option) => {
      if (option?.error_page) this.errorPage = option.error_page;
    });
    this.destroyRef.onDestroy(() => this.seo.clear());
  }

  private fallbackDetails(title: string, code: string) {
    return {
      title,
      description: this.errorDescription,
      image: `assets/images/inner-page/${code}.png`,
      back_button_text: 'Kembali ke beranda',
      back_button_enable: true,
    };
  }
}
