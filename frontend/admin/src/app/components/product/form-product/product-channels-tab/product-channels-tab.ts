import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Select2Module } from 'ng-select2-component';

import { HelpTip } from '../../../../shared/components/ui/help/help-tip/help-tip';
import { InlineTable } from '../../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineRow,
} from '../../../../shared/components/ui/inline-table/inline-table.model';
import {
  marketplaceColumns,
  oneMainChannel,
  priceColumns,
} from '../form-product.columns';
import { MARKETPLACE_PROVIDER_OPTIONS } from '../form-product.model';
import { ProductFormService } from '../product-form.service';

// Prices and marketplace links tab of the product form: compact tables whose rows are kept by
// ProductFormService and go to the server with the form's one save.
@Component({
  selector: 'app-product-channels-tab',

  imports: [
    HelpTip,
    InlineTable,
    NgTemplateOutlet,
    ReactiveFormsModule,
    Select2Module,
    TranslateModule,
  ],

  templateUrl: './product-channels-tab.html',

  // Shared with the other tabs (see FormProduct).
  styleUrl: '../form-product.scss',

  // Form controls in this template bind to the form's [formGroup].
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true }),
    },
  ],
})
export class ProductChannelsTab {
  readonly editor = inject(ProductFormService);

  readonly form = this.editor.form;

  readonly idrColumns = priceColumns('IDR');
  readonly usdColumns = priceColumns('USD');
  readonly marketplaceColumns = marketplaceColumns(
    MARKETPLACE_PROVIDER_OPTIONS as { value: string; label: string }[],
  );

  readonly priceBlank: InlineRow = {
    type: 'end_user',
    label: '',
    amount: '',
    compare_at: '',
    min_qty: '',
    max_qty: '',
    status: 'active',
    shown: 'shown',
  };
  readonly marketplaceBlank: InlineRow = {
    provider: 'shopee',
    label: '',
    url: '',
    sku: '',
    price: '',
    currency: 'IDR',
    rank: 'normal',
    shown: 'shown',
  };

  /** A wholesale price above the consumer price is allowed, but usually a typo. */
  wholesaleAboveConsumer(rows: InlineRow[]): boolean {
    const amounts = (type: string) =>
      rows
        .filter((row) => row['type'] === type)
        .map((row) => Number(row['amount']))
        .filter((amount) => Number.isFinite(amount) && amount > 0);
    const consumer = amounts('end_user');
    return (
      consumer.length > 0 &&
      amounts('wholesale').some((amount) => amount > Math.max(...consumer))
    );
  }

  /** Minimum and maximum belong to a wholesale price only. */
  readonly wholesaleOnly = (row: InlineRow, editing: boolean) =>
    editing && row['type'] === 'wholesale';
  readonly whileEditing = (_row: InlineRow, editing: boolean) => editing;

  /** Rows live in the form until its save: a row's check just closes it. */
  keep(change: InlineChange): void {
    change.done(true);
  }

  saveMarketplace(change: InlineChange): void {
    change.done(true);
    this.editor.marketplaceRows.update((rows) =>
      oneMainChannel(rows, rows[change.index]),
    );
  }
}
