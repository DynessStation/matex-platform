import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { NgxEditorModule } from 'ngx-editor';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { ProductAssistantService } from '../product-assistant.service';
import { ProductFormService } from '../product-form.service';

// Content tab (name, slug, descriptions, specifications per language) of the product form.
// Shared state lives in ProductFormService.
@Component({
  selector: 'app-product-content-tab',

  imports: [HelpTip, ReactiveFormsModule, NgxEditorModule, AiFieldAction],

  templateUrl: './product-content-tab.html',

  // Shared with the other tabs (see FormProduct).
  styleUrl: '../form-product.scss',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class ProductContentTab {
  readonly editor = inject(ProductFormService);

  readonly assistant = inject(ProductAssistantService);

  readonly form = this.editor.form;
}
