import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { IWebsitePageEditorTranslation } from '../../../../shared/interface/website-page-editor.interface';
import { WebsitePagePreview } from '../../website-page-preview/website-page-preview';
import { WebsitePageEditorService } from '../website-page-editor.service';
import {
  previewLanguageLabelKey,
  previewVisibilityKey,
} from '../website-page-form.util';
import { WebsitePagePublicationService } from '../website-page-publication.service';
import { WebsitePageSaveService } from '../website-page-save.service';

// Preview tab of the fixed website page form. Shared state lives in WebsitePageEditorService.
@Component({
  selector: 'app-website-page-preview-tab',

  imports: [DatePipe, TranslateModule, WebsitePagePreview],

  templateUrl: './website-page-preview-tab.html',
})
export class WebsitePagePreviewTab {
  readonly editor = inject(WebsitePageEditorService);

  readonly save = inject(WebsitePageSaveService);

  readonly publication = inject(WebsitePagePublicationService);

  readonly previewLanguageLabelKey = previewLanguageLabelKey;

  readonly previewVisibilityKey = previewVisibilityKey;

  get previewDefaultTranslation(): IWebsitePageEditorTranslation | null {
    if (!this.save.previewPage) {
      return null;
    }

    return (
      this.save.previewPage.translations.find(
        (item) =>
          item.website_page_locale ===
          this.save.previewPage?.website_page_default_locale,
      ) ??
      this.save.previewPage.translations[0] ??
      null
    );
  }

  get previewDraftTranslations(): IWebsitePageEditorTranslation[] {
    if (
      !this.save.previewPage ||
      !this.publication.publicationRequiresPublishedTranslation
    ) {
      return [];
    }

    return this.save.previewPage.translations.filter(
      (item) =>
        item.website_page_locale !==
          this.save.previewPage?.website_page_default_locale &&
        item.website_page_i18n_status === 0,
    );
  }

  get previewHeroMediaName(): string {
    return (
      this.save.previewPage?.attachments.find(
        (item) =>
          item.website_page_attachment_role ===
          (this.editor.isGadgetHomeTemplate ? 'home_main' : 'hero'),
      )?.original_name ?? '-'
    );
  }

  previewPublicationChoiceKey(): string {
    switch (this.publication.publicationChoice) {
      case 'publish_now':
        return 'website_page.publication_publish_now';

      case 'schedule':
        return 'website_page.publication_schedule';

      case 'archive':
        return 'website_page.publication_archive';

      case 'draft':
        return 'website_page.publication_draft';

      default:
        return 'website_page.publication_keep_current';
    }
  }

  previewResultStatusKey(): string {
    return `website_page.status_${this.save.previewPage?.effective_status ?? 'draft'}`;
  }
}
