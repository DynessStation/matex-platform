import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { NgxEditorModule } from 'ngx-editor';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { TitleSlug } from '../../../../shared/components/ui/form-kit/title-slug';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { TagPicker } from '../../../../shared/components/ui/tag-picker/tag-picker';
import { BlogAssistantService } from '../blog-assistant.service';
import { BlogFormService } from '../blog-form.service';

// Content tab (title, address, excerpt, body per language; tags and writer) of the article form.
// Shared state lives in BlogFormService.
@Component({
  selector: 'app-blog-content-tab',

  imports: [
    HelpTip,
    ReactiveFormsModule,
    NgxEditorModule,
    AiFieldAction,
    TitleSlug,
    TagPicker,
  ],

  templateUrl: './blog-content-tab.html',

  // Shared with the other tabs (see FormBlog).
  styleUrl: '../form-blog.scss',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class BlogContentTab {
  readonly editor = inject(BlogFormService);

  readonly assistant = inject(BlogAssistantService);

  readonly form = this.editor.form;
}
