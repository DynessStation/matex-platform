import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { catchError, map, of, switchMap } from 'rxjs';

import { socialIcon } from '../../../../data/social-platforms';
import { PublicContentService } from '../../../../services/public-content.service';
import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

// The accounts set under Pengaturan Kontak in the admin.
@Component({
  selector: 'app-social-media',
  imports: [AsyncPipe],
  templateUrl: './social-media.html',
  styleUrl: './social-media.scss',
})
export class SocialMedia {
  private readonly content = inject(PublicContentService);
  private readonly navigation = inject(PublicNavigationContextService);

  readonly icon = socialIcon;
  readonly socials$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      this.content.getContact(locale).pipe(
        map((response) => response.data?.socials ?? []),
        catchError(() => of([])),
      ),
    ),
  );
}
