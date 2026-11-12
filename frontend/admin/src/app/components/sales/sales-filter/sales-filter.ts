import {
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';

import {
  ISalesFilter,
  ISalesStore,
} from '../../../shared/interface/sales.interface';
import { SalesService } from '../../../shared/services/sales.service';

/** Store, period, and search shared by the Pesanan and Dana cair tabs. */
@Component({
  selector: 'app-sales-filter',
  templateUrl: './sales-filter.html',
})
export class SalesFilter implements OnInit {
  private sales = inject(SalesService);

  readonly searchPlaceholder = input('Cari nomor pesanan atau produk');
  readonly kinds = input(false);
  readonly changed = output<ISalesFilter>();

  readonly stores = signal<ISalesStore[]>([]);
  readonly filter = signal<ISalesFilter>({});

  ngOnInit(): void {
    this.sales.stores().subscribe((response) => {
      this.stores.set(response.data ?? []);
    });
  }

  set(key: keyof ISalesFilter, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filter.update((current) => ({
      ...current,
      [key]: value || undefined,
    }));
    this.changed.emit(this.filter());
  }
}
