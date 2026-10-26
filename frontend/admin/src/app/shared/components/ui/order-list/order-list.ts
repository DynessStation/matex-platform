import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Component, input, output } from '@angular/core';

import { IOrderItem } from '../../../interface/order-list.interface';
import { HelpTip } from '../help/help-tip/help-tip';

// "Atur urutan" panel: drag rows (or use the arrows) and save the whole order at once. The
// server numbers the rows 1..n (backend helper/sort-order.helper.ts); the page loads the list,
// passes it in, and saves the emitted ids.
@Component({
  selector: 'app-order-list',
  imports: [DragDropModule, HelpTip],
  templateUrl: './order-list.html',
})
export class OrderList {
  readonly title = input('Atur urutan');

  readonly hint = input(
    'Geser baris atau pakai panah, lalu simpan. Nomor posisi diatur otomatis.',
  );

  /** Help guide anchor for the "?" next to the title. */
  readonly help = input('');

  readonly items = input<IOrderItem[]>([]);

  /** Rows can be taken out of the list (the product front). */
  readonly removable = input(false);

  /** Largest number of rows, shown as "n dari maksimal m". */
  readonly max = input<number | null>(null);

  readonly emptyText = input('Belum ada data untuk diurutkan.');

  readonly saving = input(false);

  readonly save = output<string[]>();

  readonly cancel = output<void>();

  list: IOrderItem[] = [];

  private initial = '';

  ngOnChanges(): void {
    this.list = [...this.items()];
    this.initial = this.ids().join();
  }

  get changed(): boolean {
    return this.ids().join() !== this.initial;
  }

  drop(event: CdkDragDrop<IOrderItem[]>): void {
    moveItemInArray(this.list, event.previousIndex, event.currentIndex);
  }

  move(index: number, step: -1 | 1): void {
    moveItemInArray(this.list, index, index + step);
  }

  remove(index: number): void {
    this.list.splice(index, 1);
  }

  submit(): void {
    this.save.emit(this.ids());
  }

  private ids(): string[] {
    return this.list.map((item) => item.id);
  }
}
