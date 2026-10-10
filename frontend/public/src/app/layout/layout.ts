import { Component, DestroyRef, DOCUMENT, Inject, inject, Renderer2, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterModule,
} from '@angular/router';

import { Store } from '@ngxs/store';
import { distinctUntilChanged, finalize, map, Observable } from 'rxjs';

import { Footer } from '../shared/components/footer/footer';
import { Header } from '../shared/components/header/header';
import { Loader } from '../shared/components/loader/loader';
import { BackToTop } from '../shared/components/widgets/back-to-top/back-to-top';
import { Option } from '../shared/interface/theme-option.interface';
import { BodyService } from '../shared/services/body.service';
import { ThemeOptionService } from '../shared/services/theme-option.service';
import { ThemeOptions } from '../shared/store/action/theme-option.action';
import { LoaderState } from '../shared/store/state/loader.state';
import { ThemeOptionState } from '../shared/store/state/theme-option.state';
import { ThemeState } from '../shared/store/state/theme.state';

@Component({
  selector: 'app-layout',
  imports: [Header, Footer, RouterModule, Loader, BackToTop],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  public theme = '';
  public headerLogo = '';
  public footerLogo = '';
  readonly routeLoading = signal(false);

  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  readonly requestLoading = toSignal(this.store.select(LoaderState.status), {
    initialValue: false,
  });
  activeTheme$ = this.store.select(ThemeState.activeTheme);
  public activeTheme = '';
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private appliedTheme: string | null = null;

  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  constructor(
    private bodyService: BodyService,
    public themeOptionService: ThemeOptionService,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
  ) {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('theme') || ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((theme) => {
        this.theme = theme;
        if (this.theme) {
          this.setBodyClass(this.theme);
        }
        this.updateLogos();
      });

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.routeLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.routeLoading.set(false);
        if (event instanceof NavigationEnd) {
          const activeTheme = this.store.selectSnapshot(ThemeState.activeTheme);
          this.setBodyClass(activeTheme || this.theme);
        }
      }
    });

    this.activeTheme$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.activeTheme = res;
        this.setBodyClass(this.activeTheme);
      });

    this.themeOption$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((option) => this.updateLogos(option));
  }

  ngOnInit(): void {
    this.themeOptionService.preloader.set(true);
    this.store
      .dispatch(new ThemeOptions())
      .pipe(finalize(() => this.themeOptionService.preloader.set(false)))
      .subscribe();
  }

  private updateLogos(option?: Option) {
    if (this.theme) {
      this.setBodyClass(this.theme);
      if (this.theme === 'gadget-store' || this.theme === 'electro') {
        this.headerLogo = 'assets/images/logo/1.svg';
        this.footerLogo = 'assets/images/logo/1-dark.svg';
      } else if (this.theme === 'mega-mart') {
        this.headerLogo = 'assets/images/logo/2.svg';
        this.footerLogo = 'assets/images/logo/2.svg';
      } else if (this.theme === 'baby-shop') {
        this.headerLogo = 'assets/images/logo/5.svg';
        this.footerLogo = 'assets/images/logo/5-light.svg';
      } else if (this.theme === 'organic-store') {
        this.headerLogo = 'assets/images/logo/3.svg';
        this.footerLogo = 'assets/images/logo/3-light.svg';
      } else if (this.theme === 'style-tech') {
        this.headerLogo = 'assets/images/logo/4.svg';
        this.footerLogo = 'assets/images/logo/4.svg';
      }
    } else {
      const current = option || this.store.selectSnapshot(ThemeOptionState.themeOptions);
      this.headerLogo = current?.logo?.header_logo?.asset_url || '';
      this.footerLogo = current?.logo?.footer_logo?.asset_url || '';
    }
  }

  setBodyClass(path: string) {
    const nextTheme = path || '';
    if (this.appliedTheme === nextTheme) return;
    this.appliedTheme = nextTheme;

    this.bodyService.removeClass('demo-2', 'demo-3', 'demo-4', 'demo-5', 'demo-6');

    switch (path) {
      case 'mega-mart':
        this.bodyService.addClass('demo-2');
        this.updateFavicon('assets/images/favicon/2.svg');
        break;

      case 'organic-store':
        this.bodyService.addClass('demo-3');
        this.updateFavicon('assets/images/favicon/3.svg');
        break;

      case 'style-tech':
        this.bodyService.addClass('demo-4');
        this.updateFavicon('assets/images/favicon/4.svg');
        break;

      case 'electro':
        this.bodyService.addClass('demo-5');
        this.updateFavicon('assets/images/favicon/5.svg');

        break;

      case 'baby-shop':
        this.bodyService.addClass('demo-6');
        this.updateFavicon('assets/images/favicon/6.svg');
        break;

      default:
        this.updateFavicon('assets/images/favicon/2.svg');
        break;
    }
  }

  updateFavicon(iconPath: string) {
    let link: HTMLLinkElement =
      this.document.querySelector("link[rel*='icon']") || this.document.createElement('link');

    if (link.getAttribute('href') === iconPath) return;

    link.type = 'image/x-icon';
    link.rel = 'icon';
    link.href = iconPath;

    this.renderer.appendChild(this.document.head, link);
  }
}
