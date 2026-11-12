import { Component, inject, OnInit, signal } from '@angular/core';

import { forkJoin } from 'rxjs';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import {
  IBusinessChannel,
  IBusinessEntity,
  IStore,
} from '../../../shared/interface/business.interface';
import { BusinessService } from '../../../shared/services/business.service';
import { STATUS_OPTIONS } from '../business-entities/business-entities';
import { canManageBusiness } from '../business-permission';

interface EntityStores {
  entity: IBusinessEntity;
  rows: InlineRow[];
}

/** One account of an entity on one sales channel, grouped per entity. */
@Component({
  selector: 'app-business-stores',
  imports: [InlineTable],
  templateUrl: './business-stores.html',
})
export class BusinessStores implements OnInit {
  private business = inject(BusinessService);
  readonly canManage = canManageBusiness();

  readonly groups = signal<EntityStores[]>([]);
  readonly loaded = signal(false);
  channels: IBusinessChannel[] = [];
  columns: InlineColumn[] = [];
  blank: InlineRow = {};

  ngOnInit(): void {
    forkJoin({
      entities: this.business.entities(),
      channels: this.business.channels(),
      stores: this.business.stores(),
    }).subscribe(({ entities, channels, stores }) => {
      this.channels = channels.data ?? [];
      this.columns = this.buildColumns();
      this.blank = {
        channel_id: this.channels[0]?.id ?? '',
        name: '',
        url: '',
        external_id: '',
        note: '',
        status: '1',
      };
      const byEntity = new Map<string, InlineRow[]>();
      for (const store of stores.data ?? []) {
        const list = byEntity.get(store.entity_id) ?? [];
        list.push(this.toRow(store));
        byEntity.set(store.entity_id, list);
      }
      this.groups.set(
        (entities.data ?? [])
          .filter((entity) => entity.status || byEntity.has(entity.id))
          .map((entity) => ({ entity, rows: byEntity.get(entity.id) ?? [] })),
      );
      this.loaded.set(true);
    });
  }

  private buildColumns(): InlineColumn[] {
    return [
      {
        key: 'channel_id',
        label: 'Kanal',
        type: 'select',
        width: '150px',
        options: this.channels.map((channel) => ({
          value: channel.id,
          label: channel.name,
        })),
        validate: (value) => (value ? null : 'form_kit.required'),
      },
      {
        key: 'name',
        label: 'Nama toko',
        placeholder: 'Nama di kanal itu',
        validate: (value) =>
          String(value ?? '').trim() ? null : 'form_kit.required',
      },
      {
        key: 'url',
        label: 'Tautan',
        placeholder: 'https://…',
        link: true,
        validate: (value) =>
          !value || /^https?:\/\/\S+$/i.test(String(value))
            ? null
            : 'Mulai dengan https://',
      },
      {
        key: 'external_id',
        label: 'ID penjual',
        width: '130px',
        placeholder: 'Dari Seller Center',
      },
      { key: 'note', label: 'Catatan', placeholder: 'Opsional' },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        width: '120px',
        options: STATUS_OPTIONS,
      },
    ];
  }

  private toRow(store: IStore): InlineRow {
    return {
      id: store.id,
      channel_id: store.channel_id,
      name: store.name,
      url: store.url ?? '',
      external_id: store.external_id ?? '',
      note: store.note ?? '',
      status: store.status ? '1' : '0',
    };
  }

  save(entityId: string, change: InlineChange): void {
    const { row } = change;
    const id = change.isNew ? null : String(row['id']);
    this.business
      .saveStore(entityId, id, {
        channel_id: String(row['channel_id']),
        name: String(row['name']),
        url: String(row['url'] ?? '').trim() || null,
        external_id: String(row['external_id'] ?? '').trim() || null,
        note: String(row['note'] ?? '').trim() || null,
        status: row['status'] === '1',
      })
      .subscribe({
        next: (response) => {
          const created = response.data?.id;
          change.done(true, created ? { ...row, id: created } : row);
        },
        error: () => change.done(false),
      });
  }

  remove(change: InlineChange): void {
    this.business.deleteStore(String(change.row['id'])).subscribe({
      next: () => change.done(true),
      error: () => change.done(false),
    });
  }
}
