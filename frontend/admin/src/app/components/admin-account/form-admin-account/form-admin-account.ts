import { Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { AdminAccountContactSection } from './admin-account-contact-section/admin-account-contact-section';
import { AdminAccountFormService } from './admin-account-form.service';
import { AdminAccountLookupService } from './admin-account-lookup.service';
import { AdminAccountPasswordSection } from './admin-account-password-section/admin-account-password-section';
import { AdminAccountPlacementSection } from './admin-account-placement-section/admin-account-placement-section';
import { AdminAccountProfileSection } from './admin-account-profile-section/admin-account-profile-section';
import { AdminAccountFormValue } from './form-admin-account.model';
import { Button } from '../../../shared/components/ui/button/button';
import { IAdminAccountDetailResponse } from '../../../shared/interface/admin-account.interface';

@Component({
  selector: 'app-form-admin-account',

  imports: [
    ReactiveFormsModule,
    TranslateModule,
    Button,
    AdminAccountProfileSection,
    AdminAccountContactSection,
    AdminAccountPlacementSection,
    AdminAccountPasswordSection,
  ],

  templateUrl: './form-admin-account.html',

  providers: [AdminAccountFormService, AdminAccountLookupService],
})
export class FormAdminAccount {
  readonly account = inject(AdminAccountFormService);

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IAdminAccountDetailResponse['data'] | null>(null);

  readonly formSubmit = output<AdminAccountFormValue>();

  constructor() {
    this.account.connect({
      mode: this.mode,
      editData: this.editData,
      formSubmit: this.formSubmit,
    });
  }
}
