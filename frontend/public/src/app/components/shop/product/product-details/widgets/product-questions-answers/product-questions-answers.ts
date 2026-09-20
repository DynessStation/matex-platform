import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormControl } from '@angular/forms';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';

import { QuestionModal } from '../../../../../../shared/components/modal/question-modal/question-modal';
import { NoData } from '../../../../../../shared/components/no-data/no-data';
import { AccountUser } from '../../../../../../shared/interface/account.interface';
import { Product } from '../../../../../../shared/interface/product.interface';
import { QuestionAnswers } from '../../../../../../shared/interface/questions-answers.interface';
import { QuestionsAnswerService } from '../../../../../../shared/services/questions-answer.service';
import { GetUserDetails } from '../../../../../../shared/store/action/account.action';
import { Feedback } from '../../../../../../shared/store/action/questions-answers.action';
import { AccountState } from '../../../../../../shared/store/state/account.state';

@Component({
  selector: 'app-product-questions-answers',
  imports: [NoData, TranslateModule, AsyncPipe],
  templateUrl: './product-questions-answers.html',
  styleUrl: './product-questions-answers.scss',
})
export class ProductQuestionsAnswers {
  private store = inject(Store);
  user$: Observable<AccountUser | null> = this.store.select(AccountState.user);
  product = input<Product>();
  questionAnswers = input<QuestionAnswers[]>();

  public question = new FormControl();
  public isLogin: boolean = false;
  public skeletonItems = Array.from({ length: 5 }, (_, index) => index);
  private destroy$ = new Subject<void>();

  constructor(
    public questionAnswersService: QuestionsAnswerService,
    private modal: NgbModal,
  ) {
    this.isLogin = !!this.store.selectSnapshot((state) => state.auth && state.auth.access_token);
    if (this.isLogin) {
      this.store.dispatch(new GetUserDetails());
    }
  }

  openModal(product: Product, qna?: QuestionAnswers) {
    if (qna) {
      if (this.isLogin) {
        const qnaModal = this.modal.open(QuestionModal, {
          size: 'm',
          centered: true,
          windowClass: 'theme-modal',
        });
        qnaModal.componentInstance.product = product;
        qnaModal.componentInstance.qna = qna;
      }
    } else {
      const qnaModal = this.modal.open(QuestionModal, {
        size: 'm',
        centered: true,
        windowClass: 'theme-modal question-answer-modal',
      });
      qnaModal.componentInstance.product = product;
      qnaModal.componentInstance.qna = qna;
    }
  }

  feedback(qna: QuestionAnswers, value: string) {
    const data = {
      question_and_answer_id: qna.id,
      reaction: value,
    };
    this.store.dispatch(new Feedback(data, value));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
