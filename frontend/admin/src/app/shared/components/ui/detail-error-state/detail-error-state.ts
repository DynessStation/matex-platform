import { Component, computed, input, output } from '@angular/core';

import { RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-detail-error-state',

  imports: [RouterLink, TranslateModule],

  templateUrl: './detail-error-state.html',
})
export class DetailErrorState {
  //==================================================
  //==== INPUT / OUTPUT
  //==================================================

  readonly status = input<number | null>(null);

  readonly backUrl = input<string>('/');

  readonly retry = output<void>();

  //==================================================
  //==== VIEW STATE
  //==================================================

  readonly state = computed(() => {
    switch (this.status()) {
      case 404:
        return {
          icon: 'ri-file-search-line',

          title: 'detail_state.not_found_title',

          message: 'detail_state.not_found_message',

          canRetry: false,
        };

      case 403:
        return {
          icon: 'ri-lock-line',

          title: 'detail_state.forbidden_title',

          message: 'detail_state.forbidden_message',

          canRetry: false,
        };

      default:
        return {
          icon: 'ri-error-warning-line',

          title: 'detail_state.error_title',

          message: 'detail_state.error_message',

          canRetry: true,
        };
    }
  });

  //==================================================
  //==== RETRY
  //==================================================

  onRetry(): void {
    this.retry.emit();
  }
}
