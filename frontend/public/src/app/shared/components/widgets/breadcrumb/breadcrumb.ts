import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IBreadcrumb } from '../../../interface/breadcrumb.interface';
import { TitleCasePipe } from '../../../pipe/title-case.pipe';
import { PublicNavigationContextService } from '../../../services/public-navigation-context.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.html',
  styleUrls: ['./breadcrumb.scss'],
  imports: [RouterLink, TitleCasePipe],
})
export class Breadcrumb {
  public navigation = inject(PublicNavigationContextService);
  readonly breadcrumb = input<IBreadcrumb | null>();
}
