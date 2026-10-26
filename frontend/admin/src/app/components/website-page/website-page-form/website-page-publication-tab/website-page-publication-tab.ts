import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbDateStruct, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { WebsitePageEditorService } from '../website-page-editor.service';
import { WebsitePageEditorPublicationChoice } from '../website-page-form.model';
import {
  composePublicationDateTime,
  dateToNgbDate,
  publicationDateValue,
} from '../website-page-form.util';
import { WebsitePagePublicationService } from '../website-page-publication.service';
import { WebsitePageSaveService } from '../website-page-save.service';

// Publication tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-publication-tab',

  imports: [HelpTip, DatePipe, FormsModule, NgbModule, TranslateModule],

  templateUrl: './website-page-publication-tab.html',
})
export class WebsitePagePublicationTab {
  readonly editor = inject(WebsitePageEditorService);

  readonly save = inject(WebsitePageSaveService);

  readonly publication = inject(WebsitePagePublicationService);

  readonly publicationDateValue = publicationDateValue;

  selectPublicationChoice(choice: WebsitePageEditorPublicationChoice): void {
    this.publication.publicationChoice = choice;

    this.publication.publicationValidationAttempted = false;

    if (choice === 'schedule') {
      if (!this.publication.publicationPublishAt) {
        this.initializePublicationSchedule();
      }
    } else {
      this.publication.publicationPublishAt = '';
      this.publication.publicationPublishDate = null;
      this.publication.publicationPublishTime = null;
    }

    if (choice === 'draft' || choice === 'archive') {
      this.clearPublicationUnpublish();
    }
  }

  goToPreview(): void {
    this.publication.publicationValidationAttempted = true;
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
      this.publication.publicationRequiresPublishedTranslation &&
      !this.editor.defaultTranslationPublished
    ) {
      return;
    }

    if (this.publication.publicationScheduleInvalid) {
      return;
    }

    if (this.publication.publicationEndInvalid) {
      return;
    }

    this.save.refreshPreviewPage();

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
    this.publication.publicationPublishAt = composePublicationDateTime(
      this.publication.publicationPublishDate,
      this.publication.publicationPublishTime,
    );
  }

  syncPublicationUnpublishDateTime(): void {
    this.publication.publicationUnpublishAt = composePublicationDateTime(
      this.publication.publicationUnpublishDate,
      this.publication.publicationUnpublishTime,
    );
  }

  clearPublicationUnpublish(): void {
    this.publication.publicationUnpublishDate = null;
    this.publication.publicationUnpublishTime = null;
    this.publication.publicationUnpublishAt = '';
  }

  private initializePublicationSchedule(): void {
    const date = new Date();

    date.setSeconds(0, 0);

    const currentMinute = date.getMinutes();

    const nextMinute = Math.floor(currentMinute / 5) * 5 + 5;

    date.setMinutes(nextMinute);

    this.publication.publicationPublishDate = dateToNgbDate(date);

    this.publication.publicationPublishTime = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: 0,
    };

    this.syncPublicationPublishDateTime();
  }
}
