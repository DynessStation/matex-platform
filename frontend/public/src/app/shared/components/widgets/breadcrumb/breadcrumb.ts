import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IBreadcrumb } from '../../../interface/breadcrumb.interface';
import { TitleCasePipe } from '../../../pipe/title-case.pipe';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.html',
  styleUrls: ['./breadcrumb.scss'],
  imports: [RouterLink, TitleCasePipe],
})
export class Breadcrumb {
  readonly breadcrumb = input<IBreadcrumb | null>();
}
