import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

@Component({
  selector: 'app-top-bar-menu',
  imports: [RouterLink],
  templateUrl: './top-bar-menu.html',
  styleUrl: './top-bar-menu.scss',
})
export class TopBarMenu {
  public navigation = inject(PublicNavigationContextService);

  get articlePath(): string {
    return this.navigation.locale() === 'en-US' ? '/en/articles' : '/artikel';
  }

  get contactPath(): string {
    return this.navigation.locale() === 'en-US' ? '/en/contact-us' : '/kontak';
  }
}
