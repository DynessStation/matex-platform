import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Select2Module } from 'ng-select2-component';

import { FormFields } from '../../../../shared/components/ui/form-fields/form-fields';
import { AdminAccountFormService } from '../admin-account-form.service';

// Contact section (emails, phones with country code) of the admin account form.
// Shared state lives in AdminAccountFormService.
@Component({
  selector: 'app-admin-account-contact-section',

  imports: [ReactiveFormsModule, TranslateModule, Select2Module, FormFields],

  templateUrl: './admin-account-contact-section.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class AdminAccountContactSection {
  readonly account = inject(AdminAccountFormService);

  readonly form = this.account.form;
}
