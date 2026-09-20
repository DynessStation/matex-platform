import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { NoData } from '../../../shared/components/no-data/no-data';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { FaqModel } from '../../../shared/interface/page.interface';
import { PageService } from '../../../shared/services/page.service';
import { GetFaqs } from '../../../shared/store/action/page.action';
import { PageState } from '../../../shared/store/state/page.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-faq',
  imports: [AsyncPipe, NgbAccordionModule, NoData, Breadcrumb, HomeNewsletter, TranslateModule],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {
  private store = inject(Store);
  faq$: Observable<FaqModel> = this.store.select(PageState.faq);

  public breadcrumb: breadcrumb = {
    title: "FAQ's",
    items: [{ label: "FAQ's", active: true }],
  };

  constructor(public pageService: PageService) {
    this.store.dispatch(new GetFaqs());
  }
}
