import { Injectable, computed, signal } from '@angular/core';

// The full-screen image preview (U-15). Images ask for it through ImagePreviewDirective;
// the Lightbox component, placed once in the layout, shows it.

export interface PreviewItem {
  src: string;
  alt?: string;
}

/** Preview items of the images in a list of attachments (videos and files left out). */
export function imagePreviewItems(
  attachments:
    | readonly {
        asset_url?: string;
        mime_type?: string;
        original_name?: string;
        name?: string;
      }[]
    | null
    | undefined,
): PreviewItem[] {
  return (attachments ?? [])
    .filter(
      (attachment) =>
        attachment.asset_url &&
        (!attachment.mime_type || attachment.mime_type.startsWith('image')),
    )
    .map((attachment) => ({
      src: attachment.asset_url!,
      alt: attachment.original_name || attachment.name || '',
    }));
}

@Injectable({ providedIn: 'root' })
export class LightboxService {
  readonly items = signal<PreviewItem[]>([]);

  readonly index = signal(0);

  readonly isOpen = computed(() => this.items().length > 0);

  readonly current = computed(() => this.items()[this.index()] ?? null);

  // Focus goes back here when the preview closes.
  private opener: HTMLElement | null = null;

  /** Shows one image, or a set opened at the image with this src. */
  open(
    item: PreviewItem,
    set: PreviewItem[] | null = null,
    opener: HTMLElement | null = null,
  ): void {
    const items = set?.length ? set : [item];

    const index = items.findIndex((entry) => entry.src === item.src);

    this.opener = opener;

    this.items.set(index < 0 ? [item] : items);

    this.index.set(Math.max(index, 0));
  }

  close(): void {
    this.items.set([]);

    this.opener?.focus();

    this.opener = null;
  }

  next(): void {
    this.step(1);
  }

  previous(): void {
    this.step(-1);
  }

  private step(by: number): void {
    const count = this.items().length;

    if (count > 1) {
      this.index.set((this.index() + by + count) % count);
    }
  }
}
