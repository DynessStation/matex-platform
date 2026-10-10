import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';

import { HeaderFive } from './header-five/header-five';
import { HeaderFour } from './header-four/header-four';
import { HeaderOne } from './header-one/header-one';
import { HeaderThree } from './header-three/header-three';
import { HeaderTwo } from './header-two/header-two';
import { BodyService } from '../../services/body.service';
import { MobileMenu } from './widgets/mobile-menu/mobile-menu';
import { ThemeOptionState } from '../../store/state/theme-option.state';

@Component({
  selector: 'app-header',
  imports: [HeaderOne, HeaderTwo, HeaderThree, HeaderFour, HeaderFive, MobileMenu, AsyncPipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private appliedHeaderStyle = '';

  themeOption$ = this.store.select(ThemeOptionState.themeOptions);

  readonly logo = input<string>();

  public style: string = 'header_one';
  public sticky: boolean = true;
  public path: string;
  public routes: string;

  constructor(public bodyService: BodyService) {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('theme') || ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((path) => {
        this.path = path;
        this.setHeader();
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.routes = this.router.url;
        this.setHeader();
      });

    this.themeOption$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.setHeader());
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
      const theme = this.store.selectSnapshot(ThemeOptionState.themeOptions);
      this.style = theme?.header?.header_options || 'header_one';
      this.sticky = theme?.header?.sticky_header_enable ?? true;
    }
    this.setBodyClass(this.style);
  }

  setBodyClass(path: string) {
    if (this.appliedHeaderStyle === path) return;
    this.appliedHeaderStyle = path;
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
