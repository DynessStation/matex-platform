import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { LoaderState } from '../../store/state/loader.state';
import { Loader } from '../loader/loader';
import { BackButton } from '../ui/back-button/back-button';
import { HelpTip } from '../ui/help/help-tip/help-tip';

@Component({
  selector: 'app-page-wrapper',
  imports: [CommonModule, TranslateModule, Loader, HelpTip, BackButton],
  templateUrl: './page-wrapper.html',
  styleUrl: './page-wrapper.scss',
})
export class PageWrapper {
  readonly title = input<string>(undefined);
  readonly grid = input<boolean>(true);
  readonly gridClass = input<string>('col-xxl-8 col-xl-10 m-auto');
  /** List path for the "Kembali" button of a form page (U-7); none when empty. */
  readonly back = input<string>('');

  loadingStatus$: Observable<boolean> = inject(Store).select(
    LoaderState.status,
  ) as Observable<boolean>;
}
