import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { OfficeFormService } from '../office-form.service';

// Contact tab (email, phone, links) of the office form.
// Shared state lives in OfficeFormService.
@Component({
  selector: 'app-office-contact-tab',

  imports: [HelpTip, ReactiveFormsModule, TranslateModule],

  templateUrl: './office-contact-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class OfficeContactTab {
  readonly office = inject(OfficeFormService);

  readonly form = this.office.form;
}
