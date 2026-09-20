import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { LoaderState } from '../../store/state/loader.state';
import { Loader } from '../loader/loader';

@Component({
  selector: 'app-page-wrapper',
  imports: [CommonModule, TranslateModule, Loader],
  templateUrl: './page-wrapper.html',
  styleUrl: './page-wrapper.scss',
})
export class PageWrapper {
  readonly title = input<string>(undefined);
  readonly grid = input<boolean>(true);
  readonly gridClass = input<string>('col-xxl-8 col-xl-10 m-auto');

  loadingStatus$: Observable<boolean> = inject(Store).select(
    LoaderState.status,
  ) as Observable<boolean>;
}
