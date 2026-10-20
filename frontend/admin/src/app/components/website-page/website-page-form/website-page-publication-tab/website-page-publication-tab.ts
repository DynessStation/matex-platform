import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbDateStruct, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { WebsitePageEditorService } from '../website-page-editor.service';
import { WebsitePageEditorPublicationChoice } from '../website-page-form.model';
import {
  composePublicationDateTime,
  dateToNgbDate,
  publicationDateValue,
} from '../website-page-form.util';

// Publication tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-publication-tab',

  imports: [DatePipe, FormsModule, NgbModule, TranslateModule],

  templateUrl: './website-page-publication-tab.html',
})
export class WebsitePagePublicationTab {
  readonly editor = inject(WebsitePageEditorService);

  readonly publicationDateValue = publicationDateValue;

  selectPublicationChoice(choice: WebsitePageEditorPublicationChoice): void {
    this.editor.publicationChoice = choice;

    this.editor.publicationValidationAttempted = false;

    if (choice === 'schedule') {
      if (!this.editor.publicationPublishAt) {
        this.initializePublicationSchedule();
      }
    } else {
      this.editor.publicationPublishAt = '';
      this.editor.publicationPublishDate = null;
      this.editor.publicationPublishTime = null;
    }

    if (choice === 'draft' || choice === 'archive') {
      this.clearPublicationUnpublish();
    }
  }

  goToPreview(): void {
    this.editor.publicationValidationAttempted = true;
    this.editor.mediaValidationAttempted = true;

    const invalidAboutLocale = this.editor.firstInvalidAboutLocale();
    if (invalidAboutLocale) {
      this.editor.activeLocale = invalidAboutLocale;
      this.editor.activeTab = 'content';
      return;
    }

    if (
      this.editor.aboutMediaBlocksSave ||
      this.editor.gadgetHomeMediaBlocksSave
    ) {
      this.editor.activeTab = 'media';
      return;
    }

    if (
      this.editor.publicationRequiresPublishedTranslation &&
      !this.editor.defaultTranslationPublished
    ) {
      return;
    }

    if (this.editor.publicationScheduleInvalid) {
      return;
    }

    if (this.editor.publicationEndInvalid) {
      return;
    }

    this.editor.refreshPreviewPage();

    this.editor.activeTab = 'preview';
  }

  backFromPublication(): void {
    this.editor.activeTab = this.editor.canViewAttachments ? 'media' : 'seo';
  }

  get publicationMinDate(): NgbDateStruct {
    const now = new Date();

    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }

  syncPublicationPublishDateTime(): void {
    this.editor.publicationPublishAt = composePublicationDateTime(
      this.editor.publicationPublishDate,
      this.editor.publicationPublishTime,
    );
  }

  syncPublicationUnpublishDateTime(): void {
    this.editor.publicationUnpublishAt = composePublicationDateTime(
      this.editor.publicationUnpublishDate,
      this.editor.publicationUnpublishTime,
    );
  }

  clearPublicationUnpublish(): void {
    this.editor.publicationUnpublishDate = null;
    this.editor.publicationUnpublishTime = null;
    this.editor.publicationUnpublishAt = '';
  }

  private initializePublicationSchedule(): void {
    const date = new Date();

    date.setSeconds(0, 0);

    const currentMinute = date.getMinutes();

    const nextMinute = Math.floor(currentMinute / 5) * 5 + 5;

    date.setMinutes(nextMinute);

    this.editor.publicationPublishDate = dateToNgbDate(date);

    this.editor.publicationPublishTime = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: 0,
    };

    this.syncPublicationPublishDateTime();
  }
}
