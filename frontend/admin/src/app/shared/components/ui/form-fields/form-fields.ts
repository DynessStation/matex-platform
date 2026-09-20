import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-form-fields',
  imports: [TranslateModule],
  templateUrl: './form-fields.html',
  styleUrl: './form-fields.scss',
})
export class FormFields {
  readonly class = input<string>('mb-4 row align-items-center g-2');
  readonly label = input<string>(undefined);
  readonly labelClass = input<string>('form-label-title col-sm-3 mb-0');
  readonly gridClass = input<string>('col-sm-9');
  readonly for = input<string>(undefined);
  readonly required = input<Boolean>(undefined);
}
