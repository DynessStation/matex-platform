import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { LocalizedNumberInputDirective } from '../../../shared/directives/localized-number-input.directive';
import { ISalesChannel } from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';

const isDate = (value: unknown) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

/** The general rates of the ladder, and the dated charges of each sales channel. */
@Component({
  selector: 'app-costing-channels',
  imports: [
    FormsModule,
    InlineTable,
    HasPermissionDirective,
    LocalizedNumberInputDirective,
  ],
  templateUrl: './costing-channels.html',
})
export class CostingChannels implements OnInit {
  private costing = inject(CostingService);
  private notifications = inject(NotificationService);

  readonly channels = signal<{ channel: ISalesChannel; rows: InlineRow[] }[]>(
    [],
  );
  readonly savingRates = signal(false);
  rates: Record<string, number | null> = {
    gpm: null,
    affiliate: null,
    app: null,
    wholesale_discount: null,
    usd_rate: null,
    round_idr: null,
  };

  readonly blank: InlineRow = {
    name: '',
    type: 'percent',
    value: '',
    cap: '',
    per: 'item',
    from: today(),
    to: '',
  };

  readonly columns: InlineColumn[] = [
    {
      key: 'name',
      label: 'Nama biaya',
      placeholder: 'Biaya admin',
      validate: (value) =>
        String(value ?? '').trim() ? null : 'form_kit.required',
    },
    {
      key: 'type',
      label: 'Jenis',
      type: 'select',
      width: '120px',
      options: [
        { value: 'percent', label: 'Persen' },
        { value: 'fixed', label: 'Nominal' },
      ],
    },
    {
      key: 'value',
      label: 'Nilai',
      type: 'number',
      decimals: 4,
      width: '110px',
      validate: (value, row) => {
        const number = Number(value);
        if (value === null || value === '' || value === undefined)
          return 'form_kit.required';
        return row['type'] === 'percent' && number >= 100
          ? 'Di bawah 100.'
          : null;
      },
    },
    {
      key: 'cap',
      label: 'Batas per item',
      type: 'number',
      decimals: 2,
      width: '110px',
      placeholder: 'Opsional',
    },
    {
      key: 'per',
      label: 'Per',
      type: 'select',
      width: '110px',
      options: [
        { value: 'item', label: 'Item' },
        { value: 'order', label: 'Pesanan' },
      ],
    },
    {
      key: 'from',
      label: 'Berlaku dari',
      type: 'date',
      width: '140px',
      validate: (value) => (isDate(value) ? null : 'YYYY-MM-DD'),
    },
    {
      key: 'to',
      label: 'Sampai',
      type: 'date',
      width: '140px',
      validate: (value) => (!value || isDate(value) ? null : 'YYYY-MM-DD'),
    },
  ];

  ngOnInit(): void {
    this.costing.setting().subscribe((response) => {
      const setting = response.data;
      const pct = (value: number) => Math.round(value * 10000) / 100;
      this.rates = {
        gpm: pct(setting.gpm),
        affiliate: pct(setting.affiliate),
        app: pct(setting.app),
        wholesale_discount: pct(setting.wholesale_discount),
        usd_rate: setting.usd_rate,
        round_idr: setting.round_idr,
      };
    });
    this.costing.channels().subscribe((response) => {
      this.channels.set(
        (response.data ?? []).map((channel) => ({
          channel,
          rows: channel.fees.map((fee) => ({
            id: fee.id,
            name: fee.name,
            type: fee.type,
            value: fee.value,
            cap: fee.cap,
            per: fee.per,
            from: fee.from,
            to: fee.to ?? '',
            category_id: fee.category_id,
          })),
        })),
      );
    });
  }

  saveRates(): void {
    this.savingRates.set(true);
    this.costing
      .saveSetting({
        gpm: Number(this.rates['gpm']) / 100,
        affiliate: Number(this.rates['affiliate']) / 100,
        app: Number(this.rates['app']) / 100,
        wholesale_discount: Number(this.rates['wholesale_discount']) / 100,
        usd_rate: Number(this.rates['usd_rate']),
        round_idr: Number(this.rates['round_idr']),
      })
      .subscribe({
        next: () => {
          this.savingRates.set(false);
          this.notifications.showSuccess('Tarif umum tersimpan.');
        },
        error: () => {
          this.savingRates.set(false);
        },
      });
  }

  saveFee(channelId: string, change: InlineChange): void {
    const { row } = change;
    const id = change.isNew ? null : String(row['id']);
    this.costing
      .saveFee(channelId, id, {
        name: row['name'],
        type: row['type'],
        value: Number(row['value']),
        cap:
          row['cap'] === '' || row['cap'] == null ? null : Number(row['cap']),
        per: row['per'],
        from: row['from'],
        to: row['to'] || null,
        category_id: row['category_id'] ?? null,
      })
      .subscribe({
        next: (response) => {
          const created = response.data?.id;
          change.done(true, created ? { ...row, id: created } : row);
        },
        error: () => {
          change.done(false);
        },
      });
  }

  removeFee(change: InlineChange): void {
    this.costing.deleteFee(String(change.row['id'])).subscribe({
      next: () => change.done(true),
      error: () => {
        change.done(false);
      },
    });
  }
}
