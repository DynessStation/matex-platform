import { NgClass } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { filter, Observable } from 'rxjs';

import { ContactInfo } from './widgets/contact-info/contact-info';
import { FooterAppStoreLink } from './widgets/footer-app-store-link/footer-app-store-link';
import { FooterLinks } from './widgets/footer-links/footer-links';
import { FooterLogo } from './widgets/footer-logo/footer-logo';
import { FooterPaymentOptions } from './widgets/footer-payment-options/footer-payment-options';
import { Option } from '../../interface/theme-option.interface';
import { ThemeOptionState } from '../../store/state/theme-option.state';
import { ThemeState } from '../../store/state/theme.state';

@Component({
  selector: 'app-footer',
  imports: [
    ContactInfo,
    FooterPaymentOptions,
    FooterLogo,
    FooterAppStoreLink,
    FooterLinks,
    NgClass,
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  themeOption$: Observable<Option> = inject(Store).select(ThemeOptionState.themeOptions);
  activeTheme$ = inject(Store).select(ThemeState.activeTheme);

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly logo = input<string>();

  path: string;
  activeTheme: string;
  footerClass = 'footer-section';
  themeOptions: Option;

  active: Record<string, boolean> = {
    information: false,
    our_service: false,
    my_account: false,
  };

  constructor() {
    this.themeOption$.subscribe((option) => (this.themeOptions = option));

    this.route.queryParams.subscribe((params) => {
      this.path = params['theme'];
      this.setFooter();
    });

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.activeTheme$.subscribe((theme) => {
        this.activeTheme = theme;

        if (!this.path) this.path = this.activeTheme;

        this.setFooter();
      });
    });
  }

  toggle(value: string): void {
    this.active[value] = !this.active[value];
  }

  setFooter(): void {
    this.footerClass = 'footer-section';
  }
}
