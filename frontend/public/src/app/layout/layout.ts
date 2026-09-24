import { Component, DOCUMENT, Inject, inject, Renderer2 } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { filter, finalize, Observable } from 'rxjs';

import { Footer } from '../shared/components/footer/footer';
import { Header } from '../shared/components/header/header';
import { Loader } from '../shared/components/loader/loader';
import { BackToTop } from '../shared/components/widgets/back-to-top/back-to-top';
import { Option } from '../shared/interface/theme-option.interface';
import { BodyService } from '../shared/services/body.service';
import { ThemeOptionService } from '../shared/services/theme-option.service';
import { ThemeOptions } from '../shared/store/action/theme-option.action';
import { ThemeOptionState } from '../shared/store/state/theme-option.state';
import { ThemeState } from '../shared/store/state/theme.state';

@Component({
  selector: 'app-layout',
  imports: [
    Header,
    Footer,
    RouterModule,
    Loader,
    BackToTop,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  public theme: string;
  activeTheme$ = inject(Store).select(ThemeState.activeTheme);
  public activeTheme = '';
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  constructor(
    private bodyService: BodyService,
    public themeOptionService: ThemeOptionService,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
  ) {
    // Listen to query params changes
    this.route.queryParams.subscribe((params) => {
      this.theme = params['theme'];
      if (this.theme) {
        this.setBodyClass(this.theme);
      }
    });

    // Listen on every route change
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const activeTheme = this.store.selectSnapshot(ThemeState.activeTheme);
      this.setBodyClass(activeTheme || this.theme);
    });

    // Active theme change listener (Store)
    this.activeTheme$.subscribe((res) => {
      this.activeTheme = res;
      this.setBodyClass(this.activeTheme);
    });
  }

  ngOnInit(): void {
    this.themeOptionService.preloader.set(true);
    this.store
      .dispatch(new ThemeOptions())
      .pipe(finalize(() => this.themeOptionService.preloader.set(false)))
      .subscribe();
  }

  setLogo() {
    var headerLogo;
    var footerLogo;
    if (this.theme) {
      this.setBodyClass(this.theme);
      if (this.theme === 'gadget-store' || this.theme === 'electro') {
        headerLogo = 'assets/images/logo/1.svg';
        footerLogo = 'assets/images/logo/1-dark.svg';
      } else if (this.theme === 'mega-mart') {
        headerLogo = 'assets/images/logo/2.svg';
        footerLogo = 'assets/images/logo/2.svg';
      } else if (this.theme === 'baby-shop') {
        headerLogo = 'assets/images/logo/5.svg';
        footerLogo = 'assets/images/logo/5-light.svg';
      } else if (this.theme === 'organic-store') {
        headerLogo = 'assets/images/logo/3.svg';
        footerLogo = 'assets/images/logo/3-light.svg';
      } else if (this.theme === 'style-tech') {
        headerLogo = 'assets/images/logo/4.svg';
        footerLogo = 'assets/images/logo/4.svg';
      }
    } else {
      this.themeOption$.subscribe((theme) => {
        headerLogo = theme?.logo?.header_logo?.asset_url;
        footerLogo = theme?.logo?.footer_logo?.asset_url;
      });
    }
    return { header_logo: headerLogo, footer_logo: footerLogo };
  }

  setBodyClass(path: string) {
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

    link.type = 'image/x-icon';
    link.rel = 'icon';
    link.href = iconPath;

    this.renderer.appendChild(this.document.head, link);
  }
}
