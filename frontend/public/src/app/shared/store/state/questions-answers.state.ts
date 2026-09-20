import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { QuestionAnswers } from '../../interface/questions-answers.interface';
import { QuestionsAnswerService } from '../../services/questions-answer.service';
import {
  Feedback,
  GetQuestionAnswers,
  SendQuestion,
  UpdateQuestionAnswers,
} from '../action/questions-answers.action';

export class QuestionStateModel {
  question = {
    data: [] as QuestionAnswers[],
    total: 0,
  };
}

@State<QuestionStateModel>({
  name: 'question',
  defaults: {
    question: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class QuestionAnswersState {
  constructor(private questionsAnswersService: QuestionsAnswerService) {}

  @Selector()
  static questionsAnswers(state: QuestionStateModel) {
    return state.question;
  }

  @Action(GetQuestionAnswers)
  getQuestionAnswers(ctx: StateContext<QuestionStateModel>, action: GetQuestionAnswers) {
    this.questionsAnswersService.skeletonLoader = true;
    return this.questionsAnswersService.getQuestionAnswers(action.slug).pipe(
      tap({
        next: (results) => {
          const result = results.data.filter((qna) => qna.product_id == action.slug['product_id']);
          ctx.patchState({
            question: {
              data: result,
              total: result?.length,
            },
          });
        },
        complete: () => {
          this.questionsAnswersService.skeletonLoader = false;
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(SendQuestion)
  sendQuestion(_ctx: StateContext<QuestionStateModel>, _action: SendQuestion) {
    // Submit Question Logic Here
  }

  @Action(UpdateQuestionAnswers)
  update(_ctx: StateContext<QuestionStateModel>, {}: UpdateQuestionAnswers) {
    // Update Question Logic Here
  }

  @Action(Feedback)
  Feedback(ctx: StateContext<QuestionStateModel>, action: Feedback) {
    const state = ctx.getState();
    const question = [...state.question.data];
    const index = question.findIndex(
      (item) => Number(item.id) === Number(action.payload['question_and_answer_id']),
    );

    if (index !== -1 && (action.type === 'liked' || action.type === 'disliked')) {
      const currentReaction = question[index].reaction;
      const newReaction = action.payload['reaction'];

      if (currentReaction === newReaction) {
        // Undo the same reaction
        if (action.type === 'liked') {
          question[index].total_likes -= 1;
        } else {
          question[index].total_dislikes -= 1;
        }
        question[index].reaction = null;
        action.payload['reaction'] = null;
      } else {
        // Switch reaction or react for the first time
        if (currentReaction === 'liked') {
          question[index].total_likes -= 1;
        } else if (currentReaction === 'disliked') {
          question[index].total_dislikes -= 1;
        }

        if (action.type === 'liked') {
          question[index].total_likes += 1;
        } else {
          question[index].total_dislikes += 1;
        }

        question[index].reaction = newReaction;
        action.payload['reaction'] = newReaction;
      }
    }

    ctx.patchState({
      ...state,
      question: {
        data: question,
        total: state.question.total,
      },
    });

    // Removed: return this.questionsAnswersService.feedback(action.payload);
    // Pure state update only (no API call)
  }
}
