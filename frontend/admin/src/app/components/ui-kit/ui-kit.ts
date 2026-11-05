import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ComingSoon } from '../../shared/components/ui/coming-soon/coming-soon';
import { AutoField } from '../../shared/components/ui/form-kit/auto-field';
import { FormHeading } from '../../shared/components/ui/form-kit/form-heading';
import { tabState } from '../../shared/components/ui/form-kit/form-kit.util';
import { FormSubmit } from '../../shared/components/ui/form-kit/form-submit';
import { TabStatus } from '../../shared/components/ui/form-kit/tab-status';
import { TitleSlug } from '../../shared/components/ui/form-kit/title-slug';
import { InlineTable } from '../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineRow,
} from '../../shared/components/ui/inline-table/inline-table.model';
import { InsightAudit } from '../../shared/components/ui/insight/insight-audit';
import {
  InsightColumn,
  InsightPanel,
} from '../../shared/components/ui/insight/insight-panel';
import { InsightRank } from '../../shared/components/ui/insight/insight-rank';
import { InsightToggle } from '../../shared/components/ui/insight/insight-toggle';

// Sample page of the V1.2 shared parts, in non-production builds only (shared/routes/routes.ts):
// where they can be looked at and tested before the pages that use them (ops/e2e/write/
// form-kit.spec.ts). The data here is made up and never saved.
@Component({
  selector: 'app-ui-kit',
  imports: [
    ReactiveFormsModule,
    NgbModule,
    TranslateModule,
    ComingSoon,
    AutoField,
    FormHeading,
    FormSubmit,
    TabStatus,
    TitleSlug,
    InlineTable,
    InsightAudit,
    InsightColumn,
    InsightPanel,
    InsightRank,
    InsightToggle,
  ],
  templateUrl: './ui-kit.html',
})
export class UiKit {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    title: ['', Validators.required],
    slug: ['', Validators.required],
    excerpt: [''],
    canonical: [''],
  });
  readonly savedForm = this.fb.group({
    title: ['Judul Tersimpan'],
    slug: ['judul-tersimpan'],
  });
  readonly tried = signal(false);

  readonly insightOpen = signal(true);
  readonly saved = signal<InlineRow | null>(null);
  readonly failNext = signal(false);

  readonly rows = signal<InlineRow[]>([
    {
      platform: 'facebook',
      name: 'Akun Contoh',
      url: 'https://www.facebook.com/contoh',
      status: 'active',
    },
    {
      platform: 'instagram',
      name: '@contoh',
      url: 'https://www.instagram.com/contoh',
      status: 'inactive',
    },
  ]);

  readonly columns: InlineColumn[] = [
    {
      key: 'platform',
      label: 'Platform',
      type: 'select',
      width: '140px',
      options: [
        { value: 'facebook', label: 'Facebook', icon: 'ri-facebook-fill' },
        { value: 'instagram', label: 'Instagram', icon: 'ri-instagram-line' },
        { value: 'tiktok', label: 'TikTok', icon: 'ri-tiktok-line' },
      ],
    },
    {
      key: 'name',
      label: 'Nama Akun',
      placeholder: '@matex',
      validate: (value) =>
        String(value ?? '').trim() ? null : 'form_kit.required',
    },
    {
      key: 'url',
      label: 'Link URL',
      link: true,
      validate: (value) =>
        /^https?:\/\/\S+$/.test(String(value ?? ''))
          ? null
          : 'form_kit.invalid_url',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      width: '120px',
      options: [
        { value: 'active', label: 'Aktif', tone: 'success' },
        { value: 'inactive', label: 'Inaktif', tone: 'danger' },
      ],
    },
  ];

  readonly blank: InlineRow = { platform: 'tiktok', status: 'inactive' };
  readonly canRemove = (row: InlineRow) => row['status'] === 'inactive';

  readonly rankItems = [
    {
      title: 'Judul Yang Cukup Panjang Sampai Terpotong Di Kolom',
      sub: '30 Oktober 2026',
      value: 14,
      href: 'https://example.com/',
    },
    { title: 'Judul Kedua', sub: '12 Oktober 2026', value: 8 },
  ];
  readonly segments = [
    { label: 'Terbit', value: 15, tone: 'success' as const },
    { label: 'Terjadwal', value: 4, tone: 'info' as const },
    { label: 'Draf', value: 1, tone: 'warning' as const },
  ];
  readonly checks = [
    { state: 'ok' as const, text: '0 artikel tanpa tag' },
    {
      state: 'warn' as const,
      text: '3 artikel tanpa konten bahasa Inggris',
      link: '/blog',
      queryParams: { audit: 'no-en' },
    },
  ];

  mainState() {
    return tabState({
      required: [this.form.controls.title, this.form.controls.slug],
      recommended: [this.form.controls.excerpt],
    });
  }

  submit(): void {
    this.tried.set(true);
    this.form.markAllAsTouched();
  }

  onSave(change: InlineChange): void {
    if (this.failNext()) {
      this.failNext.set(false);
      change.done(false);
      return;
    }
    this.saved.set(change.row);
    change.done(true);
  }

  onRemove(change: InlineChange): void {
    change.done(true);
  }
}
