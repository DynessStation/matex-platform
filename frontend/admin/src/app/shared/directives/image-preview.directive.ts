import {
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  effect,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';

import { LightboxService, PreviewItem } from '../services/lightbox.service';

// Put on the box around an image: an eye button appears on hover (always on touch
// screens) and opens the image full screen (U-15). With previewSet the preview can
// move through the set; without it the image shows alone. The button does not select
// or open anything else (it sits inside media picker labels and clickable rows).
@Directive({
  selector: '[appImagePreview]',
  host: { class: 'image-preview' },
})
export class ImagePreviewDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly lightbox = inject(LightboxService);
  private readonly translate = inject(TranslateService);

  /** The image address; no button when empty. */
  readonly appImagePreview = input<string | null | undefined>('');

  readonly previewAlt = input<string | null | undefined>('');

  readonly previewSet = input<PreviewItem[] | null>(null);

  private readonly button: HTMLButtonElement;

  constructor() {
    this.button = this.renderer.createElement('button');

    this.renderer.setAttribute(this.button, 'type', 'button');

    this.renderer.addClass(this.button, 'image-preview-button');

    const icon = this.renderer.createElement('i');

    this.renderer.addClass(icon, 'ri-eye-line');

    this.renderer.setAttribute(icon, 'aria-hidden', 'true');

    this.renderer.appendChild(this.button, icon);

    this.renderer.appendChild(this.host.nativeElement, this.button);

    this.renderer.listen(this.button, 'click', (event: MouseEvent) =>
      this.open(event),
    );

    this.translate
      .stream('image_preview_open')
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((label: string) => {
        this.renderer.setAttribute(this.button, 'aria-label', label);

        this.renderer.setAttribute(this.button, 'title', label);
      });

    effect(() => {
      this.renderer.setStyle(
        this.button,
        'display',
        this.appImagePreview() ? '' : 'none',
      );
    });
  }

  private open(event: MouseEvent): void {
    // Inside a label or a clickable row: preview only.
    event.preventDefault();

    event.stopPropagation();

    const src = this.appImagePreview();

    if (src) {
      this.lightbox.open(
        { src, alt: this.previewAlt() ?? '' },
        this.previewSet(),
        this.button,
      );
    }
  }
}
