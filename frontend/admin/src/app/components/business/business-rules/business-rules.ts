import { Component, inject, OnInit, signal } from '@angular/core';

import { forkJoin } from 'rxjs';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import {
  IBusinessEntity,
  IRevenueShareComponent,
  IRevenueShareRule,
  IStore,
  RevenueShareBase,
  RevenueShareKind,
  RevenueShareType,
} from '../../../shared/interface/business.interface';
import { BusinessService } from '../../../shared/services/business.service';
import { canManageBusiness } from '../business-permission';

/** One of the three usual parts of a rule, edited as a line of its own. */
export interface RuleSlot {
  kind: RevenueShareKind;
  label: string;
  type: RevenueShareType;
  value: number | '';
  base: RevenueShareBase;
}

interface EntityRules {
  entity: IBusinessEntity;
  stores: IStore[];
  columns: InlineColumn[];
  rows: InlineRow[];
}

const isDate = (value: unknown) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

export const SLOT_DEFAULTS: RuleSlot[] = [
  {
    kind: 'platform_fee',
    label: 'Komisi platform',
    type: 'percent',
    value: '',
    base: 'gross',
  },
  {
    kind: 'production_fee',
    label: 'Tagihan produksi',
    type: 'cost_plus',
    value: '',
    base: 'gross',
  },
  {
    kind: 'other_fee',
    label: 'Biaya lain',
    type: 'fixed',
    value: '',
    base: 'gross',
  },
];

export const TYPE_LABELS: Record<RevenueShareType, string> = {
  percent: '% dari',
  fixed: 'Rp per item',
  cost_plus: 'HPP + %',
};

/** Who gets what from an entity's sales: dated rules, one per case, per entity or per store. */
@Component({
  selector: 'app-business-rules',
  imports: [InlineTable],
  templateUrl: './business-rules.html',
})
export class BusinessRules implements OnInit {
  private business = inject(BusinessService);
  readonly canManage = canManageBusiness();

  readonly groups = signal<EntityRules[]>([]);
  readonly loaded = signal(false);
  readonly typeLabels = TYPE_LABELS;

  readonly blank: InlineRow = {
    name: '',
    store_id: '',
    from: today(),
    to: '',
    note: '',
    slots: SLOT_DEFAULTS.map((slot) => ({ ...slot })),
    others: [],
  };

  ngOnInit(): void {
    forkJoin({
      entities: this.business.entities(),
      stores: this.business.stores(),
      rules: this.business.rules(),
    }).subscribe(({ entities, stores, rules }) => {
      const storesOf = new Map<string, IStore[]>();
      for (const store of stores.data ?? []) {
        storesOf.set(store.entity_id, [
          ...(storesOf.get(store.entity_id) ?? []),
          store,
        ]);
      }
      const rulesOf = new Map<string, InlineRow[]>();
      for (const rule of rules.data ?? []) {
        rulesOf.set(rule.entity_id, [
          ...(rulesOf.get(rule.entity_id) ?? []),
          this.toRow(rule),
        ]);
      }
      this.groups.set(
        (entities.data ?? [])
          .filter((entity) => entity.kind !== 'platform')
          .map((entity) => {
            const entityStores = storesOf.get(entity.id) ?? [];
            return {
              entity,
              stores: entityStores,
              columns: this.buildColumns(entityStores),
              rows: rulesOf.get(entity.id) ?? [],
            };
          }),
      );
      this.loaded.set(true);
    });
  }

  private buildColumns(stores: IStore[]): InlineColumn[] {
    return [
      {
        key: 'name',
        label: 'Nama aturan',
        placeholder: 'Misal: Skema konsinyasi 2026',
        validate: (value) =>
          String(value ?? '').trim() ? null : 'form_kit.required',
      },
      {
        key: 'store_id',
        label: 'Berlaku untuk',
        type: 'select',
        width: '180px',
        options: [
          { value: '', label: 'Seluruh entitas' },
          ...stores.map((store) => ({
            value: store.id,
            label: `${store.name} (${store.channel_name})`,
          })),
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
        validate: (value, row) => {
          if (!value) return null;
          if (!isDate(value)) return 'YYYY-MM-DD';
          return String(value) < String(row['from']) ? 'Sebelum mulai.' : null;
        },
      },
    ];
  }

  /** Messages for the slots, by field key "slot-<kind>". */
  readonly validateRow = (row: InlineRow): Record<string, string> => {
    const errors: Record<string, string> = {};
    let percent = 0;
    for (const slot of (row['slots'] as RuleSlot[]) ?? []) {
      if (slot.value === '' || slot.value == null) continue;
      const amount = Number(slot.value);
      if (!Number.isFinite(amount) || amount < 0) {
        errors[`slot-${slot.kind}`] = 'Periksa angkanya.';
      } else if (slot.type === 'percent') {
        percent += amount;
        if (amount >= 100) errors[`slot-${slot.kind}`] = 'Di bawah 100.';
      }
      if (slot.kind === 'other_fee' && !slot.label.trim()) {
        errors['slot-other_fee'] = 'Beri nama biayanya.';
      }
    }
    if (percent >= 100)
      errors['slot-platform_fee'] = 'Total persen harus di bawah 100.';
    return errors;
  };

  private toRow(rule: IRevenueShareRule): InlineRow {
    const slots = SLOT_DEFAULTS.map((slot) => ({ ...slot }));
    const others: IRevenueShareComponent[] = [];
    for (const component of rule.components) {
      const slot = slots.find(
        (item) => item.kind === component.kind && item.value === '',
      );
      if (slot) {
        slot.label = component.label;
        slot.type = component.type;
        slot.value = component.value;
        slot.base = component.base;
      } else {
        others.push(component);
      }
    }
    return {
      id: rule.id,
      name: rule.name,
      store_id: rule.store_id ?? '',
      from: rule.from,
      to: rule.to ?? '',
      note: rule.note ?? '',
      slots,
      others,
    };
  }

  /** Changes one field of one slot on the row being edited. */
  updateSlot(
    row: InlineRow,
    set: (key: string, value: unknown) => void,
    kind: RevenueShareKind,
    field: keyof RuleSlot,
    value: unknown,
  ): void {
    const slots = ((row['slots'] as RuleSlot[]) ?? SLOT_DEFAULTS).map((slot) =>
      slot.kind === kind ? { ...slot, [field]: value } : slot,
    );
    set('slots', slots);
  }

  slotValue(raw: string): number | '' {
    const cleaned = raw
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    if (cleaned === '' || cleaned === '-') return '';
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : '';
  }

  /** "Komisi platform 10% dari harga pembeli" for a saved row. */
  summary(row: InlineRow): string {
    const parts = ((row['slots'] as RuleSlot[]) ?? [])
      .filter((slot) => slot.value !== '' && slot.value != null)
      .map((slot) => {
        const amount = Number(slot.value);
        if (slot.type === 'percent') {
          return `${slot.label} ${amount}% dari ${slot.base === 'net' ? 'dana diterima' : 'harga pembeli'}`;
        }
        if (slot.type === 'cost_plus') return `${slot.label} HPP + ${amount}%`;
        return `${slot.label} Rp ${amount.toLocaleString('id-ID')} per item`;
      });
    const others = (row['others'] as IRevenueShareComponent[]) ?? [];
    if (others.length) parts.push(`${others.length} komponen lain`);
    return parts.length
      ? `${parts.join(', ')}. Sisanya hak entitas.`
      : 'Seluruh hasil hak entitas.';
  }

  save(entityId: string, change: InlineChange): void {
    const { row } = change;
    const id = change.isNew ? null : String(row['id']);
    const components: IRevenueShareComponent[] = (
      (row['slots'] as RuleSlot[]) ?? []
    )
      .filter((slot) => slot.value !== '' && slot.value != null)
      .map((slot) => ({
        kind: slot.kind,
        label: slot.label.trim(),
        type: slot.type,
        value: Number(slot.value),
        base: slot.base,
      }));
    components.push(...((row['others'] as IRevenueShareComponent[]) ?? []));
    this.business
      .saveRule(entityId, id, {
        name: String(row['name']),
        store_id: String(row['store_id'] ?? '') || null,
        from: String(row['from']),
        to: String(row['to'] ?? '') || null,
        note: String(row['note'] ?? '').trim() || null,
        components,
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
    this.business.deleteRule(String(change.row['id'])).subscribe({
      next: () => change.done(true),
      error: () => change.done(false),
    });
  }
}
