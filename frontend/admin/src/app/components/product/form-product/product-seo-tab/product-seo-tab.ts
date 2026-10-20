import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { Button } from '../../../../shared/components/ui/button/button';
import { ProductAssistantService } from '../product-assistant.service';
import { ProductFormService } from '../product-form.service';

// SEO tab (meta and share texts per language, save) of the product form.
// Shared state lives in ProductFormService.
@Component({
  selector: 'app-product-seo-tab',

  imports: [ReactiveFormsModule, AiFieldAction, Button],

  templateUrl: './product-seo-tab.html',

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
export class ProductSeoTab {
  readonly editor = inject(ProductFormService);

  readonly assistant = inject(ProductAssistantService);

  readonly form = this.editor.form;
}
