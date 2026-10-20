import { DatePipe } from '@angular/common';
import { Component, inject, input, output, viewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { NgxEditorModule } from 'ngx-editor';

import { WebsitePageEditorService } from './website-page-editor.service';
import { AiFieldAction } from '../../../shared/components/ui/ai-field-action/ai-field-action';
import { MediaModal } from '../../../shared/components/ui/modal/media-modal/media-modal';
import { LocalizedNumberInputDirective } from '../../../shared/directives/localized-number-input.directive';
import {
  IWebsitePageEditorDetail,
  IWebsitePageEditorSaveRequest,
} from '../../../shared/interface/website-page-editor.interface';
import { WebsitePagePreview } from '../website-page-preview/website-page-preview';

@Component({
  selector: 'app-website-page-form',

  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    NgxEditorModule,
    AiFieldAction,
    LocalizedNumberInputDirective,
    MediaModal,
    WebsitePagePreview,
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

  private readonly mediaModal = viewChild<MediaModal>('mediaModal');

  constructor() {
    this.editor.connect({
      mode: this.mode,
      editData: this.editData,
      saving: this.saving,
      submitted: this.submitted,
      mediaModal: this.mediaModal,
    });
  }

  /** Called by the edit page when the API rejects a save. */
  showServerIssue(code: string): void {
    this.editor.showServerIssue(code);
  }
}
