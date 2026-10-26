import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { BlogFormService } from '../blog-form.service';

// General tab (key, flags) of the article form.
// Shared state lives in BlogFormService.
@Component({
  selector: 'app-blog-general-tab',

  imports: [HelpTip, ReactiveFormsModule],

  templateUrl: './blog-general-tab.html',

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
export class BlogGeneralTab {
  readonly editor = inject(BlogFormService);

  readonly form = this.editor.form;
}
