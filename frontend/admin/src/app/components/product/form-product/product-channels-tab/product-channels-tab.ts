import { Component, inject } from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';

import { Select2Module } from 'ng-select2-component';

import { LocalizedNumberInputDirective } from '../../../../shared/directives/localized-number-input.directive';
import { formatPrice } from '../form-product.util';
import { ProductFormService } from '../product-form.service';

// Prices and marketplace links tab of the product form. The row arrays live in
// ProductFormService; this tab keeps the card labels and the primary-link rules.
@Component({
  selector: 'app-product-channels-tab',

  imports: [ReactiveFormsModule, Select2Module, LocalizedNumberInputDirective],

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

  //==================================================
  //==== PRICES
  //==================================================

  priceSymbol(index: number) {
    return this.editor.prices.at(index).get('currency')?.value === 'USD'
      ? 'US$'
      : 'Rp';
  }
  priceCardTitle(index: number) {
    const row = this.editor.prices.at(index);
    const type =
      row.get('type')?.value === 'wholesale'
        ? 'Harga grosir'
        : 'Harga konsumen';
    const currency =
      row.get('currency')?.value === 'USD' ? 'Dollar AS' : 'Rupiah';
    return `${type} · ${currency}`;
  }
  pricePreview(index: number) {
    const row = this.editor.prices.at(index);
    const currency = row.get('currency')?.value === 'USD' ? 'USD' : 'IDR';
    const amount = Number(row.get('amount')?.value);
    if (!Number.isFinite(amount)) return '';
    return formatPrice(amount, currency);
  }

  //==================================================
  //==== MARKETPLACES (exactly one active link is primary)
  //==================================================

  selectPrimaryMarketplace(index: number) {
    const marketplaces = this.editor.marketplaces;
    const selected = marketplaces.at(index);
    if (!selected.get('is_primary')?.value) return;
    selected.get('is_active')?.setValue(true, { emitEvent: false });
    marketplaces.controls.forEach((control, itemIndex) => {
      if (itemIndex !== index)
        control.get('is_primary')?.setValue(false, { emitEvent: false });
    });
  }
  toggleMarketplaceActive(index: number) {
    const marketplaces = this.editor.marketplaces;
    const current = marketplaces.at(index);
    if (current.get('is_active')?.value || !current.get('is_primary')?.value)
      return;
    current.get('is_primary')?.setValue(false, { emitEvent: false });
    const replacement = marketplaces.controls.find(
      (control, itemIndex) =>
        itemIndex !== index && control.get('is_active')?.value,
    );
    replacement?.get('is_primary')?.setValue(true, { emitEvent: false });
  }
  removeMarketplace(index: number) {
    const marketplaces = this.editor.marketplaces;
    const removedPrimary = Boolean(
      marketplaces.at(index).get('is_primary')?.value,
    );
    marketplaces.removeAt(index);
    if (removedPrimary) {
      const replacement = marketplaces.controls.find(
        (control) => control.get('is_active')?.value,
      );
      replacement?.get('is_primary')?.setValue(true, { emitEvent: false });
    }
  }
}
