import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { Store } from '@ngxs/store';
import { combineLatest, forkJoin, map } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { IBusinessEntityOption } from '../../shared/interface/business.interface';
import { rupiah } from '../../shared/interface/costing.interface';
import {
  ILedgerBalance,
  ILedgerEntry,
  IMoneyFilter,
  IMoneySummary,
} from '../../shared/interface/money.interface';
import { BusinessService } from '../../shared/services/business.service';
import { MoneyService } from '../../shared/services/money.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthState } from '../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../shared/utils/permission.util';

export const LEDGER_LABELS: Record<string, string> = {
  share: 'Hak penjualan',
  platform_fee: 'Komisi platform',
  production_fee: 'Biaya produksi',
  other_fee: 'Biaya lain',
  payment: 'Pembayaran',
};

const monthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Bisnis > Dasbor Uang: what came in over a period, what the channel kept, what the goods
// cost, and what each party is owed, behind money.view. See assets/help/money.md.
@Component({
  selector: 'app-money',
  imports: [DatePipe, PageWrapper],
  templateUrl: './money.html',
})
export class Money implements OnInit {
  private money = inject(MoneyService);
  private business = inject(BusinessService);
  private notifications = inject(NotificationService);
  private store = inject(Store);

  readonly rupiah = rupiah;
  readonly ledgerLabels = LEDGER_LABELS;
  readonly canManage = toSignal(
    combineLatest([
      this.store.select(AuthState.permissions),
      this.store.select(AuthState.isAllAccess),
    ]).pipe(
      map(([permissions, isAllAccess]) =>
        hasPermissionAccess(
          'money.manage',
          permissions ?? [],
          isAllAccess === true,
        ),
      ),
    ),
    { initialValue: false },
  );

  readonly entities = signal<IBusinessEntityOption[]>([]);
  readonly filter = signal<IMoneyFilter>({ from: monthStart(), to: today() });
  readonly summary = signal<IMoneySummary | null>(null);
  readonly entries = signal<ILedgerEntry[]>([]);
  readonly balances = signal<ILedgerBalance[]>([]);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly paying = signal(false);
  readonly payment = signal({
    payer: '',
    payee: '',
    date: today(),
    amount: '',
    note: '',
  });

  /** A partner's login has one entity: the select is then pointless. */
  readonly manyEntities = computed(() => this.entities().length > 1);
  readonly owed = computed(() =>
    this.balances().filter((row) => Math.abs(row.balance) >= 1),
  );

  ngOnInit(): void {
    this.business.entityOptions().subscribe((response) => {
      this.entities.set(response.data ?? []);
    });
    this.load();
  }

  set(key: keyof IMoneyFilter, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filter.update((current) => ({
      ...current,
      [key]: value || undefined,
    }));
    this.load();
  }

  setPayment(
    key: 'payer' | 'payee' | 'date' | 'amount' | 'note',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.payment.update((current) => ({ ...current, [key]: value }));
  }

  recordPayment(): void {
    const form = this.payment();
    const amount = Number(String(form.amount).replace(/[^\d.-]/g, ''));
    if (!form.payer || !form.payee || !form.date || !(amount > 0)) return;
    this.paying.set(true);
    this.money
      .recordPayment({
        payer_entity_id: form.payer,
        payee_entity_id: form.payee,
        date: form.date,
        amount,
        note: form.note.trim() || null,
      })
      .subscribe({
        next: () => {
          this.paying.set(false);
          this.payment.update((current) => ({
            ...current,
            amount: '',
            note: '',
          }));
          this.notifications.showSuccess('Pembayaran tercatat.');
          this.load();
        },
        error: () => this.paying.set(false),
      });
  }

  rebuild(): void {
    this.busy.set(true);
    this.money.rebuild().subscribe({
      next: (response) => {
        this.busy.set(false);
        const added = response.data?.rows_added ?? 0;
        this.notifications.showSuccess(
          added
            ? `Buku dihitung ulang: ${added} baris baru.`
            : 'Buku sudah sesuai, tidak ada yang berubah.',
        );
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  private load(): void {
    const filter = this.filter();
    forkJoin({
      summary: this.money.summary(filter),
      ledger: this.money.ledger({
        entity: filter.entity,
        from: filter.from,
        to: filter.to,
      }),
    }).subscribe(({ summary, ledger }) => {
      this.summary.set(summary.data);
      this.entries.set(ledger.data ?? []);
      this.balances.set(ledger.meta?.balances ?? []);
      this.loaded.set(true);
    });
  }
}
