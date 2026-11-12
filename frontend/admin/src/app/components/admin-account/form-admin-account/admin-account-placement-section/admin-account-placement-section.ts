import { Component, inject, signal } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Select2Module } from 'ng-select2-component';

import { FormFields } from '../../../../shared/components/ui/form-fields/form-fields';
import { IBusinessEntityOption } from '../../../../shared/interface/business.interface';
import { BusinessService } from '../../../../shared/services/business.service';
import { AdminAccountFormService } from '../admin-account-form.service';
import { AdminAccountLookupService } from '../admin-account-lookup.service';

// Placement section (company, office, chair, access, full access) of the admin
// account form. Shared state lives in AdminAccountFormService; lookups in
// AdminAccountLookupService.
@Component({
  selector: 'app-admin-account-placement-section',

  imports: [ReactiveFormsModule, TranslateModule, Select2Module, FormFields],

  templateUrl: './admin-account-placement-section.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class AdminAccountPlacementSection {
  readonly account = inject(AdminAccountFormService);

  readonly lookup = inject(AdminAccountLookupService);

  readonly form = this.account.form;

  // Entities a partner's login can be tied to (brands and partners; never the platform).
  readonly entityOptions = signal<IBusinessEntityOption[]>([]);

  constructor() {
    if (this.account.isBrowser) {
      inject(BusinessService)
        .entityOptions()
        .subscribe((response) => this.entityOptions.set(response.data ?? []));
    }
  }
}
