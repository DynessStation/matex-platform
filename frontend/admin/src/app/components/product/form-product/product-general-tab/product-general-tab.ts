import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { Select2Module } from 'ng-select2-component';

import { AdvanceDropdown } from '../../../../shared/components/ui/advance-dropdown/advance-dropdown';
import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { LocalizedNumberInputDirective } from '../../../../shared/directives/localized-number-input.directive';
import { ProductFormService } from '../product-form.service';

// General tab (identity, categories, logistics, stock) of the product form.
// Shared state lives in ProductFormService.
@Component({
  selector: 'app-product-general-tab',

  imports: [
    HelpTip,
    AsyncPipe,
    ReactiveFormsModule,
    Select2Module,
    AdvanceDropdown,
    LocalizedNumberInputDirective,
  ],

  templateUrl: './product-general-tab.html',

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
export class ProductGeneralTab {
  readonly editor = inject(ProductFormService);

  readonly form = this.editor.form;
}
