import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Product } from '../../../../../../shared/interface/product.interface';
import { QnAModel } from '../../../../../../shared/interface/questions-answers.interface';
import { ReviewModel } from '../../../../../../shared/interface/review.interface';
import { GetQuestionAnswers } from '../../../../../../shared/store/action/questions-answers.action';
import { GetReview } from '../../../../../../shared/store/action/review.action';
import { QuestionAnswersState } from '../../../../../../shared/store/state/questions-answers.state';
import { ReviewState } from '../../../../../../shared/store/state/review.state';
import { ProductQuestionsAnswers } from '../product-questions-answers/product-questions-answers';
import { ProductReview } from '../product-review/product-review';

@Component({
  selector: 'app-product-details-tab',
  imports: [NgbModule, ProductReview, ProductQuestionsAnswers, AsyncPipe],
  templateUrl: './product-details-tab.html',
  styleUrl: './product-details-tab.scss',
})
export class ProductDetailsTab {
  private store = inject(Store);

  review$: Observable<ReviewModel> = this.store.select(ReviewState.review);
  question$: Observable<QnAModel> = this.store.select(QuestionAnswersState.questionsAnswers);

  product = input<Product | null>(null);

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    const product = this.product();

    if (product) {
      this.store.dispatch(new GetReview({ product_id: product.id }));
      this.store.dispatch(new GetQuestionAnswers({ product_id: product.id }));
    }
  }

  getTrustedHtml(data?: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(data!);
  }
}
