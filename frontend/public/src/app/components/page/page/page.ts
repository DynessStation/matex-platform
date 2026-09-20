import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { IBreadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { IPage } from '../../../shared/interface/page.interface';
import { PageService } from '../../../shared/services/page.service';
import { PageState } from '../../../shared/store/state/page.state';

@Component({
  selector: 'app-page',
  imports: [Breadcrumb, AsyncPipe],
  templateUrl: './page.html',
  styleUrl: './page.scss',
})
export class Page {
  private meta = inject(Meta);
  pageService = inject(PageService);

  selectedPage$: Observable<IPage> = inject(Store).select(
    PageState.selectedPage,
  ) as Observable<IPage>;

  public breadcrumb: IBreadcrumb = {
    title: 'Page',
    items: [],
  };

  constructor() {
    this.selectedPage$.subscribe((page) => {
      this.breadcrumb.items = [];
      this.breadcrumb.title = page.title;
      this.breadcrumb.items.push(
        { label: 'Page', active: true },
        { label: page.title, active: false },
      );
      page?.meta_title && this.meta.updateTag({ property: 'og:title', content: page?.meta_title });
      page?.meta_description &&
        this.meta.updateTag({ property: 'og:description', content: page?.meta_description });
    });
  }
}
