import { Component, inject, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { ListReturnService } from '../../../services/list-return.service';

// "Kembali" in a form header (U-7): back to the list the form belongs to, with the
// search, sort, page, and filters it was left with.
@Component({
  selector: 'app-back-button',
  imports: [TranslateModule],
  templateUrl: './back-button.html',
})
export class BackButton {
  readonly lists = inject(ListReturnService);

  /** Path of the list ("/product"). */
  readonly to = input.required<string>();

  back(event: MouseEvent): void {
    // New tab or window: let the browser open the link itself.
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    this.lists.back(this.to());
  }
}
