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
  selector: 'app-error-500',
  imports: [HomeNewsletter, RouterModule, Breadcrumb],
  templateUrl: './error-500.html',
  styleUrl: './error-500.scss',
})
export class Error500 {
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: '500',
    items: [{ label: '500', active: true }],
  };

  public errorPage: ErrorPage;

  constructor() {
    this.themeOption$.subscribe((option) => {
      this.errorPage = option.error_page;
    });
  }
}
