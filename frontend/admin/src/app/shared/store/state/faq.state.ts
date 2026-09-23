import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { forkJoin, tap } from 'rxjs';

import { IFaqDetail, IFaqModel } from '../../interface/faq.interface';
import { ApiMessageService } from '../../services/api-message.service';
import { FaqService } from '../../services/faq.service';
import { NotificationService } from '../../services/notification.service';
import {
  CreateFaqAction, DeleteAllFaqAction, DeleteFaqAction, EditFaqAction,
  GetFaqsAction, UpdateFaqAction, UpdateFaqStatusAction,
} from '../action/faq.action';

export interface FaqStateModel {
  faq: IFaqModel | null;
  selectedFaq: IFaqDetail | null;
}

@State<FaqStateModel>({ name: 'faq', defaults: { faq: null, selectedFaq: null } })
@Injectable()
export class FaqState {
  private faqService = inject(FaqService);
  private messages = inject(ApiMessageService);
  private notifications = inject(NotificationService);

  @Selector() static faq(state: FaqStateModel) { return state.faq; }
  @Selector() static selectedFaq(state: FaqStateModel) { return state.selectedFaq; }

  @Action(GetFaqsAction)
  getFaqs(ctx: StateContext<FaqStateModel>, action: GetFaqsAction) {
    return this.faqService.getFaqs(action.payload).pipe(tap(result => ctx.patchState({ faq: result })));
  }

  @Action(CreateFaqAction)
  create(_ctx: StateContext<FaqStateModel>, action: CreateFaqAction) {
    return this.faqService.createFaq(action.payload).pipe(tap(result =>
      this.notifications.showSuccess(this.messages.resolveResponse(result))));
  }

  @Action(EditFaqAction)
  edit(ctx: StateContext<FaqStateModel>, action: EditFaqAction) {
    ctx.patchState({ selectedFaq: null });
    return this.faqService.getFaq(action.id).pipe(tap(result =>
      ctx.patchState({ selectedFaq: result.data ?? null })));
  }

  @Action(UpdateFaqAction)
  update(_ctx: StateContext<FaqStateModel>, action: UpdateFaqAction) {
    return this.faqService.updateFaq(action.id, action.payload).pipe(tap(result =>
      this.notifications.showSuccess(this.messages.resolveResponse(result))));
  }

  @Action(UpdateFaqStatusAction)
  updateStatus(_ctx: StateContext<FaqStateModel>, action: UpdateFaqStatusAction) {
    return this.faqService.updateFaqStatus(action.id, action.status).pipe(tap(result =>
      this.notifications.showSuccess(this.messages.resolveResponse(result))));
  }

  @Action(DeleteFaqAction)
  delete(_ctx: StateContext<FaqStateModel>, action: DeleteFaqAction) {
    return this.faqService.deleteFaq(action.id).pipe(tap(result =>
      this.notifications.showSuccess(this.messages.resolveResponse(result))));
  }

  @Action(DeleteAllFaqAction)
  deleteAll(_ctx: StateContext<FaqStateModel>, action: DeleteAllFaqAction) {
    return forkJoin(action.ids.map(id => this.faqService.deleteFaq(id))).pipe(tap(() =>
      this.notifications.showSuccess('FAQ deleted successfully')));
  }
}
