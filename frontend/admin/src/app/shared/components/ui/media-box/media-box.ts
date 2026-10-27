import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Params } from '@angular/router';

import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { HasPermissionDirective } from '../../../directives/has-permission.directive';
import { ImagePreviewDirective } from '../../../directives/image-preview.directive';
import {
  IAttachment,
  IAttachmentModel,
} from '../../../interface/attachment.interface';
import { imagePreviewItems } from '../../../services/lightbox.service';
import { NotificationService } from '../../../services/notification.service';
import {
  DeleteAttachmentAction,
  GetAttachmentsAction,
} from '../../../store/action/attachment.action';
import { AttachmentState } from '../../../store/state/attachment.state';
import { Loader } from '../../loader/loader';
import { DeleteModal } from '../modal/delete-modal/delete-modal';
import { NoData } from '../no-data/no-data';
import { Pagination } from '../pagination/pagination';

//==================================================
//==== MEDIA SELECTION TYPE
//==================================================

export type MediaSelection =
  IAttachment | IAttachment[] | string | string[] | null;

/** The attachments of a selection (URL text is not an attachment). */
export const selectedAttachments = (value: MediaSelection): IAttachment[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is IAttachment => !!item && typeof item !== 'string',
  );

/** The first attachment of a selection, or none. */
export const selectedAttachment = (value: MediaSelection): IAttachment | null =>
  selectedAttachments(value)[0] ?? null;

//==================================================
//==== COMPONENT
//==================================================

// Where a file is used (backend attachment.ts REFERENCES), in words.
const USAGE_SOURCES: Record<string, string> = {
  'admin_account.profile_photo': 'Foto profil akun',
  'office.attachment': 'Kantor',
  'website_page.media': 'Halaman website',
  'article.attachment': 'Artikel',
  'product.attachment': 'Produk',
  'product_category.attachment': 'Kategori produk',
};

@Component({
  selector: 'app-media-box',

  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    Loader,
    DeleteModal,
    Pagination,
    NoData,
    HasPermissionDirective,
    ImagePreviewDirective,
    NgbTooltip,
  ],

  templateUrl: './media-box.html',

  styleUrl: './media-box.scss',
})
export class MediaBox {
  // The images on this page of the library, as one set in the preview (U-15).
  readonly previewItems = imagePreviewItems;

  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  private notificationService = inject(NotificationService);

  private translate = inject(TranslateService);

  //==================================================
  //==== STATE
  //==================================================

  attachment$: Observable<IAttachmentModel> = this.store.select(
    AttachmentState.attachment,
  );

  //==================================================
  //==== VIEW CHILD
  //==================================================

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  //==================================================
  //==== INPUT
  //==================================================

  readonly multiple = input<boolean>(false);

  readonly maxSelection = input<number>(5);

  readonly url = input<boolean>(false);

  readonly deleteAction = input<boolean>(true);

  readonly accept = input<string[]>([]);

  readonly collection = input<string>('');

  readonly selectedImages = input<MediaSelection>(null);

  readonly disabledSelectionIds = input<string[]>([]);

  readonly selectionValidator = input<
    ((attachment: IAttachment) => string | null) | null
  >(null);

  //==================================================
  //==== OUTPUT
  //==================================================

  readonly setImage = output<MediaSelection>();

  readonly setDeleteImage = output<string>();

  //==================================================
  //==== DATA
  //==================================================

  public loading = true;

  public totalItems = 0;

  public term = new FormControl('', {
    nonNullable: true,
  });

  public filter: Params = {
    search: '',

    sort: '',

    page: 1,

    paginate: 20,
  };

  public selected: string[] = [];

  private selectedAttachments: IAttachment[] = [];

  //==================================================
  //==== MIME FALLBACK ICON
  //==================================================

  public mimeImageMapping: {
    mimeType: string;

    imagePath: string;
  }[] = [
    {
      mimeType: 'application/pdf',

      imagePath: 'assets/images/pdf.png',
    },
    {
      mimeType: 'application/msword',

      imagePath: 'assets/images/word.png',
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      imagePath: 'assets/images/word.png',
    },
    {
      mimeType: 'application/vnd.ms-excel',

      imagePath: 'assets/images/xls.png',
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      imagePath: 'assets/images/xls.png',
    },
    {
      mimeType: 'application/vnd.ms-powerpoint',

      imagePath: 'assets/images/folder.png',
    },
    {
      mimeType:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      imagePath: 'assets/images/folder.png',
    },
    {
      mimeType: 'text/plain',

      imagePath: 'assets/images/txt.png',
    },
    {
      mimeType: 'audio/mpeg',

      imagePath: 'assets/images/sound.png',
    },
    {
      mimeType: 'audio/wav',

      imagePath: 'assets/images/sound.png',
    },
    {
      mimeType: 'audio/ogg',

      imagePath: 'assets/images/sound.png',
    },
    {
      mimeType: 'video/mp4',

      imagePath: 'assets/images/video.png',
    },
    {
      mimeType: 'video/webm',

      imagePath: 'assets/images/video.png',
    },
    {
      mimeType: 'video/ogg',

      imagePath: 'assets/images/video.png',
    },
    {
      mimeType: 'application/zip',

      imagePath: 'assets/images/zip.png',
    },
    {
      mimeType: 'application/x-tar',

      imagePath: 'assets/images/zip.png',
    },
    {
      mimeType: 'application/gzip',

      imagePath: 'assets/images/zip.png',
    },
  ];

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    //==================================================
    //==== SELECTED IMAGE SYNC
    //==================================================

    effect(() => {
      this.syncSelectedImages(this.selectedImages());
    });
  }

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit() {
    this.attachment$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((attachment) => {
        this.totalItems = attachment?.total ?? 0;
      });

    this.term.valueChanges
      .pipe(
        debounceTime(400),

        distinctUntilChanged(),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.filter['search'] = value.trim();

        this.filter['page'] = 1;

        this.getAttachments();
      });

    this.getAttachments(true);
  }

  //==================================================
  //==== GET ATTACHMENTS
  //==================================================

  getAttachments(initial: boolean = false) {
    if (initial) {
      this.loading = true;
    } else {
      this.loading = true;
    }

    const params: Params = {
      ...this.filter,
    };

    //==================================================
    //==== COLLECTION
    //==================================================

    const collection = this.collection().trim();

    if (collection) {
      params['collection'] = collection;
    }

    //==================================================
    //==== MIME TYPE
    //==================================================

    const mimeType = this.getMimeTypeFilter();

    if (mimeType) {
      params['mime_type'] = mimeType;
    }

    //==================================================
    //==== REQUEST
    //==================================================

    this.store
      .dispatch(new GetAttachmentsAction(params))
      .pipe(
        finalize(() => {
          this.loading = false;
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  //==================================================
  //==== MIME FILTER
  //==================================================

  private getMimeTypeFilter(): string {
    const accept = this.accept();

    if (!accept?.length) {
      return '';
    }

    const groups = new Set(
      accept.filter(Boolean).map((mime) => mime.split('/')[0]),
    );

    if (groups.size !== 1) {
      return '';
    }

    const [group] = Array.from(groups);

    return `${group}/`;
  }

  //==================================================
  //==== SORT
  //==================================================

  onMediaChange(event: Event) {
    this.filter['sort'] = (event.target as HTMLSelectElement).value;

    this.filter['page'] = 1;

    this.getAttachments();
  }

  //==================================================
  //==== SELECT IMAGE
  //==================================================

  selectImage(
    event: Event,

    attachment: IAttachment,

    returnUrl: boolean,
  ) {
    if (this.isSelectionDisabled(attachment)) {
      (event.target as HTMLInputElement).checked = false;
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;

    //==================================================
    //==== MULTIPLE
    //==================================================

    if (this.multiple()) {
      const index = this.selectedAttachments.findIndex(
        (item) => item.id_attachment === attachment.id_attachment,
      );

      if (
        checked &&
        index === -1 &&
        this.selectedAttachments.length >=
          Math.max(1, Math.floor(this.maxSelection()))
      ) {
        (event.target as HTMLInputElement).checked = false;
        this.notificationService.showError(
          this.translate.instant('media_ui.file_limit_reached', {
            max: Math.max(1, Math.floor(this.maxSelection())),
          }),
        );
        return;
      }

      if (checked && index === -1) {
        this.selectedAttachments.push(attachment);
      }

      if (!checked && index !== -1) {
        this.selectedAttachments.splice(index, 1);
      }

      this.selected = this.selectedAttachments.map(
        (item) => item.id_attachment,
      );

      if (returnUrl) {
        this.setImage.emit(
          this.selectedAttachments.map((item) => item.asset_url),
        );
      } else {
        this.setImage.emit([...this.selectedAttachments]);
      }

      return;
    }

    //==================================================
    //==== SINGLE
    //==================================================

    this.selectedAttachments = [attachment];

    this.selected = [attachment.id_attachment];

    if (returnUrl) {
      this.setImage.emit(attachment.asset_url);
    } else {
      this.setImage.emit(attachment);
    }
  }

  selectionIssue(attachment: IAttachment): string | null {
    return this.selectionValidator()?.(attachment) ?? null;
  }

  isSelectionDisabled(attachment: IAttachment): boolean {
    return (
      this.disabledSelectionIds().includes(attachment.id_attachment) ||
      this.selectionIssue(attachment) !== null
    );
  }

  selectionDisabledReason(attachment: IAttachment): string {
    if (this.disabledSelectionIds().includes(attachment.id_attachment)) {
      return this.translate.instant('media_ui.already_used');
    }

    return this.selectionIssue(attachment) ?? '';
  }

  /** "Dipakai: n" on each card (U-14); the tooltip lists the places. */
  usageLabel(attachment: IAttachment): string {
    const total = attachment.usage_total ?? 0;
    return total ? `Dipakai: ${total}` : 'Belum dipakai';
  }

  usageDetail(attachment: IAttachment): string {
    const places = (attachment.usage ?? [])
      .map(
        (item) => `${USAGE_SOURCES[item.source] ?? item.source}: ${item.total}`,
      )
      .join(', ');
    return places
      ? `${places}. Media yang dipakai tidak bisa dihapus.`
      : 'Belum dipakai di mana pun; aman dihapus.';
  }

  attachmentDimensions(attachment: IAttachment): string {
    if (!attachment.width || !attachment.height) {
      return this.translate.instant('media_ui.dimension_unknown');
    }

    return `${attachment.width} × ${attachment.height}px`;
  }

  //==================================================
  //==== SYNC SELECTED
  //==================================================

  private syncSelectedImages(value: MediaSelection) {
    this.selected = [];

    this.selectedAttachments = [];

    if (!value) {
      return;
    }

    //==================================================
    //==== ARRAY
    //==================================================

    if (Array.isArray(value)) {
      const seen = new Set<string>();
      value.forEach((item) => {
        if (typeof item === 'string') {
          if (!seen.has(item)) {
            seen.add(item);
            this.selected.push(item);
          }

          return;
        }

        if (item?.id_attachment && !seen.has(item.id_attachment)) {
          seen.add(item.id_attachment);
          this.selected.push(item.id_attachment);

          this.selectedAttachments.push(item);
        }
      });

      return;
    }

    //==================================================
    //==== STRING
    //==================================================

    if (typeof value === 'string') {
      this.selected = [value];

      return;
    }

    //==================================================
    //==== ATTACHMENT
    //==================================================

    if (value.id_attachment) {
      this.selected = [value.id_attachment];

      this.selectedAttachments = [value];
    }
  }

  //==================================================
  //==== PAGINATION
  //==================================================

  setPaginate(page: number) {
    this.filter['page'] = page;

    this.getAttachments();
  }

  //==================================================
  //==== DELETE
  //==================================================

  onActionClicked(
    action: string,

    row: unknown,
  ): void {
    if (action !== 'delete') {
      return;
    }

    // The delete modal hands back the attachment it was opened with.
    const data = row as IAttachment;

    this.store
      .dispatch(new DeleteAttachmentAction(data.id_attachment))
      .subscribe({
        complete: () => {
          //==================================================
          //==== REMOVE FROM SELECTION
          //==================================================

          this.selected = this.selected.filter(
            (id) => id !== data.id_attachment,
          );

          this.selectedAttachments = this.selectedAttachments.filter(
            (item) => item.id_attachment !== data.id_attachment,
          );

          this.setDeleteImage.emit(data.id_attachment);

          //==================================================
          //==== REFRESH CURRENT PAGE
          //==================================================

          this.refreshAfterDelete(1);
        },
      });
  }

  //==================================================
  //==== MIME ICON
  //==================================================

  getMimeTypeImage(mimeType: string) {
    return this.mimeImageMapping.find((value) => value.mimeType === mimeType)
      ?.imagePath;
  }

  //==================================================
  //==== REFRESH AFTER DELETE
  //==================================================

  public refreshAfterDelete(deletedCount: number = 1): void {
    const attachment = this.store.selectSnapshot(AttachmentState.attachment);

    const currentPage = Number(this.filter['page'] ?? 1);

    const currentLength = attachment?.data?.length ?? 0;

    //==================================================
    //==== MOVE TO PREVIOUS PAGE IF CURRENT PAGE EMPTY
    //==================================================

    if (currentPage > 1 && deletedCount >= currentLength) {
      this.filter['page'] = currentPage - 1;
    }

    this.getAttachments();
  }
}
