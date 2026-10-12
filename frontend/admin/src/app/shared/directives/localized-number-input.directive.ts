import {
  Directive,
  ElementRef,
  HostListener,
  effect,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { LocalizationService } from '../services/localization.service';

@Directive({
  selector: 'input[appLocalizedNumber]',
  standalone: true,
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

  constructor() {
    effect(() => {
      this.localization.locale();
      this.render();
    });
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    this.value = digits ? Number(digits) : null;
    this.render();
    this.onChange(this.value);
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const allowed = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Enter',
    ];
    if (!/^\d$/.test(event.key) && !allowed.includes(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('blur')
  handleBlur(): void {
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
            maximumFractionDigits: 4,
            useGrouping: true,
          }).format(this.value);
  }
}
