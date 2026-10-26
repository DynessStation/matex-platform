import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { HelpTip } from '../help/help-tip/help-tip';

@Component({
  selector: 'app-form-fields',
  imports: [TranslateModule, HelpTip],
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
  /** Guide anchor for a "?" tip after the label (U-4); none when empty. */
  readonly help = input<string>('');
  /** Guide of the tip; the current page's guide when empty. */
  readonly helpPage = input<string>('');
}
