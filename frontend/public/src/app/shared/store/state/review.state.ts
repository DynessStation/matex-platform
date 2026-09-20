import { Injectable } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { Review } from '../../interface/review.interface';
import { ReviewService } from '../../services/review.service';
import { GetReview, SendReview, UpdateReview } from '../action/review.action';

export class ReviewStateModel {
  review = {
    data: [] as Review[] | [],
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
  constructor(private reviewsService: ReviewService) {}

  @Selector()
  static review(state: ReviewStateModel) {
    return state.review;
  }

  @Action(GetReview)
  getReview(ctx: StateContext<ReviewStateModel>, action: GetReview) {
    return this.reviewsService.getReview(action.payload).pipe(
      tap({
        next: (results) => {
          const result = results.data.filter(
            (review) => review.product_id == action.payload['product_id'],
          );
          ctx.patchState({
            review: {
              data: result,
              total: result?.length,
            },
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(SendReview)
  sendReview(_ctx: StateContext<ReviewStateModel>, _action: SendReview) {
    // Submit Review Logic Here
  }

  @Action(UpdateReview)
  update(_ctx: StateContext<ReviewStateModel>, {}: UpdateReview) {
    // Update Review Logic Here
  }
}
