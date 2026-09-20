import { Component, inject, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { Product } from '../../../interface/product.interface';
import { QuestionAnswers } from '../../../interface/questions-answers.interface';
import {
  SendQuestion,
  UpdateQuestionAnswers,
} from '../../../store/action/questions-answers.action';
import { Button } from '../../button/button';

@Component({
  selector: 'app-question-modal',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, Button, TranslateModule],
  templateUrl: './question-modal.html',
  styleUrl: './question-modal.scss',
})
export class QuestionModal {
  @Input() product: Product;
  @Input() qna: QuestionAnswers;

  public question = new FormControl();
  public type = 'crate';
  public id: number;

  private store = inject(Store);

  constructor(public modal: NgbActiveModal) {}

  ngOnInit() {
    if (this.qna) {
      this.type = 'edit';
      this.id = this.qna.id;
      this.question.patchValue(this.qna.question);
    }
  }

  submit() {
    let data = {
      question: this.question.value,
      product_id: this.product.id,
      answer: '',
    };
    let action = new SendQuestion(data);
    if (data.question || data.product_id) {
      if (this.type == 'edit' && this.id) {
        action = new UpdateQuestionAnswers(data, this.id);
      }
      this.store.dispatch(action).subscribe({
        complete: () => {
          this.modal.close();
        },
      });
    }
  }
}
