import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

// Place holder for a part of the app that is not built yet (G-6). The drawing is MATEX's own.
@Component({
  selector: 'app-coming-soon',
  imports: [TranslateModule],
  template: `
    <div class="coming-soon" data-testid="coming-soon">
      <img
        src="assets/images/coming-soon.svg"
        alt=""
        width="320"
        height="240"
      />
      <h4>{{ textKey() | translate }}</h4>
    </div>
  `,
})
export class ComingSoon {
  readonly textKey = input('form_kit.coming_soon');
}
