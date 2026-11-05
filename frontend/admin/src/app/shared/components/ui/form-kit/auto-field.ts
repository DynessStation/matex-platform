import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

// A value the system fills in, read-only until the pencil opens it for a custom one (G-3, G-8).
// While it is closed it shows the control's value, or `autoValue` when the control is empty
// (an empty canonical URL means "this page's own address"). Escape puts the old value back.
@Component({
  selector: 'app-auto-field',
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './auto-field.html',
})
export class AutoField {
  readonly control = input.required<FormControl<string | null>>();
  readonly fieldId = input('');
  readonly prefix = input('');
  /** Shown while closed when the control is empty. */
  readonly autoValue = input('');
  readonly invalid = input(false);
  /** Cleans a typed value when the field closes. */
  readonly normalize = input<((value: string) => string) | null>(null);

  readonly closed = output<string>();
  readonly opened = output<void>();

  readonly editing = signal(false);
  private before = '';

  readonly hasAuto = computed(() => !!this.autoValue());

  shown(): string {
    return this.control().value || this.autoValue();
  }

  open(): void {
    this.before = this.control().value ?? '';
    this.editing.set(true);
    this.opened.emit();
  }

  close(): void {
    const control = this.control();
    const clean = this.normalize();
    if (clean) control.setValue(clean(control.value ?? ''));
    control.markAsTouched();
    this.editing.set(false);
    this.closed.emit(control.value ?? '');
  }

  cancel(): void {
    this.control().setValue(this.before);
    this.editing.set(false);
  }

  /** Back to the system's value (only for a field that has one). */
  reset(): void {
    this.control().setValue('');
    this.editing.set(false);
    this.closed.emit('');
  }
}
