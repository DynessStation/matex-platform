import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { FormFields } from '../../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../../shared/components/ui/image-upload/image-upload';
import { AdminAccountFormService } from '../admin-account-form.service';

// Profile section (photo, name, alias) of the admin account form.
// Shared state lives in AdminAccountFormService.
@Component({
  selector: 'app-admin-account-profile-section',

  imports: [ReactiveFormsModule, TranslateModule, FormFields, ImageUpload],

  templateUrl: './admin-account-profile-section.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class AdminAccountProfileSection {
  readonly account = inject(AdminAccountFormService);

  readonly form = this.account.form;
}
