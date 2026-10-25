import { DecimalPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { LocalizationService } from '../../../../services/localization.service';
import { Pagination } from '../../pagination/pagination';
import { TableStateService } from '../table-state.service';

// Foot of the list table: "showing x of y records · t s" and the pages.
@Component({
  selector: 'app-table-footer',

  imports: [DecimalPipe, TranslateModule, Pagination],

  templateUrl: './table-footer.html',

  styleUrl: '../table.scss',
})
export class TableFooter {
  readonly state = inject(TableStateService);

  readonly localization = inject(LocalizationService);

  readonly total = input<number | undefined>(undefined);

  readonly totalAll = input<number | undefined>(undefined);

  readonly pagination = input(true);
}
