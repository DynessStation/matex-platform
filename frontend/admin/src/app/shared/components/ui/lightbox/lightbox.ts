import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  viewChild,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { LightboxService } from '../../../services/lightbox.service';

// The full-screen image preview (U-15), placed once in the layout. A set of images
// gets previous/next buttons and arrow keys; a single image shows alone. Esc, a click
// beside the image, or the close button closes it. Keys and focus are taken first, so
// it also works over a modal (the media picker).
@Component({
  selector: 'app-lightbox',
  imports: [TranslateModule],
  templateUrl: './lightbox.html',
})
export class Lightbox {
  readonly lightbox = inject(LightboxService);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly closeButton =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  constructor() {
    effect(() => {
      const open = this.lightbox.isOpen();

      this.document.body.classList.toggle('lightbox-open', open);

      if (open) {
        setTimeout(() => this.closeButton()?.nativeElement.focus());
      }
    });

    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    const view = this.document.defaultView!;

    const onKey = (event: KeyboardEvent) => this.onKey(event);

    // A modal's focus trap would pull focus back out of the preview.
    const onFocus = (event: FocusEvent) => {
      if (
        this.lightbox.isOpen() &&
        this.host.nativeElement.contains(event.target as Node)
      ) {
        event.stopPropagation();
      }
    };

    view.addEventListener('keydown', onKey, true);

    view.addEventListener('focusin', onFocus, true);

    this.destroyRef.onDestroy(() => {
      view.removeEventListener('keydown', onKey, true);

      view.removeEventListener('focusin', onFocus, true);
    });
  }

  /** A click on the dark area (not the image or a button) closes the preview. */
  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('img, button')) {
      this.lightbox.close();
    }
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.lightbox.isOpen()) {
      return;
    }

    const actions: Record<string, () => void> = {
      Escape: () => this.lightbox.close(),
      ArrowLeft: () => this.lightbox.previous(),
      ArrowRight: () => this.lightbox.next(),
      Tab: () => this.keepFocusInside(event.shiftKey),
    };

    const action = actions[event.key];

    if (action) {
      event.preventDefault();

      event.stopPropagation();

      action();
    }
  }

  private keepFocusInside(backwards: boolean): void {
    const buttons = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
    );

    if (!buttons.length) {
      return;
    }

    const at = buttons.indexOf(
      this.document.activeElement as HTMLButtonElement,
    );

    const next = (at + (backwards ? -1 : 1) + buttons.length) % buttons.length;

    buttons[at < 0 ? 0 : next].focus();
  }
}
