import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { LocalizedNumberInputDirective } from '../../../shared/directives/localized-number-input.directive';
import { ICostItem } from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CostPanel } from '../cost-panel/cost-panel';

/** An item of the HPP list: its name and size, then the same panel the product form has. */
@Component({
  selector: 'app-costing-item-modal',
  imports: [
    FormsModule,
    RouterLink,
    HasPermissionDirective,
    LocalizedNumberInputDirective,
    CostPanel,
  ],
  templateUrl: './costing-item-modal.html',
})
export class CostingItemModal {
  readonly modal = inject(NgbActiveModal);
  private costing = inject(CostingService);
  private notifications = inject(NotificationService);

  readonly itemId = signal<string | null>(null);
  readonly item = signal<ICostItem | null>(null);
  readonly saving = signal(false);

  form: {
    name: string;
    group: string;
    sku: string;
    width: number | null;
    length: number | null;
    height: number | null;
  } = { name: '', group: '', sku: '', width: null, length: null, height: null };

  /** The panel read the item: fill the fields once. */
  show(item: ICostItem | null): void {
    const first = !this.item();
    this.item.set(item);
    if (!item || !first) return;
    this.form = {
      name: item.name,
      group: item.group ?? '',
      sku: item.sku ?? '',
      width: item.width,
      length: item.length,
      height: item.height,
    };
  }

  save(): void {
    const item = this.item();
    if (!item) return;
    this.saving.set(true);
    this.costing
      .saveItem(item.id, {
        name: this.form.name,
        group: this.form.group || null,
        sku: this.form.sku || null,
        width: this.form.width,
        length: this.form.length,
        height: this.form.height,
        gpm: item.own_rates.gpm,
        affiliate: item.own_rates.affiliate,
        app: item.own_rates.app,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.showSuccess('Item tersimpan.');
        },
        error: () => this.saving.set(false),
      });
  }
}
