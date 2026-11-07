import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { CostingItemModal } from './costing-item-modal';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { TextFitDirective } from '../../../shared/directives/text-fit.directive';
import {
  costSize,
  ICostItem,
  percent,
  PRICE_STATUS_LABELS,
  rupiah,
} from '../../../shared/interface/costing.interface';
import { CategoryService } from '../../../shared/services/category.service';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';

/** A website price this far from the calculated one counts as different. */
const SAME_PRICE = 1;

@Component({
  selector: 'app-costing-items',
  imports: [FormsModule, HasPermissionDirective, TextFitDirective],
  templateUrl: './costing-items.html',
})
export class CostingItems implements OnInit {
  private costing = inject(CostingService);
  private categories = inject(CategoryService);
  private modal = inject(NgbModal);
  private notifications = inject(NotificationService);

  readonly rupiah = rupiah;
  readonly percent = percent;
  readonly costSize = costSize;
  readonly statusLabels = PRICE_STATUS_LABELS;

  readonly items = signal<ICostItem[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly group = signal('');
  readonly onlyDifferent = signal(false);
  readonly selected = signal<Set<string>>(new Set());
  readonly confirming = signal(false);
  readonly applying = signal(false);
  /** Asking for a category before making draft products. */
  readonly creating = signal(false);
  readonly categoryOptions = signal<{ id: string; name: string }[]>([]);
  categoryId = '';

  readonly groups = computed(() => [
    ...new Set(
      this.items().flatMap((item) => (item.group ? [item.group] : [])),
    ),
  ]);

  readonly shown = computed(() => {
    const search = this.search().trim().toLowerCase();
    return this.items().filter(
      (item) =>
        (!this.group() || item.group === this.group()) &&
        (!this.onlyDifferent() || this.isDifferent(item)) &&
        (!search ||
          item.name.toLowerCase().includes(search) ||
          item.sku?.toLowerCase().includes(search)),
    );
  });

  readonly differentCount = computed(
    () => this.items().filter((item) => this.isDifferent(item)).length,
  );

  /** The ticked items that can go to the website. */
  readonly chosen = computed(() =>
    this.items().filter(
      (item) => this.selected().has(item.id) && this.canApply(item),
    ),
  );

  /** The ticked items that have no product yet. */
  readonly withoutProduct = computed(() =>
    this.items().filter(
      (item) => this.selected().has(item.id) && !item.product_id,
    ),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.costing.items().subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canApply(item: ICostItem): boolean {
    return Boolean(item.product_id) && item.hpp > 0;
  }

  isDifferent(item: ICostItem): boolean {
    return (
      this.canApply(item) &&
      (item.live.idr == null ||
        Math.abs(item.live.idr - item.commerce) > SAME_PRICE)
    );
  }

  difference(item: ICostItem): number | null {
    return item.live.idr
      ? (item.commerce - item.live.idr) / item.live.idr
      : null;
  }

  toggle(item: ICostItem): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    this.confirming.set(false);
  }

  get allShownSelected(): boolean {
    const usable = this.shown();
    return (
      usable.length > 0 && usable.every((item) => this.selected().has(item.id))
    );
  }

  toggleAll(): void {
    const usable = this.shown();
    const all = this.allShownSelected;
    this.selected.update((set) => {
      const next = new Set(set);
      for (const item of usable) {
        if (all) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
    this.confirming.set(false);
  }

  apply(): void {
    this.applying.set(true);
    this.costing.applyPrices(this.chosen().map((item) => item.id)).subscribe({
      next: (response) => {
        this.applying.set(false);
        this.confirming.set(false);
        this.selected.set(new Set());
        this.notifications.showSuccess(
          `Harga ${response.data?.applied ?? 0} produk sudah diterapkan ke katalog.`,
        );
        this.load();
      },
      error: () => {
        this.applying.set(false);
      },
    });
  }

  askCategory(): void {
    this.creating.set(true);
    this.confirming.set(false);
    if (this.categoryOptions().length) return;
    this.categories.getCategories({ locale: 'id-ID' }).subscribe((model) => {
      const flat: { id: string; name: string }[] = [];
      const walk = (list: typeof model.data, depth: number) => {
        for (const category of list ?? []) {
          flat.push({
            id: String(category.id),
            name: `${'- '.repeat(depth)}${category.name}`,
          });
          walk(category.subcategories ?? [], depth + 1);
        }
      };
      walk(model.data, 0);
      this.categoryOptions.set(flat);
    });
  }

  createProducts(): void {
    if (!this.categoryId) return;
    this.applying.set(true);
    this.costing
      .createProducts(
        this.withoutProduct().map((item) => item.id),
        this.categoryId,
      )
      .subscribe({
        next: (response) => {
          this.applying.set(false);
          this.creating.set(false);
          this.selected.set(new Set());
          this.notifications.showSuccess(
            `${response.data?.created ?? 0} produk draf dibuat. Lengkapi isinya di menu Produk.`,
          );
          this.load();
        },
        error: () => this.applying.set(false),
      });
  }

  open(item: ICostItem): void {
    const reference = this.modal.open(CostingItemModal, {
      size: 'xl',
      scrollable: true,
    });
    (reference.componentInstance as CostingItemModal).itemId.set(item.id);
    reference.closed.subscribe(() => this.load());
  }
}
