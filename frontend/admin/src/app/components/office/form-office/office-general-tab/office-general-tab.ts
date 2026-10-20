import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { OfficeFormService } from '../office-form.service';

// General tab (code, name, description) of the office form.
// Shared state lives in OfficeFormService.
@Component({
  selector: 'app-office-general-tab',

  imports: [ReactiveFormsModule, TranslateModule],

  templateUrl: './office-general-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class OfficeGeneralTab {
  readonly office = inject(OfficeFormService);

  readonly form = this.office.form;
}
