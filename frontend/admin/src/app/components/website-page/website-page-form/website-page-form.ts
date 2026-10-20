import { Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { WebsitePageContentTab } from './website-page-content-tab/website-page-content-tab';
import { WebsitePageEditorService } from './website-page-editor.service';
import { WebsitePageGeneralTab } from './website-page-general-tab/website-page-general-tab';
import { WebsitePageMediaTab } from './website-page-media-tab/website-page-media-tab';
import { WebsitePagePreviewTab } from './website-page-preview-tab/website-page-preview-tab';
import { WebsitePagePublicationTab } from './website-page-publication-tab/website-page-publication-tab';
import { WebsitePageSeoTab } from './website-page-seo-tab/website-page-seo-tab';
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
    WebsitePageGeneralTab,
    WebsitePageContentTab,
    WebsitePageSeoTab,
    WebsitePageMediaTab,
    WebsitePagePublicationTab,
    WebsitePagePreviewTab,
  ],

  templateUrl: './website-page-form.html',

  providers: [WebsitePageEditorService],
})
export class WebsitePageForm {
  readonly editor = inject(WebsitePageEditorService);

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IWebsitePageEditorDetail | null>(null);

  readonly saving = input(false);

  readonly submitted = output<IWebsitePageEditorSaveRequest>();

  constructor() {
    this.editor.connect({
      mode: this.mode,
      editData: this.editData,
      saving: this.saving,
      submitted: this.submitted,
    });
  }

  /** Called by the edit page when the API rejects a save. */
  showServerIssue(code: string): void {
    this.editor.showServerIssue(code);
  }
}
