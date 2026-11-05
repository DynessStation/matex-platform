import { Component, input, model } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { INSIGHT_RANGES, InsightRange } from './insight.model';

// The band of up to three columns at the top of a page (G-5).
@Component({
  selector: 'app-insight-panel',
  template: `<div class="insight-panel" data-testid="insight-panel">
    <ng-content />
  </div>`,
})
export class InsightPanel {}

// One column: a heading, an optional range switch, and its content. Extra heading controls go in
// an element marked insightAction.
@Component({
  selector: 'app-insight-column',
  imports: [TranslateModule],
  template: `
    <section class="insight-column" data-testid="insight-column">
      <header class="insight-column-head">
        <h6>{{ headingKey() | translate }}</h6>
        <ng-content select="[insightAction]" />
        @if (showRange()) {
          <div
            class="insight-range"
            role="group"
            [attr.aria-label]="headingKey() | translate"
          >
            @for (item of ranges; track item) {
              <button
                type="button"
                [class.active]="range() === item"
                [attr.aria-pressed]="range() === item"
                (click)="range.set(item)"
              >
                {{ item }}
              </button>
            }
          </div>
        }
      </header>
      <ng-content />
    </section>
  `,
})
export class InsightColumn {
  readonly headingKey = input.required<string>();
  readonly showRange = input(true);
  readonly range = model<InsightRange>('7H');
  readonly ranges = INSIGHT_RANGES;
}
