import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { BlogAssistantService } from '../blog-assistant.service';
import { BlogFormService } from '../blog-form.service';

// SEO tab (meta and share texts per language) of the article form.
// Shared state lives in BlogFormService.
@Component({
  selector: 'app-blog-seo-tab',

  imports: [ReactiveFormsModule, AiFieldAction],

  templateUrl: './blog-seo-tab.html',

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
export class BlogSeoTab {
  readonly editor = inject(BlogFormService);

  readonly assistant = inject(BlogAssistantService);

  readonly form = this.editor.form;
}
