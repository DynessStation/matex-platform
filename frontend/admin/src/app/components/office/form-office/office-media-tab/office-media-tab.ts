import { Component, inject, viewChild } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { MediaSelection } from '../../../../shared/components/ui/media-box/media-box';
import { MediaModal } from '../../../../shared/components/ui/modal/media-modal/media-modal';
import { ImagePreviewDirective } from '../../../../shared/directives/image-preview.directive';
import { IAttachment } from '../../../../shared/interface/attachment.interface';
import {
  PreviewItem,
  imagePreviewItems,
} from '../../../../shared/services/lightbox.service';
import { OFFICE_MEDIA_ACCEPT, OfficeMediaDraft } from '../form-office.model';
import { toAttachmentArray } from '../form-office.util';
import { OfficeFormService } from '../office-form.service';

// Media tab of the office form: pick images from the media library, then caption,
// order, cover, and visibility per image. The drafts live in OfficeFormService.
@Component({
  selector: 'app-office-media-tab',

  imports: [HelpTip, TranslateModule, MediaModal, ImagePreviewDirective],

  templateUrl: './office-media-tab.html',
})
export class OfficeMediaTab {
  readonly office = inject(OfficeFormService);

  // The office photos, as one set in the preview (U-15).
  get previews(): PreviewItem[] {
    return imagePreviewItems(
      this.office.officeMedia.map((media) => media.attachment),
    );
  }

  readonly mediaModal = viewChild<MediaModal>('mediaModal');

  public readonly mediaAccept = OFFICE_MEDIA_ACCEPT;

  openMedia(): void {
    void this.mediaModal()?.openModal();
  }

  get selectedMedia(): IAttachment[] {
    return this.office.officeMedia.map((item) => item.attachment);
  }

  selectMedia(selection: MediaSelection): void {
    const selected = toAttachmentArray(selection);

    const oldMap = new Map(
      this.office.officeMedia.map((item) => [
        item.attachment.id_attachment,
        item,
      ]),
    );

    // The first new image becomes the cover unless a kept image already is.
    let coverAssigned = selected.some(
      (attachment) =>
        oldMap.get(attachment.id_attachment)?.attachment_role === 'cover',
    );

    this.office.officeMedia = selected.map((attachment) => {
      const existing = oldMap.get(attachment.id_attachment);

      if (existing) {
        return existing;
      }

      const role: 'cover' | 'gallery' = !coverAssigned ? 'cover' : 'gallery';

      if (role === 'cover') {
        coverAssigned = true;
      }

      return {
        attachment,

        attachment_role: role,

        caption: '',

        is_public: true,
      };
    });
  }

  setCover(index: number): void {
    this.office.officeMedia = this.office.officeMedia.map(
      (item, currentIndex) => ({
        ...item,

        attachment_role: currentIndex === index ? 'cover' : 'gallery',
      }),
    );
  }

  removeMedia(index: number): void {
    const media = this.office.officeMedia;

    const wasCover = media[index]?.attachment_role === 'cover';

    this.office.officeMedia = media.filter(
      (_, currentIndex) => currentIndex !== index,
    );

    if (wasCover && this.office.officeMedia.length) {
      this.setCover(0);
    }
  }

  moveMedia(index: number, direction: -1 | 1): void {
    const target = index + direction;

    if (target < 0 || target >= this.office.officeMedia.length) {
      return;
    }

    const next = [...this.office.officeMedia];

    [next[index], next[target]] = [next[target], next[index]];

    this.office.officeMedia = next;
  }

  updateCaption(index: number, value: string): void {
    this.updateMedia(index, { caption: value });
  }

  updateMediaPublic(index: number, checked: boolean): void {
    this.updateMedia(index, { is_public: checked });
  }

  private updateMedia(
    index: number,
    change: Partial<Pick<OfficeMediaDraft, 'caption' | 'is_public'>>,
  ): void {
    this.office.officeMedia = this.office.officeMedia.map(
      (item, currentIndex) =>
        currentIndex === index ? { ...item, ...change } : item,
    );
  }
}
