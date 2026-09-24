import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { catchError, map, of, switchMap } from 'rxjs';

import { PublicContactChannel } from '../../../../shared/interface/public-content.interface';
import { PublicContentService } from '../../../../shared/services/public-content.service';
import { PublicNavigationContextService } from '../../../../shared/services/public-navigation-context.service';

@Component({
  selector: 'app-home-newsletter',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './home-newsletter.html',
  styleUrl: './home-newsletter.scss',
})
export class HomeNewsletter {
  private content = inject(PublicContentService);
  public navigation = inject(PublicNavigationContextService);
  type = input<string>('default');

  readonly channels$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      this.content.getContact(locale).pipe(
        map((response) => response.data?.channels ?? []),
        catchError(() => of([] as PublicContactChannel[])),
      ),
    ),
  );

  get locale(): string {
    return this.navigation.locale();
  }

  get contactPath(): string {
    return this.locale === 'en-US' ? '/en/contact-us' : '/kontak';
  }

  whatsapp(channels: PublicContactChannel[]): PublicContactChannel | null {
    return channels.find((channel) => channel.type === 'whatsapp' && channel.is_primary)
      ?? channels.find((channel) => channel.type === 'whatsapp')
      ?? null;
  }
}
