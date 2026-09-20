import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IFaq } from '../../interface/faq.interface';
import { FaqService } from '../../services/faq.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateFaqAction,
  DeleteAllFaqAction,
  DeleteFaqAction,
  EditFaqAction,
  GetFaqsAction,
  UpdateFaqAction,
  UpdateFaqStatusAction,
} from '../action/faq.action';

export class FaqStateModel {
  faq = {
    data: [] as IFaq[],
    total: 0,
  };
  selectedFaq: IFaq | null;
}

@State<FaqStateModel>({
  name: 'faq',
  defaults: {
    faq: {
      data: [],
      total: 0,
    },
    selectedFaq: null,
  },
})
@Injectable()
export class FaqState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private faqService = inject(FaqService);

  @Selector()
  static faq(state: FaqStateModel) {
    return state.faq;
  }

  @Selector()
  static selectedFaq(state: FaqStateModel) {
    return state.selectedFaq;
  }

  @Action(GetFaqsAction)
  getFaqs(ctx: StateContext<FaqStateModel>, action: GetFaqsAction) {
    return this.faqService.getFaqs(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            faq: {
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

  @Action(CreateFaqAction)
  create(_ctx: StateContext<FaqStateModel>, _action: CreateFaqAction) {
    // Create FAQ logic here
  }

  @Action(EditFaqAction)
  edit(ctx: StateContext<FaqStateModel>, { id }: EditFaqAction) {
    return this.faqService.getFaqs().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(faq => faq.id == id);
          ctx.patchState({
            ...state,
            selectedFaq: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateFaqAction)
  update(_ctx: StateContext<FaqStateModel>, { payload: _payload, id: _id }: UpdateFaqAction) {
    // Update FAQ logic here
  }

  @Action(UpdateFaqStatusAction)
  updateStatus(
    _ctx: StateContext<FaqStateModel>,
    { id: _id, status: _status }: UpdateFaqStatusAction,
  ) {
    // Update FAQ status logic here
  }

  @Action(DeleteFaqAction)
  delete(_ctx: StateContext<FaqStateModel>, { id: _id }: DeleteFaqAction) {
    // Delete FAQ logic here
  }

  @Action(DeleteAllFaqAction)
  deleteAll(_ctx: StateContext<FaqStateModel>, { ids: _ids }: DeleteAllFaqAction) {
    // Delete all FAQ logic here
  }
}
