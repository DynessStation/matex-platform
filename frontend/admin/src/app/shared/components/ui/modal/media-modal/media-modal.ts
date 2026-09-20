import {
  Component,
  SimpleChanges,
  TemplateRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import {
  ModalDismissReasons,
  NgbModal,
  NgbModalRef,
  NgbModule,
  NgbNav,
} from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { NgxDropzoneChangeEvent, NgxDropzoneModule } from 'ngx-dropzone';

import * as media from '../../../../../shared/data/media-config';

import { HasPermissionDirective } from '../../../../directive/has-permission.directive';

import { NotificationService } from '../../../../services/notification.service';

import { CreateAttachmentAction } from '../../../../store/action/attachment.action';

import { Button } from '../../button/button';

import { MediaBox, MediaSelection } from '../../media-box/media-box';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-media-modal',

  imports: [
    TranslateModule,
    NgbModule,
    Button,
    NgxDropzoneModule,
    MediaBox,
    HasPermissionDirective,
  ],

  templateUrl: './media-modal.html',

  styleUrl: './media-modal.scss',
})
export class MediaModal {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private notificationService = inject(NotificationService);

  private modalService = inject(NgbModal);

  private translate = inject(TranslateService);

  //==================================================
  //==== MODAL REF
  //==================================================

  private modalRef: NgbModalRef | null = null;

  //==================================================
  //==== DATA
  //==================================================

  public active = 'select';

  public closeResult = '';

  public modalOpen = false;

  public media: MediaSelection = null;

  public files: File[] = [];

  public selectedImages: MediaSelection = null;

  //==================================================
  //==== INPUT
  //==================================================

  readonly selectMedia = input<boolean>(true);

  readonly multipleImage = input<boolean>(false);

  readonly url = input<boolean>(false);

  readonly collection = input<string>('');

  /**
   * Media Engine v1:
   * image only.
   *
   * Collection/module tertentu tetap bisa override
   * nilai accept dari parent component.
   */
  readonly accept = input<string[]>([...media.mediaConfig.image]);

  readonly selectedImagesIds = input<MediaSelection>(null);

  //==================================================
  //==== VIEW CHILD
  //==================================================

  readonly MediaModal = viewChild<TemplateRef<string>>('mediaModal');

  //==================================================
  //==== OUTPUT
  //==================================================

  readonly selectImage = output<MediaSelection>();

  /**
   * Dipakai halaman central Media Library
   * supaya list bisa di-refresh setelah upload.
   */
  readonly uploadCompleted = output<void>();

  //==================================================
  //==== CHANGES
  //==================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['selectedImagesIds']) {
      return;
    }

    const nextSelection = changes['selectedImagesIds'].currentValue ?? null;

    //==================================================
    //==== IGNORE SAME LOGICAL SELECTION
    //==================================================

    if (
      this.getSelectionSignature(nextSelection) ===
      this.getSelectionSignature(this.selectedImages)
    ) {
      return;
    }

    //==================================================
    //==== SYNC PARENT SELECTION
    //==================================================

    this.selectedImages = nextSelection;

    /**
     * Jangan overwrite pilihan user ketika modal sedang terbuka.
     *
     * MediaBox akan mengirim pilihan terbaru melalui setImage().
     */
    if (!this.modalOpen) {
      this.media = nextSelection;
    }
  }

  //==================================================
  //==== OPEN MODAL
  //==================================================

  async openModal(): Promise<void> {
    this.files = [];
    this.media = this.selectedImages;

    this.modalOpen = true;

    if (this.selectMedia()) {
      this.active = 'select';
    } else {
      this.active = 'upload';
    }

    const template = this.MediaModal();

    if (!template) {
      this.modalOpen = false;

      return;
    }

    //==================================================
    //==== OPEN
    //==================================================

    this.modalRef = this.modalService.open(template, {
      ariaLabelledBy: 'Media-Modal',

      centered: true,

      windowClass: 'theme-modal modal-xl media-modal',
    });

    //==================================================
    //==== RESULT
    //==================================================

    this.modalRef.result
      .then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
        },

        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        },
      )
      .finally(() => {
        this.modalOpen = false;

        this.modalRef = null;

        this.files = [];
      });
  }

  //==================================================
  //==== DISMISS REASON
  //==================================================

  private getDismissReason(reason: ModalDismissReasons): string {
    if (this.selectMedia()) {
      this.active = 'select';
    } else {
      this.active = 'upload';
    }

    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    }

    if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    }

    return `with: ${reason}`;
  }

  //==================================================
  //==== SELECT FILE
  //==================================================

  onSelect(event: NgxDropzoneChangeEvent): void {
    const maxFiles = this.multipleImage() ? 5 : 1;

    const available = maxFiles - this.files.length;

    if (available <= 0) {
      this.notificationService.showError(
        this.translate.instant('media_ui.file_limit_reached', {
          max: maxFiles,
        }),
      );

      return;
    }

    //==================================================
    //==== ADD ACCEPTED FILES
    //==================================================

    this.files.push(...event.addedFiles.slice(0, available));

    //==================================================
    //==== MAX FILE WARNING
    //==================================================

    if (event.addedFiles.length > available) {
      this.notificationService.showError(
        this.translate.instant('media_ui.file_limit_reached', {
          max: maxFiles,
        }),
      );
    }

    //==================================================
    //==== REJECTED FILES
    //==================================================

    if (event.rejectedFiles?.length) {
      this.notificationService.showError(
        this.translate.instant('media_ui.files_not_supported'),
      );
    }
  }

  //==================================================
  //==== REMOVE FILE
  //==================================================

  onRemove(file: File): void {
    const index = this.files.indexOf(file);

    if (index !== -1) {
      this.files.splice(index, 1);
    }
  }

  //==================================================
  //==== ADD MEDIA
  //==================================================

  addMedia(nav: NgbNav): void {
    //==================================================
    //==== FILE
    //==================================================

    if (!this.files.length) {
      this.notificationService.showError(
        this.translate.instant('media_ui.select_file_first'),
      );

      return;
    }

    //==================================================
    //==== COLLECTION
    //==================================================

    const collection = this.collection().trim();

    if (!collection) {
      this.notificationService.showError(
        this.translate.instant('media_ui.collection_required'),
      );

      return;
    }

    //==================================================
    //==== UPLOAD
    //==================================================

    this.store
      .dispatch(
        new CreateAttachmentAction({
          collection,

          files: this.files,
        }),
      )
      .subscribe({
        complete: () => {
          this.files = [];

          //==================================================
          //==== SELECT MODE
          //==================================================

          if (this.selectMedia()) {
            nav.select('select');

            return;
          }

          //==================================================
          //==== CENTRAL MEDIA LIBRARY
          //==================================================

          this.uploadCompleted.emit();

          this.modalRef?.close('upload-success');
        },
      });
  }

  //==================================================
  //==== SET IMAGE
  //==================================================

  setImage(data: MediaSelection): void {
    this.media = data;
  }

  //==================================================
  //==== INSERT MEDIA
  //==================================================

  selectedMedia(modal: NgbModalRef): void {
    if (!this.media) {
      this.notificationService.showError(
        this.translate.instant('media_ui.select_media_first'),
      );

      return;
    }

    this.selectImage.emit(this.media);

    modal.close('media-selected');
  }

  //==================================================
  //==== SELECTION SIGNATURE
  //==================================================

  private getSelectionSignature(value: MediaSelection): string {
    if (!value) {
      return '';
    }

    const items = Array.isArray(value) ? value : [value];

    return items
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        return item.id_attachment || item.asset_url || '';
      })
      .filter(Boolean)
      .join('|');
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy(): void {
    if (this.modalRef) {
      this.modalRef.dismiss('component-destroyed');
    }
  }
}
