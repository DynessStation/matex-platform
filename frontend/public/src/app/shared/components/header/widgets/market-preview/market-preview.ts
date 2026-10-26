import { AsyncPipe } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, map, of, switchMap } from 'rxjs';

import {
  MARKET_FEATURES,
  MARKET_ICONS,
  MarketFeature,
  marketText,
  whatsappLink,
} from '../../../../data/market-preview';
import { PublicContentService } from '../../../../services/public-content.service';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

// Account, favorites, and cart icons in the header (P-1) with a "Segera" label. Any of them opens
// one small "MATEX Market segera hadir" panel beside the icons, with WhatsApp and the catalog.
@Component({
  selector: 'app-market-preview',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './market-preview.html',
  styleUrl: './market-preview.scss',
})
export class MarketPreview {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private content = inject(PublicContentService);
  public navigation = inject(PublicNavigationContextService);

  readonly features = MARKET_FEATURES;
  readonly icons = MARKET_ICONS;

  /** The icon that opened the panel, or null while it is closed. */
  readonly open = signal<MarketFeature | null>(null);

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

  get catalogPath(): string {
    return this.isEnglish ? '/en/catalog' : '/katalog';
  }

  get contactPath(): string {
    return this.isEnglish ? '/en/contact-us' : '/kontak';
  }

  toggle(feature: MarketFeature): void {
    this.open.set(this.open() === feature ? null : feature);
  }

  close(): void {
    this.open.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
