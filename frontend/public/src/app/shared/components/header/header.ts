import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { HeaderFive } from './header-five/header-five';
import { HeaderFour } from './header-four/header-four';
import { HeaderOne } from './header-one/header-one';
import { HeaderThree } from './header-three/header-three';
import { HeaderTwo } from './header-two/header-two';
import { BodyService } from '../../services/body.service';
import { MobileMenu } from './widgets/mobile-menu/mobile-menu';
import { ThemeOptionState } from '../../store/state/theme-option.state';
import { ThemeState } from '../../store/state/theme.state';

@Component({
  selector: 'app-header',
  imports: [HeaderOne, HeaderTwo, HeaderThree, HeaderFour, HeaderFive, MobileMenu, AsyncPipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  themeOption$ = inject(Store).select(ThemeOptionState.themeOptions);
  activeTheme$ = inject(Store).select(ThemeState.activeTheme);

  readonly logo = input<string>();

  public style: string = 'header_one';
  public sticky: boolean = true;
  public path: string;
  public routes: string;
  public activeTheme: string;

  constructor(public bodyService: BodyService) {
    this.route.queryParams.subscribe((params) => (this.path = params['theme']));
    this.route.queryParams.subscribe((params) => {
      this.path = params['theme'];
    });
    void this.router.events.forEach((event) => {
      if (event instanceof NavigationEnd) {
        this.routes = this.router.url;
        this.activeTheme$.subscribe((res) => (this.activeTheme = res));
        this.setHeader();
      }
    });
  }

  setHeader() {
    if (this.path) {
      switch (this.path) {
        case 'gadget-store':
          this.style = 'header_one';
          break;
        case 'mega-mart':
          this.style = 'header_two';
          break;
        case 'organic-store':
        case 'style-tech':
          this.style = 'header_three';
          break;
        case 'baby-shop':
          this.style = 'header_four';
          break;
        case 'electro':
          this.style = 'header_five';
          break;
      }
    } else {
      this.themeOption$.subscribe((theme) => {
        this.style = theme?.header?.header_options || 'header_one';
        this.sticky = theme?.header?.sticky_header_enable ?? this.sticky;
      });
    }
  }

  setBodyClass(path: string) {
    this.bodyService.removeClass('base-bg-color');

    switch (path) {
      case 'header_one':
        this.bodyService.addClass('base-bg-color');
        break;
      case 'header_two':
        this.bodyService.addClass('base-bg-color');
        break;
      case 'header_three':
        this.style = 'header_three';
        break;
      case 'header_four':
        this.style = 'header_four';
        break;
      case 'header_five':
        this.style = 'header_five';
        break;
    }
  }
}
