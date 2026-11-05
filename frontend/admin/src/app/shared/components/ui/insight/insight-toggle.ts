import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  model,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

// The chart button that opens a page's insight panel (G-5). Remembered per page in this browser.
@Component({
  selector: 'app-insight-toggle',
  imports: [TranslateModule],
  template: `
    <button
      type="button"
      class="btn insight-toggle"
      [class.active]="open()"
      [attr.aria-pressed]="open()"
      [title]="'form_kit.insight_toggle' | translate"
      [attr.aria-label]="'form_kit.insight_toggle' | translate"
      data-testid="insight-toggle"
      (click)="toggle()"
    >
      <i class="ri-bar-chart-2-fill" aria-hidden="true"></i>
    </button>
  `,
})
export class InsightToggle implements OnInit {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly open = model(true);
  /** Name of the page, for remembering. */
  readonly storageKey = input.required<string>();

  private get key(): string {
    return `matex.insight.${this.storageKey()}`;
  }

  ngOnInit(): void {
    if (!this.browser) return;
    try {
      const saved = localStorage.getItem(this.key);
      if (saved !== null) this.open.set(saved === '1');
    } catch {
      // Storage can be blocked: the panel then just starts open.
    }
  }

  toggle(): void {
    this.open.update((value) => !value);
    try {
      localStorage.setItem(this.key, this.open() ? '1' : '0');
    } catch {
      // Not remembered; nothing else depends on it.
    }
  }
}
