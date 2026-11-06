import { Component, inject, signal } from '@angular/core';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InlineTable } from '../../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../../shared/components/ui/inline-table/inline-table.model';
import { BlogService } from '../../../shared/services/blog.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Kelola tag: names per language, how many articles use each (most used first), and deleting
// the unused ones. Opened from the article form and from the list's "Lihat tag teratas".
@Component({
  selector: 'app-article-tags-modal',
  imports: [TranslateModule, InlineTable],
  templateUrl: './article-tags-modal.html',
})
export class ArticleTagsModal {
  readonly modal = inject(NgbActiveModal);
  private readonly service = inject(BlogService);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly rows = signal<InlineRow[]>([]);

  private readonly required = (value: unknown) =>
    String(value ?? '').trim() ? null : 'form_kit.required';

  readonly columns: InlineColumn[] = [
    { key: 'name_id', label: 'article_tags.name_id', validate: this.required },
    { key: 'name_en', label: 'article_tags.name_en', validate: this.required },
    {
      key: 'count',
      label: 'article_tags.count',
      type: 'computed',
      width: '110px',
      compute: (row) => String(row['article_count'] ?? 0),
    },
  ];

  readonly canRemove = (row: InlineRow) => Number(row['article_count']) === 0;

  constructor() {
    this.service.getTags().subscribe((response) => {
      this.rows.set((response.data ?? []) as unknown as InlineRow[]);
    });
  }

  save(change: InlineChange): void {
    const { row } = change;
    this.service
      .updateTag(String(row['id']), {
        name_id: String(row['name_id']).trim(),
        name_en: String(row['name_en']).trim(),
      })
      .subscribe({
        next: () => {
          this.notification.showSuccess(
            this.translate.instant('article_tags.saved'),
            { dismissModals: false },
          );
          change.done(true);
        },
        error: () => change.done(false),
      });
  }

  remove(change: InlineChange): void {
    this.service.deleteTag(String(change.row['id'])).subscribe({
      next: () => {
        this.notification.showSuccess(
          this.translate.instant('article_tags.deleted'),
          { dismissModals: false },
        );
        change.done(true);
      },
      error: () => change.done(false),
    });
  }
}
