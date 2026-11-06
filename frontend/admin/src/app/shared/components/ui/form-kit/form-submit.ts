import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

// The form's one save button under its tabs, with the note that something still needs a look
// (G-1). It submits the form around it.
@Component({
  selector: 'app-form-submit',
  imports: [TranslateModule],
  template: `
    <div class="form-submit">
      <button
        type="submit"
        class="btn btn-theme w-100"
        [disabled]="loading()"
        [attr.id]="buttonId() || null"
        data-testid="form-submit"
      >
        @if (loading()) {
          <span
            class="spinner-border spinner-border-sm"
            aria-hidden="true"
          ></span>
        }
        {{ labelKey() | translate }}
      </button>
      @if (issue()) {
        <div
          class="form-submit-note"
          role="status"
          data-testid="form-submit-note"
        >
          <i class="ri-error-warning-line" aria-hidden="true"></i>
          {{ 'form_kit.check_again' | translate }}
        </div>
      }
    </div>
  `,
})
export class FormSubmit {
  readonly labelKey = input('form_kit.save');
  readonly buttonId = input('');
  readonly loading = input(false);
  /** Whether to show the note (usually: some tab is not "ok"). */
  readonly issue = input(false);
}
