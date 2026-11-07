import {
  Directive,
  ElementRef,
  HostListener,
  effect,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { LocalizationService } from '../services/localization.service';

/**
 * A number field: only digits go in, shown grouped as typed (1000000 becomes 1.000.000), and the
 * control holds a number. `decimals` allows that many digits after the decimal mark; pasting
 * "Rp 1.000.000" also works. Reads the group and decimal marks from the admin's language.
 */
@Directive({
  selector: 'input[appLocalizedNumber]',
  standalone: true,
  host: { autocomplete: 'off' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocalizedNumberInputDirective),
      multi: true,
    },
  ],
})
export class LocalizedNumberInputDirective implements ControlValueAccessor {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly localization = inject(LocalizationService);
  private value: number | null = null;
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Digits allowed after the decimal mark; 0 for whole numbers. */
  readonly decimals = input(0);

  constructor() {
    effect(() => {
      this.localization.locale();
      this.decimals();
      this.render();
    });
  }

  private get marks(): { group: string; decimal: string } {
    const parts = new Intl.NumberFormat(
      this.localization.locale(),
    ).formatToParts(1234567.5);
    return {
      group: parts.find((part) => part.type === 'group')?.value ?? '.',
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? ',',
    };
  }

  private group(digits: string): string {
    if (!digits) return '';
    return new Intl.NumberFormat(this.localization.locale(), {
      useGrouping: true,
      maximumFractionDigits: 0,
    }).format(BigInt(digits));
  }

  /** What was typed, as whole digits and decimal digits. */
  private read(text: string): { whole: string; fraction: string | null } {
    const { decimal } = this.marks;
    const clean = text.replace(/[^\d.,]/g, '');
    let at = clean.lastIndexOf(decimal);
    // The other mark also counts as decimal when it cannot be grouping: "12.5" means 12,5.
    if (at < 0 && this.decimals() > 0) {
      const other = decimal === ',' ? '.' : ',';
      const last = clean.lastIndexOf(other);
      const once = clean.indexOf(other) === last;
      if (last >= 0 && once && clean.length - last - 1 < 3) at = last;
    }
    const whole = (at < 0 ? clean : clean.slice(0, at))
      .replace(/\D/g, '')
      .replace(/^0+(?=\d)/, '');
    if (at < 0 || this.decimals() === 0) return { whole, fraction: null };
    return {
      whole,
      fraction: clean
        .slice(at + 1)
        .replace(/\D/g, '')
        .slice(0, this.decimals()),
    };
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    const caret = field.selectionStart ?? field.value.length;
    const atEnd = caret === field.value.length;
    const digitsBefore = field.value.slice(0, caret).replace(/\D/g, '').length;
    const { whole, fraction } = this.read(field.value);
    const hasValue = whole !== '' || Boolean(fraction);
    this.value = hasValue ? Number(`${whole || '0'}.${fraction || '0'}`) : null;
    const text =
      this.group(whole || (fraction === null ? '' : '0')) +
      (fraction === null ? '' : this.marks.decimal + fraction);
    field.value = text;
    if (atEnd) field.setSelectionRange(text.length, text.length);
    else this.placeCaret(field, digitsBefore);
    this.onChange(this.value);
  }

  /** Keeps the caret after the same digit once the marks have moved. */
  private placeCaret(field: HTMLInputElement, digitsBefore: number): void {
    let seen = 0;
    let at = 0;
    while (at < field.value.length && seen < digitsBefore) {
      if (/\d/.test(field.value[at])) seen += 1;
      at += 1;
    }
    if (digitsBefore === 0) at = 0;
    try {
      field.setSelectionRange(at, at);
    } catch {
      // Not every input type allows a selection.
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length > 1) return;
    const decimalKey =
      this.decimals() > 0 && (event.key === ',' || event.key === '.');
    if (!/^\d$/.test(event.key) && !decimalKey) event.preventDefault();
  }

  @HostListener('blur')
  handleBlur(): void {
    this.render();
    this.onTouched();
  }

  writeValue(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.value = null;
    } else {
      const parsed = Number(value);
      this.value = Number.isFinite(parsed) ? parsed : null;
    }
    this.render();
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.element.nativeElement.disabled = disabled;
  }

  private render(): void {
    this.element.nativeElement.value =
      this.value === null
        ? ''
        : new Intl.NumberFormat(this.localization.locale(), {
            maximumFractionDigits: Math.max(this.decimals(), 0),
            useGrouping: true,
          }).format(this.value);
  }
}
