import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, map, of, switchMap } from 'rxjs';

import {
  PublicContactChannel,
  PublicContactData,
  PublicOffice,
} from '../../interface/public-content.interface';
import { IPublicNavigationItem } from '../../interface/public-navigation.interface';
import { PublicContentService } from '../../services/public-content.service';
import { PublicNavigationContextService } from '../../services/public-navigation-context.service';

@Component({
  selector: 'app-footer',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private content = inject(PublicContentService);
  public navigation = inject(PublicNavigationContextService);

  readonly logo = input<string>();
  public active: Record<string, boolean> = { company: false, explore: false, contact: false };

  readonly contact$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      this.content.getContact(locale).pipe(
        map((response) => response.data ?? this.emptyContact(locale)),
        catchError(() => of(this.emptyContact(locale))),
      ),
    ),
  );
  readonly currentYear = new Date().getFullYear();

  get locale(): string {
    return this.navigation.locale();
  }

  get companyLinks(): IPublicNavigationItem[] {
    return this.navigation.primaryItems().filter((item) => item.path || item.url);
  }

  get quickLinks(): Array<{ label: string; path: string }> {
    return this.locale === 'en-US'
      ? [
          { label: 'Product Catalog', path: '/en/catalog' },
          { label: 'Articles', path: '/en/articles' },
          { label: 'FAQ', path: '/en/faq' },
          { label: 'Contact Us', path: '/en/contact-us' },
        ]
      : [
          { label: 'Katalog Produk', path: '/katalog' },
          { label: 'Artikel', path: '/artikel' },
          { label: 'Pertanyaan Umum', path: '/faq' },
          { label: 'Hubungi Kami', path: '/kontak' },
        ];
  }

  get homePath(): string {
    return this.locale === 'en-US' ? '/en' : '/';
  }

  get contactPath(): string {
    return this.locale === 'en-US' ? '/en/contact-us' : '/kontak';
  }

  toggle(section: string) {
    this.active[section] = !this.active[section];
  }

  primaryOffice(data: PublicContactData | null): PublicOffice | null {
    return data?.offices?.[0] ?? null;
  }

  primaryChannel(data: PublicContactData | null, type: string): PublicContactChannel | null {
    const channels = data?.channels ?? [];
    return channels.find((channel) => channel.type === type && channel.is_primary)
      ?? channels.find((channel) => channel.type === type)
      ?? null;
  }

  channelIcon(type: string): string {
    const icons: Record<string, string> = {
      whatsapp: 'ri-whatsapp-line',
      phone: 'ri-phone-line',
      email: 'ri-mail-line',
      instagram: 'ri-instagram-line',
      facebook: 'ri-facebook-fill',
      linkedin: 'ri-linkedin-fill',
      youtube: 'ri-youtube-line',
    };
    return icons[type] ?? 'ri-links-line';
  }

  private emptyContact(locale: string): PublicContactData {
    return { locale, channels: [], topics: [], offices: [] };
  }
}
