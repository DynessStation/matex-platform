import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicNavigationContextService } from '../../../../services/public-navigation-context.service';

@Component({
  selector: 'app-user-profile',
  imports: [RouterLink],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {
  public navigation = inject(PublicNavigationContextService);
}
