import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { positionText } from '../../../../shared/components/ui/order-list/order-list.util';
import { OfficeFormService } from '../office-form.service';

// Publication tab (public switch, slug, place in the public order, Google links) of the office
// form.
// Shared state lives in OfficeFormService.
@Component({
  selector: 'app-office-publication-tab',

  imports: [HelpTip, ReactiveFormsModule, TranslateModule],

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

  // Read-only: the order is set with "Atur urutan" in the office list.
  get position(): string {
    const data = this.office.editData();
    return data?.is_public === 1
      ? positionText(data.public_position, data.public_total)
      : positionText(null, null);
  }
}
