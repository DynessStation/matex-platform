import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IReview } from '../../interface/review.interface';
import { NotificationService } from '../../services/notification.service';
import { ReviewService } from '../../services/review.service';
import {
  GetReviewsAction,
  DeleteReviewAction,
  DeleteAllReviewAction,
} from '../action/review.action';

export class ReviewStateModel {
  review = {
    data: [] as IReview[],
    total: 0,
  };
}

@State<ReviewStateModel>({
  name: 'review',
  defaults: {
    review: {
      data: [],
      total: 0,
    },
  },
})
@Injectable()
export class ReviewState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private reviewService = inject(ReviewService);

  @Selector()
  static review(state: ReviewStateModel) {
    return state.review;
  }

  @Action(GetReviewsAction)
  getReviews(ctx: StateContext<ReviewStateModel>, action: GetReviewsAction) {
    return this.reviewService.getReviews(action?.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            review: {
              data: result.data,
              total: result?.total ? result?.total : result.data.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(DeleteReviewAction)
  delete(_ctx: StateContext<ReviewStateModel>, { id: _d }: DeleteReviewAction) {
    // Delete Review Logic Here
  }

  @Action(DeleteAllReviewAction)
  deleteAll(_ctx: StateContext<ReviewStateModel>, { ids: _ids }: DeleteAllReviewAction) {
    // Delete All Review Logic Here
  }
}
