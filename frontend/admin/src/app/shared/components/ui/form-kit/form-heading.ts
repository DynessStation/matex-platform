import { Component, computed, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { TextFitDirective } from '../../../directives/text-fit.directive';

// The record's name above the form tabs, the same on every tab (G-1).
@Component({
  selector: 'app-form-heading',
  imports: [TranslateModule, TextFitDirective],
  template: `
    <div
      class="form-heading"
      appTextFit
      [class.form-heading-empty]="!name()"
      data-testid="form-heading"
    >
      @if (name()) {
        {{ name() }}
      } @else {
        <i class="ri-error-warning-line" aria-hidden="true"></i>
        {{ emptyKey() | translate }}
      }
    </div>
  `,
})
export class FormHeading {
  readonly title = input<string | null | undefined>('');
  /** i18n key of the text shown while there is no name yet. */
  readonly emptyKey = input('form_kit.untitled');
  readonly name = computed(() => String(this.title() ?? '').trim());
}
