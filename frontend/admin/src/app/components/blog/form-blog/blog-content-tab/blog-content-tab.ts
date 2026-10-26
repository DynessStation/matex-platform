import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { NgxEditorModule } from 'ngx-editor';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { BlogAssistantService } from '../blog-assistant.service';
import { BlogFormService } from '../blog-form.service';

// Content tab (slug, title, excerpt, body per language) of the article form.
// Shared state lives in BlogFormService.
@Component({
  selector: 'app-blog-content-tab',

  imports: [HelpTip, ReactiveFormsModule, NgxEditorModule, AiFieldAction],

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
