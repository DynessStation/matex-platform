import { Component, inject, viewChild } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';

import {
  MediaBox,
  MediaSelection,
} from '../../shared/components/ui/media-box/media-box';

import { DeleteModal } from '../../shared/components/ui/modal/delete-modal/delete-modal';

import { MediaModal } from '../../shared/components/ui/modal/media-modal/media-modal';

import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';

import { IAttachment } from '../../shared/interface/attachment.interface';

import { DeleteAllAttachmentAction } from '../../shared/store/action/attachment.action';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-media',

  imports: [
    TranslateModule,
    HasPermissionDirective,
    PageWrapper,
    MediaBox,
    MediaModal,
    DeleteModal,
  ],

  templateUrl: './media.html',

  styleUrl: './media.scss',
})
export class Media {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  //==================================================
  //==== DATA
  //==================================================

  public images: IAttachment[] = [];

  //==================================================
  //==== VIEW CHILD
  //==================================================

  readonly MediaModal = viewChild<MediaModal>('mediaModal');

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  readonly MediaBox = viewChild<MediaBox>('mediaBox');

  //==================================================
  //==== SELECT IMAGE
  //==================================================

  selectImage(data: MediaSelection): void {
    if (Array.isArray(data)) {
      this.images = data.filter(
        (item): item is IAttachment => typeof item !== 'string',
      );

      return;
    }

    if (data && typeof data !== 'string') {
      this.images = [data];

      return;
    }

    this.images = [];
  }

  //==================================================
  //==== ACTION
  //==================================================

  onActionClicked(action: string): void {
    if (action !== 'deleteAll') {
      return;
    }

    const ids = this.images.map((image) => image.id_attachment);

    if (!ids.length) {
      return;
    }

    this.store.dispatch(new DeleteAllAttachmentAction(ids)).subscribe({
      complete: () => {
        const deletedCount = ids.length;

        this.images = [];

        this.MediaBox()?.refreshAfterDelete(deletedCount);
      },
    });
  }

  //==================================================
  //==== REMOVE DELETED IMAGE FROM SELECTION
  //==================================================

  deleteImage(id: string): void {
    this.images = this.images.filter((image) => image.id_attachment !== id);
  }

  //==================================================
  //==== GENERIC MEDIA
  //==================================================

  public readonly mediaAccept: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
}
