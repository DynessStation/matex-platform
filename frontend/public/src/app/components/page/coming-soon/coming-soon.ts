import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { catchError, map, of, switchMap } from 'rxjs';

import {
  MARKET_FEATURES,
  MARKET_ICONS,
  marketText,
  whatsappLink,
} from '../../../shared/data/market-preview';
import { PublicContentService } from '../../../shared/services/public-content.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';

// /account and the other market routes (P-1): "MATEX Market segera hadir", like the header
// panel, with WhatsApp (or the contact page) and the catalog.
@Component({
  selector: 'app-coming-soon',
  imports: [AsyncPipe, RouterModule],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.scss',
})
export class ComingSoon {
  private navigation = inject(PublicNavigationContextService);
  private content = inject(PublicContentService);

  readonly features = MARKET_FEATURES;
  readonly icons = MARKET_ICONS;

  readonly whatsapp$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      this.content.getContact(locale).pipe(
        map((response) => whatsappLink(response.data)),
        catchError(() => of(null)),
      ),
    ),
  );

  get isEnglish(): boolean {
    return this.navigation.locale() === 'en-US';
  }

  get text() {
    return marketText(this.isEnglish);
  }

  get homePath(): string {
    return this.isEnglish ? '/en' : '/';
  }

  get catalogPath(): string {
    return this.isEnglish ? '/en/catalog' : '/katalog';
  }

  get contactPath(): string {
    return this.isEnglish ? '/en/contact-us' : '/kontak';
  }
}
