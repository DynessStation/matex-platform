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

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Observable, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import {
  IAttachment,
  IAttachmentModel,
} from '../../../interface/attachment.interface';

import {
  DeleteAttachmentAction,
  GetAttachmentsAction,
} from '../../../store/action/attachment.action';

import { AttachmentState } from '../../../store/state/attachment.state';

import { Loader } from '../../loader/loader';

import { DeleteModal } from '../modal/delete-modal/delete-modal';

import { NoData } from '../no-data/no-data';

import { Pagination } from '../pagination/pagination';

import { HasPermissionDirective } from '../../../directive/has-permission.directive';

//==================================================
//==== MEDIA SELECTION TYPE
//==================================================

export type MediaSelection =
  IAttachment | IAttachment[] | string | string[] | null;

//==================================================
//==== COMPONENT
//==================================================

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
  ],

  templateUrl: './media-box.html',

  styleUrl: './media-box.scss',
})
export class MediaBox {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

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

  readonly url = input<boolean>(false);

  readonly deleteAction = input<boolean>(true);

  readonly accept = input<string[]>([]);

  readonly collection = input<string>('');

  readonly selectedImages = input<MediaSelection>(null);

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
    const checked = (event.target as HTMLInputElement).checked;

    //==================================================
    //==== MULTIPLE
    //==================================================

    if (this.multiple()) {
      const index = this.selectedAttachments.findIndex(
        (item) => item.id_attachment === attachment.id_attachment,
      );

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
      value.forEach((item) => {
        if (typeof item === 'string') {
          this.selected.push(item);

          return;
        }

        if (item?.id_attachment) {
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

    data: IAttachment,
  ): void {
    if (action !== 'delete') {
      return;
    }

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
