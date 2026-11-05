import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { InsightRankItem } from './insight.model';
import { TextFitDirective } from '../../../directives/text-fit.directive';

// "Top n" list of a column: icon or picture, name, small line, and a number (G-5).
@Component({
  selector: 'app-insight-rank',
  imports: [TranslateModule, TextFitDirective],
  templateUrl: './insight-rank.html',
})
export class InsightRank {
  readonly items = input<InsightRankItem[]>([]);
  readonly loading = input(false);
  readonly emptyKey = input('form_kit.insight_empty');
}
