import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbTimepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { OperatingDay, defaultOperatingRange } from '../form-office.model';
import { OfficeFormService } from '../office-form.service';

// Operating hours tab of the office form: one row per weekday with its time ranges.
// The day drafts live in OfficeFormService.
@Component({
  selector: 'app-office-hours-tab',

  imports: [FormsModule, TranslateModule, NgbTimepickerModule],

  templateUrl: './office-hours-tab.html',
})
export class OfficeHoursTab {
  readonly office = inject(OfficeFormService);

  toggleDay(day: OperatingDay): void {
    day.is_closed = !day.is_closed;

    if (!day.is_closed && !day.ranges.length) {
      day.ranges.push(defaultOperatingRange());
    }

    if (day.is_closed) {
      day.ranges = [];
    }
  }

  addRange(day: OperatingDay): void {
    day.is_closed = false;

    day.ranges.push({
      open_time: null,

      close_time: null,
    });
  }

  removeRange(day: OperatingDay, index: number): void {
    day.ranges.splice(index, 1);

    if (!day.ranges.length) {
      day.is_closed = true;
    }
  }
}
