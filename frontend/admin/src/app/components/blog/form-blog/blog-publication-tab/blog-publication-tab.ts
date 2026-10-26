import { Component, inject } from '@angular/core';
import {
  ControlContainer,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Button } from '../../../../shared/components/ui/button/button';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { BlogFormService } from '../blog-form.service';

// Publication tab (status, schedule, save) of the article form.
// Shared state lives in BlogFormService.
@Component({
  selector: 'app-blog-publication-tab',

  imports: [HelpTip, FormsModule, ReactiveFormsModule, NgbModule, Button],

  templateUrl: './blog-publication-tab.html',

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
export class BlogPublicationTab {
  readonly editor = inject(BlogFormService);

  readonly form = this.editor.form;
}
