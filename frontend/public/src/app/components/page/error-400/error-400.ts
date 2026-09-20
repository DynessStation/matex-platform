import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { ErrorPage, Option } from '../../../shared/interface/theme-option.interface';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-error-400',
  imports: [HomeNewsletter, RouterModule, Breadcrumb],
  templateUrl: './error-400.html',
  styleUrl: './error-400.scss',
})
export class Error400 {
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: '400',
    items: [{ label: '400', active: true }],
  };

  public errorPage: ErrorPage;

  constructor() {
    this.themeOption$.subscribe((option) => {
      this.errorPage = option.error_page;
    });
  }
}
