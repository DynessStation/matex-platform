import { Directive, HostListener } from '@angular/core';

/** A phone field: digits and one leading +, nothing else gets in, typed or pasted. */
@Directive({
  selector: 'input[appPhoneInput]',
  standalone: true,
  host: { inputmode: 'tel' },
})
export class PhoneInputDirective {
  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length > 1) return;
    if (!/^[\d+]$/.test(event.key)) event.preventDefault();
  }

  @HostListener('input', ['$event'])
  handleInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    const clean = field.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    if (clean === field.value) return;
    field.value = clean;
    // The form reads the cleaned value from this second event.
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
