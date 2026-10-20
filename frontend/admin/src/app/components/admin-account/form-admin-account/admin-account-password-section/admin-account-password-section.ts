import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { FormFields } from '../../../../shared/components/ui/form-fields/form-fields';
import { AdminAccountFormService } from '../admin-account-form.service';

// Password section (create mode only) of the admin account form.
// Shared state lives in AdminAccountFormService.
@Component({
  selector: 'app-admin-account-password-section',

  imports: [ReactiveFormsModule, TranslateModule, FormFields],

  templateUrl: './admin-account-password-section.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class AdminAccountPasswordSection {
  readonly account = inject(AdminAccountFormService);

  readonly form = this.account.form;
}
