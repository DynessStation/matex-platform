import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { TabState } from './form-kit.util';

// The state dot on a form tab (G-2). The rules live with each form (see tabState()).
@Component({
  selector: 'app-tab-status',
  imports: [TranslateModule],
  template: `
    <span
      [class]="'tab-status tab-status-' + state()"
      [attr.data-state]="state()"
      role="img"
      [attr.aria-label]="'form_kit.tab_' + state() | translate"
      [title]="'form_kit.tab_' + state() | translate"
    ></span>
  `,
})
export class TabStatus {
  readonly state = input.required<TabState>();
}
