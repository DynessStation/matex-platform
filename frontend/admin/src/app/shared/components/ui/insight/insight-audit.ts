import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { InsightCheck, InsightSegment } from './insight.model';
import { TextFitDirective } from '../../../directives/text-fit.directive';

// Audit column: a total split in a bar with its legend, then checks with a link to fix (G-5).
@Component({
  selector: 'app-insight-audit',
  imports: [RouterLink, NgbTooltip, TranslateModule, TextFitDirective],
  templateUrl: './insight-audit.html',
})
export class InsightAudit {
  readonly totalLabel = input('');
  readonly segments = input<InsightSegment[]>([]);
  readonly checks = input<InsightCheck[]>([]);
  /** Counted from the segments unless given (some items may not be in the split). */
  readonly total = input<number | null>(null);

  readonly sum = computed(
    () =>
      this.total() ??
      this.segments().reduce((all, item) => all + item.value, 0),
  );

  percent(value: number): number {
    const all = this.sum();
    return all > 0 ? Math.round((value / all) * 100) : 0;
  }
}
