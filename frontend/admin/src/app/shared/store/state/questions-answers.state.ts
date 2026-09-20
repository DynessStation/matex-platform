import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IQuestionAnswers } from '../../interface/questions-answers.interface';
import { NotificationService } from '../../services/notification.service';
import { QuestionsAnswersService } from '../../services/questions-answers.service';
import {
  GetQuestionAnswersAction,
  EditQuestionAnswersAction,
  UpdateQuestionAnswersAction,
  DeleteAllQuestionAnswersAction,
  DeleteQuestionAnswersAction,
} from '../action/questions-answers.action';

export class QuestionAnswersStateModel {
  question = {
    data: [] as IQuestionAnswers[],
    total: 0,
  };
  selectedQuestion: IQuestionAnswers | null;
}

@State<QuestionAnswersStateModel>({
  name: 'question',
  defaults: {
    question: {
      data: [],
      total: 0,
    },
    selectedQuestion: null,
  },
})
@Injectable()
export class QuestionAnswersState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private questionsAnswersService = inject(QuestionsAnswersService);

  @Selector()
  static questionAnswers(state: QuestionAnswersStateModel) {
    return state.question;
  }

  @Selector()
  static selectedQuestionAnswers(state: QuestionAnswersStateModel) {
    return state.selectedQuestion;
  }

  @Action(GetQuestionAnswersAction)
  getQuestionAnswers(
    ctx: StateContext<QuestionAnswersStateModel>,
    action: GetQuestionAnswersAction,
  ) {
    return this.questionsAnswersService.getQuestionAnswers(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            question: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(EditQuestionAnswersAction)
  edit(ctx: StateContext<QuestionAnswersStateModel>, { id }: EditQuestionAnswersAction) {
    return this.questionsAnswersService.getQuestionAnswers().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(qna => qna.id == id);
          ctx.patchState({
            ...state,
            selectedQuestion: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateQuestionAnswersAction)
  update(
    _ctx: StateContext<QuestionAnswersStateModel>,
    { payload: _payload, id: _id }: UpdateQuestionAnswersAction,
  ) {
    // Update Question Answers Logic Here
  }

  @Action(DeleteQuestionAnswersAction)
  delete(_ctx: StateContext<QuestionAnswersStateModel>, { id: _id }: DeleteQuestionAnswersAction) {
    // Delete Question Answers Logic Here
  }

  @Action(DeleteAllQuestionAnswersAction)
  deleteAll(
    _ctx: StateContext<QuestionAnswersStateModel>,
    { ids: _ids }: DeleteAllQuestionAnswersAction,
  ) {
    // Delete All Question Answers Logic Here
  }
}
