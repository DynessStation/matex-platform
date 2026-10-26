import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { LocationPicker } from '../../../../shared/components/ui/location-picker/location-picker';
import { LocalizedNumberInputDirective } from '../../../../shared/directives/localized-number-input.directive';
import { OfficeFormService } from '../office-form.service';

// Location tab (map picker, address, attendance geofence) of the office form.
// Shared state lives in OfficeFormService.
@Component({
  selector: 'app-office-location-tab',

  imports: [
    HelpTip,
    ReactiveFormsModule,
    TranslateModule,
    LocationPicker,
    LocalizedNumberInputDirective,
  ],

  templateUrl: './office-location-tab.html',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class OfficeLocationTab {
  readonly office = inject(OfficeFormService);

  readonly form = this.office.form;
}
