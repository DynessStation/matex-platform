import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private elementRef = inject(ElementRef);

  readonly clickOutside = output<Event>();

@HostListener('document:click', ['$event'])
onClick(event: MouseEvent): void {
  const targetElement = event.target as HTMLElement | null;

  if (!targetElement) return;

  const clickedInside =
    this.elementRef.nativeElement.contains(targetElement);

  if (!clickedInside) {
    this.clickOutside.emit(event);
  }
}

}
