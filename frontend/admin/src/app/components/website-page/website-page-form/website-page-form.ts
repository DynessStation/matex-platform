import { Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { WebsitePageAssistantService } from './website-page-assistant.service';
import { WebsitePageContentTab } from './website-page-content-tab/website-page-content-tab';
import { WebsitePageEditorService } from './website-page-editor.service';
import { WebsitePageGeneralTab } from './website-page-general-tab/website-page-general-tab';
import { WebsitePageMediaTab } from './website-page-media-tab/website-page-media-tab';
import { WebsitePagePreviewTab } from './website-page-preview-tab/website-page-preview-tab';
import { WebsitePagePublicationTab } from './website-page-publication-tab/website-page-publication-tab';
import { WebsitePagePublicationService } from './website-page-publication.service';
import { WebsitePageSaveService } from './website-page-save.service';
import { WebsitePageSeoTab } from './website-page-seo-tab/website-page-seo-tab';
import { FormHeading } from '../../../shared/components/ui/form-kit/form-heading';
import {
  TabState,
  tabState,
} from '../../../shared/components/ui/form-kit/form-kit.util';
import { TabStatus } from '../../../shared/components/ui/form-kit/tab-status';
import {
  IWebsitePageEditorDetail,
  IWebsitePageEditorSaveRequest,
} from '../../../shared/interface/website-page-editor.interface';

@Component({
  selector: 'app-website-page-form',

  imports: [
    ReactiveFormsModule,
    NgbModule,
    TranslateModule,
    FormHeading,
    TabStatus,
    WebsitePageGeneralTab,
    WebsitePageContentTab,
    WebsitePageSeoTab,
    WebsitePageMediaTab,
    WebsitePagePublicationTab,
    WebsitePagePreviewTab,
  ],

  templateUrl: './website-page-form.html',

  providers: [
    WebsitePageEditorService,
    WebsitePagePublicationService,
    WebsitePageSaveService,
    WebsitePageAssistantService,
  ],
})
export class WebsitePageForm {
  readonly editor = inject(WebsitePageEditorService);

  readonly save = inject(WebsitePageSaveService);

  private readonly publication = inject(WebsitePagePublicationService);

  readonly editData = input<IWebsitePageEditorDetail | null>(null);

  readonly saving = input(false);

  readonly submitted = output<IWebsitePageEditorSaveRequest>();

  constructor() {
    this.editor.connect({
      editData: this.editData,
      saving: this.saving,
    });

    this.save.connect({ submitted: this.submitted });
  }

  /** The page's name above the tabs, in its default language. */
  get pageTitle(): string {
    const { 'id-ID': id, 'en-US': en } =
      this.editor.form.controls.translations.controls;
    return id.controls.title.value || en.controls.title.value;
  }

  /** The dots on the tabs (G-2). */
  tabStates(): Record<
    'general' | 'content' | 'seo' | 'media' | 'publication',
    TabState
  > {
    const { 'id-ID': id, 'en-US': en } =
      this.editor.form.controls.translations.controls;
    const publication = this.publication;
    return {
      general: 'ok',
      content: tabState({
        required: [id.controls.title, en.controls.title],
      }),
      seo: tabState({
        required: [id.controls.canonical_url, en.controls.canonical_url],
        recommended: [
          id.controls.meta_description,
          en.controls.meta_description,
        ],
      }),
      media:
        this.editor.aboutMediaBlocksSave ||
        this.editor.gadgetHomeMediaBlocksSave
          ? 'error'
          : 'ok',
      publication:
        publication.publicationScheduleInvalid ||
        publication.publicationEndInvalid ||
        (publication.publicationRequiresPublishedTranslation &&
          !this.editor.defaultTranslationPublished)
          ? 'error'
          : 'ok',
    };
  }

  /** Called by the edit page when the API rejects a save. */
  showServerIssue(code: string): void {
    this.save.showServerIssue(code);
  }
}
