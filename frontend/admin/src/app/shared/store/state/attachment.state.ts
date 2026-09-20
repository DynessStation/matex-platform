import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import { IAttachmentModel } from '../../interface/attachment.interface';

import { AttachmentService } from '../../services/attachment.service';

import { NotificationService } from '../../services/notification.service';

import { ApiMessageService } from '../../services/api-message.service';

import {
  CreateAttachmentAction,
  DeleteAllAttachmentAction,
  DeleteAttachmentAction,
  GetAttachmentsAction,
} from '../action/attachment.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface AttachmentStateModel {
  attachment: IAttachmentModel;
}

//==================================================
//==== STATE
//==================================================

@State<AttachmentStateModel>({
  name: 'attachment',

  defaults: {
    attachment: {
      data: [],

      total: 0,

      current_page: 1,

      per_page: 20,

      last_page: 1,
    },
  },
})
@Injectable()
export class AttachmentState {
  private attachmentService = inject(AttachmentService);

  private notificationService = inject(NotificationService);

  private apiMessageService = inject(ApiMessageService);

  //==================================================
  //==== SELECTOR
  //==================================================

  @Selector()
  static attachment(state: AttachmentStateModel) {
    return state.attachment;
  }

  //==================================================
  //==== GET ATTACHMENTS
  //==================================================

  @Action(GetAttachmentsAction)
  getAttachments(
    ctx: StateContext<AttachmentStateModel>,

    action: GetAttachmentsAction,
  ) {
    return this.attachmentService.getAttachments(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          attachment: result,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE ATTACHMENT
  //==================================================

  @Action(CreateAttachmentAction)
  createAttachment(
    ctx: StateContext<AttachmentStateModel>,

    action: CreateAttachmentAction,
  ) {
    return this.attachmentService.createAttachment(action.payload).pipe(
      tap((result) => {
        const state = ctx.getState();

        const current = state.attachment;

        ctx.patchState({
          attachment: {
            ...current,

            data: [...result.data, ...(current.data ?? [])],

            total: (current.total ?? 0) + result.data.length,
          },
        });

        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== DELETE ATTACHMENT
  //==================================================

  @Action(DeleteAttachmentAction)
  deleteAttachment(
    ctx: StateContext<AttachmentStateModel>,

    action: DeleteAttachmentAction,
  ) {
    return this.attachmentService.deleteAttachment(action.id).pipe(
      tap((result) => {
        const state = ctx.getState();

        const attachment = state.attachment;

        ctx.patchState({
          attachment: {
            ...attachment,

            data: attachment.data.filter(
              (item) => item.id_attachment !== action.id,
            ),

            total: Math.max(0, attachment.total - 1),
          },
        });

        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== DELETE ALL ATTACHMENT
  //==================================================

  @Action(DeleteAllAttachmentAction)
  deleteAllAttachment(
    ctx: StateContext<AttachmentStateModel>,

    action: DeleteAllAttachmentAction,
  ) {
    return this.attachmentService.deleteAttachments(action.ids).pipe(
      tap((result) => {
        const state = ctx.getState();

        const attachment = state.attachment;

        const deletedIds = new Set(action.ids);

        ctx.patchState({
          attachment: {
            ...attachment,

            data: attachment.data.filter(
              (item) => !deletedIds.has(item.id_attachment),
            ),

            total: Math.max(0, attachment.total - result.data.deleted),
          },
        });

        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }
}
