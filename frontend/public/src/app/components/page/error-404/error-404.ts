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
  selector: 'app-error-404',
  imports: [HomeNewsletter, RouterModule, Breadcrumb],
  templateUrl: './error-404.html',
  styleUrl: './error-404.scss',
})
export class Error404 {
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: '404',
    items: [{ label: '404', active: true }],
  };

  public errorPage: ErrorPage;

  constructor() {
    this.themeOption$.subscribe((option) => {
      this.errorPage = option.error_page;
    });
  }
}
