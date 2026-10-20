import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { LocalizedNumberInputDirective } from '../../../../shared/directives/localized-number-input.directive';
import { OfficeFormService } from '../office-form.service';

// Publication tab (public switch, slug, sort order, Google links) of the office form.
// Shared state lives in OfficeFormService.
@Component({
  selector: 'app-office-publication-tab',

  imports: [
    ReactiveFormsModule,
    TranslateModule,
    LocalizedNumberInputDirective,
  ],

  templateUrl: './office-publication-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class OfficePublicationTab {
  readonly office = inject(OfficeFormService);

  readonly form = this.office.form;
}
