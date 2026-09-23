import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, map, of } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { NoData } from '../../../shared/components/no-data/no-data';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { PublicContentService } from '../../../shared/services/public-content.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-faq',
  imports: [AsyncPipe, NgbAccordionModule, NoData, Breadcrumb, HomeNewsletter, TranslateModule],
  templateUrl: './faq.html', styleUrl: './faq.scss',
})
export class Faq {
  private content = inject(PublicContentService);
  private navigation = inject(PublicNavigationContextService);
  readonly locale = this.navigation.locale();
  readonly faq$ = this.content.getFaq(this.locale).pipe(map(response => response.data?.items ?? []), catchError(() => of([])));
  readonly breadcrumb: breadcrumb = {
    title: this.locale === 'en-US' ? 'Frequently Asked Questions' : 'Pertanyaan Umum',
    items: [{ label: this.locale === 'en-US' ? 'FAQ' : 'Pertanyaan Umum', active: true }],
  };
}
