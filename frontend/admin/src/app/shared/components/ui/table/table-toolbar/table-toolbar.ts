import { Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { TableStateService } from '../table-state.service';

// Top bar of the list table: page size, bulk actions, date range, search, and the
// reload/reset/import/export tools. Bulk actions are handed back to the table, which
// owns the confirmation modals.
@Component({
  selector: 'app-table-toolbar',

  imports: [ReactiveFormsModule, NgbModule, TranslateModule],

  templateUrl: './table-toolbar.html',

  styleUrl: '../table.scss',
})
export class TableToolbar {
  readonly state = inject(TableStateService);

  readonly dateRange = input(false);

  readonly canDeleteSelected = input(false);

  readonly canDuplicateSelected = input(false);

  readonly deleteSelected = output<void>();

  readonly duplicateSelected = output<void>();
}
