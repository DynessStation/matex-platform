import { Component, inject, OnInit, signal } from '@angular/core';

import { of, switchMap } from 'rxjs';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import {
  BusinessEntityKind,
  IBusinessEntity,
} from '../../../shared/interface/business.interface';
import { BusinessService } from '../../../shared/services/business.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { canManageBusiness } from '../business-permission';

export const ENTITY_KIND_OPTIONS = [
  { value: 'platform', label: 'Platform', tone: 'info' as const },
  { value: 'own_brand', label: 'Brand sendiri', tone: 'success' as const },
  { value: 'partner', label: 'Mitra B2B', tone: 'muted' as const },
];

export const STATUS_OPTIONS = [
  { value: '1', label: 'Aktif', tone: 'success' as const },
  { value: '0', label: 'Nonaktif', tone: 'muted' as const },
];

/** The parties of the business: the platform itself, its brands, and B2B partners. */
@Component({
  selector: 'app-business-entities',
  imports: [InlineTable],
  templateUrl: './business-entities.html',
})
export class BusinessEntities implements OnInit {
  private business = inject(BusinessService);
  readonly canManage = canManageBusiness();
  private notifications = inject(NotificationService);

  rows: InlineRow[] = [];
  readonly loaded = signal(false);

  readonly blank: InlineRow = {
    kind: 'partner',
    name: '',
    code: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    show_on_website: false,
    note: '',
    status: '1',
    store_count: 0,
    product_count: 0,
  };

  readonly columns: InlineColumn[] = [
    {
      key: 'name',
      label: 'Nama',
      placeholder: 'Nama entitas',
      validate: (value) =>
        String(value ?? '').trim() ? null : 'form_kit.required',
    },
    { key: 'code', label: 'Kode', width: '110px', placeholder: 'Otomatis' },
    {
      key: 'kind',
      label: 'Jenis',
      type: 'select',
      width: '140px',
      options: ENTITY_KIND_OPTIONS,
    },
    { key: 'contact_name', label: 'Kontak', placeholder: 'Nama kontak' },
    {
      key: 'contact_phone',
      label: 'Telepon',
      width: '150px',
      placeholder: '+62…',
      validate: (value) =>
        !value || /^\+?\d{6,20}$/.test(String(value)) ? null : 'Angka saja.',
    },
    {
      key: 'contact_email',
      label: 'Email',
      placeholder: 'Opsional',
      validate: (value) =>
        !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
          ? null
          : 'Periksa email.',
    },
    {
      key: 'store_count',
      label: 'Toko',
      type: 'computed',
      width: '70px',
      compute: (row) => String(row['store_count'] ?? 0),
    },
    {
      key: 'product_count',
      label: 'Produk',
      type: 'computed',
      width: '80px',
      compute: (row) => String(row['product_count'] ?? 0),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      width: '120px',
      options: STATUS_OPTIONS,
    },
  ];

  /** The platform entity keeps its kind and stays active; it is never removed. */
  readonly validateRow = (row: InlineRow): Record<string, string> => {
    const current = this.rows.find((item) => item['id'] === row['id']);
    const wasPlatform = current?.['kind'] === 'platform';
    const errors: Record<string, string> = {};
    if (wasPlatform && row['kind'] !== 'platform')
      errors['kind'] = 'Platform tetap platform.';
    if (!wasPlatform && row['kind'] === 'platform')
      errors['kind'] = 'Hanya satu platform.';
    if (wasPlatform && row['status'] !== '1')
      errors['status'] = 'Platform selalu aktif.';
    return errors;
  };

  /** Removal needs an inactive entity (the server also wants it unused). */
  readonly canRemove = (row: InlineRow) =>
    row['kind'] !== 'platform' && row['status'] === '0';

  readonly showDetail = (row: InlineRow, editing: boolean) =>
    editing || Boolean(row['note']) || Boolean(row['show_on_website']);

  ngOnInit(): void {
    this.reload();
  }

  private toRow(entity: IBusinessEntity): InlineRow {
    return {
      id: entity.id,
      kind: entity.kind,
      name: entity.name,
      code: entity.code,
      contact_name: entity.contact_name ?? '',
      contact_phone: entity.contact_phone ?? '',
      contact_email: entity.contact_email ?? '',
      show_on_website: entity.show_on_website,
      note: entity.note ?? '',
      status: entity.status ? '1' : '0',
      store_count: entity.store_count,
      product_count: entity.product_count,
      account_count: entity.account_count,
    };
  }

  reload(): void {
    this.business.entities().subscribe((response) => {
      this.rows = (response.data ?? []).map((entity) => this.toRow(entity));
      this.loaded.set(true);
    });
  }

  save(change: InlineChange): void {
    const { row } = change;
    const id = change.isNew ? null : String(row['id']);
    const before = this.rows.find((item) => item['id'] === id);
    const payload = {
      kind: row['kind'] as BusinessEntityKind,
      name: String(row['name']),
      code: String(row['code'] ?? '').trim() || null,
      contact_name: String(row['contact_name'] ?? '').trim() || null,
      contact_phone: String(row['contact_phone'] ?? '').trim() || null,
      contact_email: String(row['contact_email'] ?? '').trim() || null,
      show_on_website: Boolean(row['show_on_website']),
      note: String(row['note'] ?? '').trim() || null,
    };
    const wantsActive = row['status'] === '1';
    this.business
      .saveEntity(id, payload)
      .pipe(
        switchMap((response) => {
          const savedId = id ?? String(response.data?.id ?? '');
          const statusChanged = before
            ? before['status'] !== row['status']
            : !wantsActive;
          return statusChanged && savedId
            ? this.business
                .setEntityStatus(savedId, wantsActive)
                .pipe(switchMap(() => of(savedId)))
            : of(savedId);
        }),
      )
      .subscribe({
        next: (savedId) => {
          change.done(true, { ...row, id: savedId });
          // Codes may be made by the server, and counts come from it.
          this.reload();
        },
        error: () => change.done(false),
      });
  }

  remove(change: InlineChange): void {
    this.business.deleteEntity(String(change.row['id'])).subscribe({
      next: () => {
        change.done(true);
        this.notifications.showSuccess('Entitas dihapus.');
      },
      error: () => change.done(false),
    });
  }
}
