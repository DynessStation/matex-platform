import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FormIssueNavigatorService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  focusFirstInvalid(controlName?: string): void {
    if (!this.isBrowser) return;
    window.setTimeout(() => {
      const escaped = controlName
        ? controlName.replace(/(["\\])/g, '\\$1')
        : null;
      const selectors = escaped
        ? [`[formControlName="${escaped}"]`, `#${escaped}`]
        : [
            '.form-control.ng-invalid.ng-touched',
            '.form-select.ng-invalid.ng-touched',
            'select2.ng-invalid.ng-touched',
            '[formControlName].ng-invalid.ng-touched',
            '.is-invalid',
          ];
      const target = selectors
        .flatMap((selector) =>
          Array.from(this.document.querySelectorAll<HTMLElement>(selector)),
        )
        .find((element) => this.isVisible(element));
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusTarget = target.matches(
        'input, textarea, select, button, [contenteditable]',
      )
        ? target
        : target.querySelector<HTMLElement>(
            'input, textarea, select, button, [contenteditable="true"]',
          );
      focusTarget?.focus({ preventScroll: true });
    }, 80);
  }

  private isVisible(element: HTMLElement): boolean {
    return Boolean(element.offsetWidth || element.offsetHeight);
  }
}
