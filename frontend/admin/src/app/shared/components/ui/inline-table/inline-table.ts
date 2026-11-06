import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  TemplateRef,
  computed,
  contentChild,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import {
  InlineChange,
  InlineColumn,
  InlineDetailContext,
  InlineOption,
  InlineRow,
} from './inline-table.model';
import { TextFitDirective } from '../../../directives/text-fit.directive';

// Compact table edited in its own rows (G-4): the pencil opens one row, the number cell becomes
// its delete button, the check saves it. A row can have a part that folds open (a template marked
// #rowDetail, see InlineDetailContext). The page does the saving and answers through done().
@Component({
  selector: 'app-inline-table',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    NgbDropdownModule,
    TranslateModule,
    TextFitDirective,
  ],
  templateUrl: './inline-table.html',
})
export class InlineTable {
  readonly columns = input.required<InlineColumn[]>();
  readonly rows = model<InlineRow[]>([]);
  /** Up and down buttons on each row. */
  readonly orderable = input(false);
  /** Hides the add button, for a list at its limit. */
  readonly canAdd = input(true);
  /** Whether an existing row may be deleted while it is open. */
  readonly canRemove = input<(row: InlineRow) => boolean>(() => true);
  /** A new row starts with these values. */
  readonly blank = input<InlineRow>({});
  readonly emptyKey = input('form_kit.table_empty');
  /** Show only: no add, edit, delete, or moving. */
  readonly readonly = input(false);
  /** Rows start with their extra part folded. */
  readonly foldedByDefault = input(false);
  /** Whether a row shows its extra part; always, by default. */
  readonly showDetail = input<
    ((row: InlineRow, editing: boolean) => boolean) | null
  >(null);
  /** Checks across fields or rows: messages by field, on top of each column's validate. */
  readonly validateRow = input<
    ((row: InlineRow, index: number) => Record<string, string>) | null
  >(null);

  readonly saveRow = output<InlineChange>();
  readonly removeRow = output<InlineChange>();
  readonly reordered = output<InlineRow[]>();
  /** A row opened or closed: forms that save later can tell one is still open. */
  readonly editingChange = output<boolean>();

  readonly detail = contentChild<TemplateRef<InlineDetailContext>>('rowDetail');

  readonly editingIndex = signal<number | null>(null);
  readonly draft = signal<InlineRow>({});
  readonly errors = signal<Record<string, string>>({});
  readonly busy = signal(false);
  private readonly folded = signal<Set<number>>(new Set());

  readonly isNew = computed(() => this.editingIndex() === this.rows().length);

  /** The saved rows, plus the new one being written. */
  readonly shown = computed<InlineRow[]>(() =>
    this.isNew() ? [...this.rows(), this.draft()] : this.rows(),
  );

  /** Every cell of a row's folded part except the fold button and the last cell. */
  readonly detailSpan = computed(
    () => this.columns().length + (this.orderable() ? 2 : 0),
  );

  constructor() {
    effect(() => this.editingChange.emit(this.editingIndex() !== null));
  }

  detailVisible(row: InlineRow, index: number): boolean {
    const rule = this.showDetail();
    return rule ? rule(row, this.isEditing(index)) : true;
  }

  readonly setValue = (key: string, value: unknown): void => {
    this.draft.update((row) => ({ ...row, [key]: value }));
    if (this.errors()[key]) {
      this.errors.update((all) => {
        const rest = { ...all };
        delete rest[key];
        return rest;
      });
    }
  };

  isEditing(index: number): boolean {
    return this.editingIndex() === index;
  }

  rowOf(row: InlineRow, index: number): InlineRow {
    return this.isEditing(index) ? this.draft() : row;
  }

  add(): void {
    if (this.editingIndex() !== null) return;
    this.draft.set({ ...this.blank() });
    this.errors.set({});
    this.editingIndex.set(this.rows().length);
  }

  edit(index: number): void {
    if (this.editingIndex() !== null) return;
    this.draft.set({ ...this.rows()[index] });
    this.errors.set({});
    this.editingIndex.set(index);
  }

  cancel(): void {
    this.editingIndex.set(null);
    this.errors.set({});
  }

  save(): void {
    const index = this.editingIndex();
    if (index === null || this.busy()) return;
    const row = this.draft();
    const errors: Record<string, string> = {};
    for (const column of this.columns()) {
      const message = column.validate?.(row[column.key], row);
      if (message) errors[column.key] = message;
    }
    Object.assign(errors, this.validateRow()?.(row, index));
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    const isNew = this.isNew();
    this.busy.set(true);
    this.saveRow.emit({
      row,
      index,
      isNew,
      done: (ok, saved) => {
        this.busy.set(false);
        if (!ok) return;
        const value = saved ?? row;
        this.rows.update((rows) =>
          isNew
            ? [...rows, value]
            : rows.map((item, i) => (i === index ? value : item)),
        );
        this.cancel();
      },
    });
  }

  /** The number cell's trash: drops an unsaved row, asks the page for a saved one. */
  remove(index: number): void {
    if (this.isNew()) {
      this.cancel();
      return;
    }
    this.busy.set(true);
    this.removeRow.emit({
      row: this.rows()[index],
      index,
      isNew: false,
      done: (ok) => {
        this.busy.set(false);
        if (!ok) return;
        this.rows.update((rows) => rows.filter((_, i) => i !== index));
        this.cancel();
      },
    });
  }

  move(index: number, step: -1 | 1): void {
    const rows = [...this.rows()];
    const target = index + step;
    if (this.editingIndex() !== null || !rows[target]) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    this.rows.set(rows);
    this.reordered.emit(rows);
  }

  isFolded(index: number): boolean {
    return (
      !this.isEditing(index) &&
      this.folded().has(index) !== this.foldedByDefault()
    );
  }

  toggleFold(index: number): void {
    this.folded.update((set) => {
      const next = new Set(set);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  text(row: InlineRow, column: InlineColumn): string {
    if (column.compute) return column.compute(row);
    return String(row[column.key] ?? '');
  }

  value(row: InlineRow, column: InlineColumn): string {
    return String(row[column.key] ?? '');
  }

  option(row: InlineRow, column: InlineColumn): InlineOption | undefined {
    return column.options?.find((item) => item.value === row[column.key]);
  }

  detailContext(row: InlineRow, index: number): InlineDetailContext {
    return {
      $implicit: row,
      editing: this.isEditing(index),
      folded: this.isFolded(index),
      set: this.setValue,
      errors: this.errors(),
    };
  }

  optionClass(option: InlineOption): string {
    return option.tone
      ? `inline-table-option inline-table-pill inline-table-pill-${option.tone}`
      : 'inline-table-option';
  }
}
