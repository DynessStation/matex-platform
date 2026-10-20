import { Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { OfficeContactTab } from './office-contact-tab/office-contact-tab';
import { OfficeFormService } from './office-form.service';
import { OfficeGeneralTab } from './office-general-tab/office-general-tab';
import { OfficeHoursTab } from './office-hours-tab/office-hours-tab';
import { OfficeLocationTab } from './office-location-tab/office-location-tab';
import { OfficeMediaTab } from './office-media-tab/office-media-tab';
import { OfficePublicationTab } from './office-publication-tab/office-publication-tab';
import { Button } from '../../../shared/components/ui/button/button';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  IOfficeDetail,
  IOfficePayload,
} from '../../../shared/interface/office.interface';

@Component({
  selector: 'app-form-office',

  imports: [
    ReactiveFormsModule,
    TranslateModule,
    NgbNavModule,
    Button,
    HasPermissionDirective,
    OfficeGeneralTab,
    OfficeLocationTab,
    OfficeContactTab,
    OfficeHoursTab,
    OfficeMediaTab,
    OfficePublicationTab,
  ],

  templateUrl: './form-office.html',

  providers: [OfficeFormService],
})
export class FormOffice {
  readonly office = inject(OfficeFormService);

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IOfficeDetail | null>(null);

  readonly formSubmit = output<IOfficePayload>();

  constructor() {
    this.office.connect({
      mode: this.mode,
      editData: this.editData,
      formSubmit: this.formSubmit,
    });
  }
}
