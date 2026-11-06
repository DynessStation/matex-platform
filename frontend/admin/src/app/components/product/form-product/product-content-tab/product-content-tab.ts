import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { NgxEditorModule } from 'ngx-editor';

import { AiFieldAction } from '../../../../shared/components/ui/ai-field-action/ai-field-action';
import { TitleSlug } from '../../../../shared/components/ui/form-kit/title-slug';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { InlineTable } from '../../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineRow,
} from '../../../../shared/components/ui/inline-table/inline-table.model';
import { SPEC_COLUMNS } from '../form-product.columns';
import { ProductAssistantService } from '../product-assistant.service';
import { ProductFormService } from '../product-form.service';

// Content tab (name, slug, descriptions, specifications per language) of the product form.
// Shared state lives in ProductFormService.
@Component({
  selector: 'app-product-content-tab',

  imports: [
    TitleSlug,
    InlineTable,
    HelpTip,
    ReactiveFormsModule,
    NgxEditorModule,
    AiFieldAction,
  ],

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

  readonly specColumns = SPEC_COLUMNS;
  readonly whileEditing = (_row: InlineRow, editing: boolean) => editing;

  /** Rows live in the form until its save: a row's check just closes it. */
  keep(change: InlineChange): void {
    change.done(true);
  }
}
