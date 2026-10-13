import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';

@Component({
  selector: 'app-coming-soon',
  imports: [RouterModule],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.scss',
})
export class ComingSoon {
  private navigation = inject(PublicNavigationContextService);

  get isEnglish(): boolean {
    return this.navigation.locale() === 'en-US';
  }

  get homePath(): string {
    return this.isEnglish ? '/en' : '/';
  }
}
