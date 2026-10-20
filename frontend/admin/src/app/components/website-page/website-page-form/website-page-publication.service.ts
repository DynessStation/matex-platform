import { Injectable, Signal, signal } from '@angular/core';

import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

import { WebsitePageEditorPublicationChoice } from './website-page-form.model';
import {
  dateToNgbDate,
  toLocalDateTimeInput,
  toPreviewIso,
} from './website-page-form.util';
import {
  IWebsitePageEditorDetail,
  IWebsitePageEditorPublicationPayload,
  WebsitePageEditorEffectiveStatus,
  WebsitePageEditorStatus,
} from '../../../shared/interface/website-page-editor.interface';

// Publication state of the fixed website page form: the chosen action, the schedule, and the
// publication actions sent on save. Provided by WebsitePageForm next to the editor service.
@Injectable()
export class WebsitePagePublicationService {
  // Bound to the form's inputs through WebsitePageEditorService.connect().
  mode: Signal<'create' | 'edit'> = signal('create');

  editData: Signal<IWebsitePageEditorDetail | null> = signal(null);

  connect(form: {
    mode: Signal<'create' | 'edit'>;
    editData: Signal<IWebsitePageEditorDetail | null>;
  }): void {
    this.mode = form.mode;
    this.editData = form.editData;
  }

  public publicationChoice: WebsitePageEditorPublicationChoice =
    this.mode() === 'edit' ? 'current' : 'draft';

  public publicationPublishAt = '';

  public publicationUnpublishAt = '';

  public publicationValidationAttempted = false;

  public publicationPublishDate: NgbDateStruct | null = null;

  public publicationPublishTime: NgbTimeStruct | null = null;

  public publicationUnpublishDate: NgbDateStruct | null = null;

  public publicationUnpublishTime: NgbTimeStruct | null = null;

  get publicationRequiresPublishedTranslation(): boolean {
    if (
      this.publicationChoice === 'publish_now' ||
      this.publicationChoice === 'schedule'
    ) {
      return true;
    }

    return (
      this.publicationChoice === 'current' &&
      this.editData()?.website_page_status === 1
    );
  }

  get publicationScheduleInvalid(): boolean {
    if (this.publicationChoice !== 'schedule') {
      return false;
    }

    if (!this.publicationPublishDate || !this.publicationPublishTime) {
      return true;
    }

    if (!this.publicationPublishAt) {
      return true;
    }

    const publishAt = new Date(this.publicationPublishAt);

    if (Number.isNaN(publishAt.getTime())) {
      return true;
    }

    return publishAt.getTime() <= Date.now();
  }

  get publicationEndInvalid(): boolean {
    const hasPartialValue =
      this.publicationUnpublishDate !== null ||
      this.publicationUnpublishTime !== null;

    if (!hasPartialValue) {
      return false;
    }

    if (!this.publicationUnpublishDate || !this.publicationUnpublishTime) {
      return true;
    }

    if (!this.publicationUnpublishAt) {
      return true;
    }

    const unpublishAt = new Date(this.publicationUnpublishAt);

    if (Number.isNaN(unpublishAt.getTime())) {
      return true;
    }

    let startAt = new Date();

    if (this.publicationChoice === 'schedule' && this.publicationPublishAt) {
      startAt = new Date(this.publicationPublishAt);
    }

    return unpublishAt.getTime() <= startAt.getTime();
  }

  previewWebsitePageEditorStatus(): WebsitePageEditorStatus {
    switch (this.publicationChoice) {
      case 'publish_now':
      case 'schedule':
        return 1;

      case 'archive':
        return 2;

      case 'draft':
        return 0;

      default:
        return this.editData()?.website_page_status ?? 0;
    }
  }

  previewEffectiveStatus(): WebsitePageEditorEffectiveStatus {
    switch (this.publicationChoice) {
      case 'publish_now':
        return 'published';

      case 'schedule':
        return 'scheduled';

      case 'archive':
        return 'archived';

      case 'draft':
        return 'draft';

      default:
        return this.editData()?.effective_status ?? 'draft';
    }
  }

  previewPublishAt(): string | null {
    if (this.publicationChoice === 'schedule') {
      return toPreviewIso(this.publicationPublishAt);
    }

    if (this.publicationChoice === 'publish_now') {
      return new Date().toISOString();
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.website_page_publish_at ?? null;
    }

    return null;
  }

  previewUnpublishAt(): string | null {
    if (
      this.publicationChoice === 'publish_now' ||
      this.publicationChoice === 'schedule'
    ) {
      return toPreviewIso(this.publicationUnpublishAt);
    }

    if (this.publicationChoice === 'current') {
      return this.editData()?.website_page_unpublish_at ?? null;
    }

    return null;
  }

  buildPublicationActions(): IWebsitePageEditorPublicationPayload[] {
    const currentStatus = this.editData()?.effective_status ?? 'draft';

    const unpublishAt = toPreviewIso(this.publicationUnpublishAt);

    switch (this.publicationChoice) {
      case 'current':
        return [];

      case 'draft':
        if (this.mode() === 'create' || currentStatus === 'draft') {
          return [];
        }

        if (currentStatus === 'scheduled') {
          return [
            {
              action: 'cancel_schedule',
            },
          ];
        }

        if (currentStatus === 'published' || currentStatus === 'expired') {
          return [
            {
              action: 'unpublish',
            },
          ];
        }

        if (currentStatus === 'archived') {
          return [
            {
              action: 'restore',
            },
          ];
        }

        return [];

      case 'archive':
        if (this.mode() === 'create' || currentStatus === 'archived') {
          return [];
        }

        return [
          {
            action: 'archive',
          },
        ];

      case 'publish_now': {
        const action: IWebsitePageEditorPublicationPayload = {
          action: 'publish',

          website_page_unpublish_at: unpublishAt,
        };

        return currentStatus === 'archived'
          ? [
              {
                action: 'restore',
              },
              action,
            ]
          : [action];
      }

      case 'schedule': {
        const action: IWebsitePageEditorPublicationPayload = {
          action: 'schedule',

          website_page_publish_at: toPreviewIso(this.publicationPublishAt),

          website_page_unpublish_at: unpublishAt,
        };

        return currentStatus === 'archived'
          ? [
              {
                action: 'restore',
              },
              action,
            ]
          : [action];
      }
    }
  }

  patchPublicationDateTime(
    type: 'publish' | 'unpublish',
    value: string | null,
  ): void {
    const localValue = toLocalDateTimeInput(value);

    if (!localValue) {
      if (type === 'publish') {
        this.publicationPublishAt = '';
        this.publicationPublishDate = null;
        this.publicationPublishTime = null;
      } else {
        this.publicationUnpublishAt = '';
        this.publicationUnpublishDate = null;
        this.publicationUnpublishTime = null;
      }

      return;
    }

    const date = new Date(value!);

    const dateStruct = dateToNgbDate(date);

    const timeStruct: NgbTimeStruct = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: 0,
    };

    if (type === 'publish') {
      this.publicationPublishAt = localValue;
      this.publicationPublishDate = dateStruct;
      this.publicationPublishTime = timeStruct;

      return;
    }

    this.publicationUnpublishAt = localValue;
    this.publicationUnpublishDate = dateStruct;
    this.publicationUnpublishTime = timeStruct;
  }
}
