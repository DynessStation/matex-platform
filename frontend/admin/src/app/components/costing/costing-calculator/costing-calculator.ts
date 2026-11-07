import {
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { debounceTime, Subject, switchMap } from 'rxjs';

import { LocalizedNumberInputDirective } from '../../../shared/directives/localized-number-input.directive';
import {
  ICalculateResult,
  ICostItem,
  percent,
  rupiah,
} from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';

const number = (value: number | null) =>
  value !== null && Number.isFinite(value) && value > 0 ? value : 0;

/** One product on every channel: what is charged, what arrives, what remains. */
@Component({
  selector: 'app-costing-calculator',
  imports: [FormsModule, LocalizedNumberInputDirective],
  templateUrl: './costing-calculator.html',
})
export class CostingCalculator implements OnInit {
  private costing = inject(CostingService);
  private destroyRef = inject(DestroyRef);
  private changes = new Subject<void>();

  readonly itemId = input('');
  readonly rupiah = rupiah;
  readonly percent = percent;

  readonly items = signal<ICostItem[]>([]);
  readonly result = signal<ICalculateResult | null>(null);
  readonly open = signal<string | null>(null);

  item = '';
  form: Record<string, number | null> = {
    hpp: null,
    price: null,
    qty: 1,
    discount: null,
    voucher: null,
    ads: null,
    shipping: null,
    tax: null,
    target: null,
  };

  ngOnInit(): void {
    this.item = this.itemId();
    this.changes
      .pipe(
        debounceTime(250),
        switchMap(() => this.costing.calculate(this.request())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (response) => this.result.set(response.data) });
    this.costing.items().subscribe((response) => {
      this.items.set(response.data ?? []);
      this.changed();
    });
  }

  private request() {
    const target = number(this.form['target']);
    return {
      ...(this.item ? { item_id: this.item } : {}),
      ...(this.form['hpp'] ? { hpp: number(this.form['hpp']) } : {}),
      ...(this.form['price'] ? { price: number(this.form['price']) } : {}),
      qty: number(this.form['qty']) || 1,
      discount: number(this.form['discount']),
      voucher: number(this.form['voucher']),
      ads_rate: Math.min(number(this.form['ads']) / 100, 0.95),
      shipping: number(this.form['shipping']),
      tax_rate: Math.min(number(this.form['tax']) / 100, 0.95),
      target_margin: target ? Math.min(target / 100, 0.95) : null,
    };
  }

  changed(): void {
    this.changes.next();
  }

  /** Choosing an item brings back its HPP and calculated price. */
  chooseItem(): void {
    this.form['hpp'] = null;
    this.form['price'] = null;
    this.changed();
  }
}
