import { Component, computed, effect, input, signal } from '@angular/core';

import { Attachment } from '../../../../../shared/interface/attachment.interface';
import { Product } from '../../../../../shared/interface/product.interface';

@Component({
  selector: 'app-product-media-gallery',
  templateUrl: './product-media-gallery.html',
  styleUrl: './product-media-gallery.scss',
})
export class ProductMediaGallery {
  product = input<Product | null>(null);
  mediaOverride = input<Attachment[] | null>(null);

  readonly activeIndex = signal(0);
  private touchStartX = 0;

  readonly media = computed(() => {
    const override = this.mediaOverride();
    const product = this.product();
    const source = override?.length
      ? override
      : product?.product_galleries?.length
        ? product.product_galleries
        : product?.product_thumbnail
          ? [product.product_thumbnail]
          : [];

    const seen = new Set<string>();
    return source.filter((item) => {
      const key = String(item.id ?? item.asset_url ?? item.original_url ?? '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  constructor() {
    effect(() => {
      const lastIndex = Math.max(0, this.media().length - 1);
      if (this.activeIndex() > lastIndex) this.activeIndex.set(lastIndex);
    });
  }

  select(index: number) {
    const length = this.media().length;
    this.activeIndex.set(length ? Math.min(Math.max(index, 0), length - 1) : 0);
  }

  previous() {
    const length = this.media().length;
    if (length > 1) this.activeIndex.update((index) => (index - 1 + length) % length);
  }

  next() {
    const length = this.media().length;
    if (length > 1) this.activeIndex.update((index) => (index + 1) % length);
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  onTouchEnd(event: TouchEvent) {
    const distance = (event.changedTouches[0]?.clientX ?? 0) - this.touchStartX;
    if (Math.abs(distance) < 45) return;
    distance > 0 ? this.previous() : this.next();
  }

  isVideo(item: Attachment) {
    return ['video/mp4', 'video/webm', 'video/ogg'].includes(item.mime_type);
  }

  mediaUrl(item: Attachment) {
    return item.asset_url || item.original_url || '';
  }
}
