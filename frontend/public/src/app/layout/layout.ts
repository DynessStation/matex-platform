import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterModule,
} from '@angular/router';

import { Store } from '@ngxs/store';
import { finalize, Observable } from 'rxjs';

import { Footer } from '../shared/components/footer/footer';
import { Header } from '../shared/components/header/header';
import { Loader } from '../shared/components/loader/loader';
import { BackToTop } from '../shared/components/widgets/back-to-top/back-to-top';
import { Option } from '../shared/interface/theme-option.interface';
import { NavigationScrollService } from '../shared/services/navigation-scroll.service';
import { ThemeOptionService } from '../shared/services/theme-option.service';
import { ThemeOptions } from '../shared/store/action/theme-option.action';
import { LoaderState } from '../shared/store/state/loader.state';
import { ThemeOptionState } from '../shared/store/state/theme-option.state';

// Page frame: header, content, footer, and the loaders. The Kartify demo themes (switched with
// ?theme=, with their own logos, favicons, and body classes) were removed in 6B (FE-011).
@Component({
  selector: 'app-layout',
  imports: [Header, Footer, RouterModule, Loader, BackToTop],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  public headerLogo = '';
  public footerLogo = '';
  readonly routeLoading = signal(false);

  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private readonly navigationScroll = inject(NavigationScrollService);
  public themeOptionService = inject(ThemeOptionService);

  readonly requestLoading = toSignal(this.store.select(LoaderState.status), {
    initialValue: false,
  });

  themeOption$: Observable<Option> = this.store.select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  get loadingLabel(): string {
    return this.isEnglish() ? 'Loading page…' : 'Memuat halaman…';
  }

  get requestLoadingLabel(): string {
    return this.isEnglish() ? 'Processing data…' : 'Memproses data…';
  }

  constructor() {
    void this.navigationScroll;

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.routeLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.routeLoading.set(false);
      }
    });

    this.themeOption$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((option) => {
      this.headerLogo = option?.logo?.header_logo?.asset_url || '';
      this.footerLogo = option?.logo?.footer_logo?.asset_url || '';
    });
  }

  ngOnInit(): void {
    this.themeOptionService.preloader.set(true);
    this.store
      .dispatch(new ThemeOptions())
      .pipe(finalize(() => this.themeOptionService.preloader.set(false)))
      .subscribe();
  }

  private isEnglish(): boolean {
    return this.router.url === '/en' || this.router.url.startsWith('/en/');
  }
}
