import { Params } from '../../interface/core.interface';

import { ICreateAttachmentPayload } from '../../interface/attachment.interface';

//==================================================
//==== GET ATTACHMENTS
//==================================================

export class GetAttachmentsAction {
  static readonly type = '[Attachment] Get';

  constructor(public payload?: Params) {}
}

//==================================================
//==== CREATE ATTACHMENT
//==================================================

export class CreateAttachmentAction {
  static readonly type = '[Attachment] Create';

  constructor(public payload: ICreateAttachmentPayload) {}
}

//==================================================
//==== DELETE ATTACHMENT
//==================================================

export class DeleteAttachmentAction {
  static readonly type = '[Attachment] Delete';

  constructor(public id: string) {}
}

//==================================================
//==== DELETE ALL ATTACHMENT
//==================================================

export class DeleteAllAttachmentAction {
  static readonly type = '[Attachment] Delete All';

  constructor(public ids: string[]) {}
}
