import { Component, computed, inject, signal } from '@angular/core';

import {
  IImportReport,
  rupiah,
} from '../../../shared/interface/costing.interface';
import { CostingService } from '../../../shared/services/costing.service';
import { NotificationService } from '../../../shared/services/notification.service';

const ISSUE_LABELS: Record<string, string> = {
  inner_left_out: 'Inner tertulis, tetapi tidak ikut HPP Excel',
  line_price: 'Jumlah x harga tidak sama dengan hitungan Excel',
  difference: 'Rincian tidak sama dengan HPP',
  size_cost_sheet: 'Ukuran beda dengan sheet DETAIL HITUNGAN',
  size_product_sheet: 'Ukuran beda dengan sheet PRODUCT',
  no_size: 'Ukuran belum ada',
  no_recipe: 'Rincian tidak terbaca',
  high_gpm: 'GPM tinggi, perlu dipastikan',
};

/** Read the workbook, show what would change, save only when asked. */
@Component({
  selector: 'app-costing-import',
  templateUrl: './costing-import.html',
})
export class CostingImport {
  private costing = inject(CostingService);
  private notifications = inject(NotificationService);

  readonly rupiah = rupiah;
  readonly file = signal<File | null>(null);
  readonly report = signal<IImportReport | null>(null);
  readonly busy = signal(false);

  readonly issueGroups = computed(() => {
    const groups = new Map<string, IImportReport['issues']>();
    for (const issue of this.report()?.issues ?? []) {
      groups.set(issue.kind, [...(groups.get(issue.kind) ?? []), issue]);
    }
    return [...groups.entries()].map(([kind, issues]) => ({
      kind,
      label: ISSUE_LABELS[kind] ?? kind,
      issues,
    }));
  });

  choose(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.report.set(null);
  }

  run(apply: boolean): void {
    const file = this.file();
    if (!file) return;
    this.busy.set(true);
    this.costing.importWorkbook(file, apply).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.report.set(response.data);
        if (apply) {
          this.notifications.showSuccess(
            'Data Excel tersimpan. Harga website belum berubah.',
          );
        }
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }
}
