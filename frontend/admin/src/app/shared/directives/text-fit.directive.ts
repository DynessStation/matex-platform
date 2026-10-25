import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';

import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

// Labels never break inside a word. Text that does not fit ends in "…" and shows
// its full text in a tooltip:
// - a word wider than the box (an email, a long code) turns the box into one line
//   with "…" (class text-fit-line);
// - otherwise the box's own line clamp cuts it after its last line.
// Boxes that are one line already (white-space: nowrap) only get the tooltip.
@Directive({
  selector: '[appTextFit]',
  hostDirectives: [NgbTooltip],
  host: {
    '(mouseenter)': 'updateTooltip()',
    '(focusin)': 'updateTooltip()',
  },
})
export class TextFitDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tooltip = inject(NgbTooltip);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    this.tooltip.container = 'body';

    this.tooltip.openDelay = 250;

    this.tooltip.tooltipClass = 'text-fit-tooltip';

    this.tooltip.ngbTooltip = '';

    if (!this.isBrowser || typeof ResizeObserver === 'undefined') {
      return;
    }

    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.fit());

      observer.observe(this.host.nativeElement);

      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Runs before the tooltip's own mouseenter, so it opens only when text is cut. */
  updateTooltip(): void {
    const truncated = this.fit();

    this.tooltip.ngbTooltip = truncated
      ? (this.host.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim()
      : '';
  }

  /** Picks the one-line mode when a word is too wide; returns whether text is cut. */
  private fit(): boolean {
    const element = this.host.nativeElement;

    element.classList.remove('text-fit-line');

    if (getComputedStyle(element).whiteSpace === 'nowrap') {
      return element.scrollWidth > element.clientWidth + 1;
    }

    if (this.hasWordWiderThan(element)) {
      element.classList.add('text-fit-line');

      return true;
    }

    return element.scrollHeight > element.clientHeight + 1;
  }

  // Measured per word: a clamped box can report a scroll width a pixel or two
  // wider than its content even when every word fits.
  private hasWordWiderThan(element: HTMLElement): boolean {
    const style = getComputedStyle(element);

    const width =
      element.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);

    const walker = element.ownerDocument.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
    );

    const range = element.ownerDocument.createRange();

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;

      for (const word of text.data.matchAll(/\S+/g)) {
        range.setStart(text, word.index);

        range.setEnd(text, word.index + word[0].length);

        if (range.getBoundingClientRect().width > width + 0.5) {
          return true;
        }
      }
    }

    return false;
  }
}
