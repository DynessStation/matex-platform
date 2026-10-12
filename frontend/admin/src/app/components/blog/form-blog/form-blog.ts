import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, input, PLATFORM_ID } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  NgbDateStruct,
  NgbModule,
  NgbTimeStruct,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { finalize } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';
import { AiFieldAction } from '../../../shared/components/ui/ai-field-action/ai-field-action';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  ArticleStatus,
  IArticleDetail,
  IArticlePayload,
  IArticleTranslation,
} from '../../../shared/interface/blog.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  CreateBlogAction,
  EditBlogAction,
  UpdateBlogAction,
} from '../../../shared/store/action/blog.action';
import { BlogState } from '../../../shared/store/state/blog.state';

@Component({
  selector: 'app-form-blog',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgxEditorModule,
    ImageUpload,
    Button,
    AiFieldAction,
  ],
  templateUrl: './form-blog.html',
  styleUrl: './form-blog.scss',
})
export class FormBlog {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private contentAssistant = inject(ContentAssistantService);
  private notification = inject(NotificationService);
  private formIssues = inject(FormIssueNavigatorService);
  readonly type = input<'create' | 'edit'>('create');
  readonly mediaConfig = mediaConfig;
  readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  id: string | null = null;
  article: IArticleDetail | null = null;
  idEditor?: Editor;
  enEditor?: Editor;
  activeTab = 'general';
  activeLocale: 'id' | 'en' = 'id';
  assistingLocale: 'id' | 'en' | null = null;
  translatingToEnglish = false;
  assistingField: string | null = null;
  publishDate: NgbDateStruct | null = null;
  publishTime: NgbTimeStruct | null = null;
  unpublishDate: NgbDateStruct | null = null;
  unpublishTime: NgbTimeStruct | null = null;
  readonly form = this.fb.group({
    key: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    status: ['draft' as ArticleStatus, Validators.required],
    is_featured: [false],
    is_sticky: [false],
    published_at: [''],
    unpublished_at: [''],
    thumbnail_id: ['', Validators.required],
    og_image_id: [''],
    id_slug: ['', Validators.required],
    id_title: ['', Validators.required],
    id_excerpt: [''],
    id_body: ['', Validators.required],
    id_meta_title: [''],
    id_meta_description: [''],
    id_canonical_url: [''],
    id_og_title: [''],
    id_og_description: [''],
    en_slug: ['', Validators.required],
    en_title: ['', Validators.required],
    en_excerpt: [''],
    en_body: ['', Validators.required],
    en_meta_title: [''],
    en_meta_description: [''],
    en_canonical_url: [''],
    en_og_title: [''],
    en_og_description: [''],
  });
  ngOnInit() {
    if (this.browser) {
      this.idEditor = new Editor();
      this.enEditor = new Editor();
    }
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id)
      this.store.dispatch(new EditBlogAction(this.id)).subscribe(() => {
        const a = this.store.selectSnapshot(BlogState.selectedBlog);
        if (!a) return;
        this.article = a;
        const id = a.translations.find((t) => t.locale === 'id-ID'),
          en = a.translations.find((t) => t.locale === 'en-US');
        this.form.patchValue({
          key: a.key,
          status: a.status,
          is_featured: a.is_featured,
          is_sticky: a.is_sticky,
          published_at: this.localDate(a.published_at),
          unpublished_at: this.localDate(a.unpublished_at),
          thumbnail_id: a.thumbnail?.id_attachment ?? '',
          og_image_id: a.og_image?.id_attachment ?? '',
          id_slug: id?.slug,
          id_title: id?.title,
          id_excerpt: id?.excerpt,
          id_body: id?.body,
          id_meta_title: id?.meta_title,
          id_meta_description: id?.meta_description,
          id_canonical_url: id?.canonical_url,
          id_og_title: id?.og_title,
          id_og_description: id?.og_description,
          en_slug: en?.slug,
          en_title: en?.title,
          en_excerpt: en?.excerpt,
          en_body: en?.body,
          en_meta_title: en?.meta_title,
          en_meta_description: en?.meta_description,
          en_canonical_url: en?.canonical_url,
          en_og_title: en?.og_title,
          en_og_description: en?.og_description,
        });
        this.patchSchedule('publish', a.published_at);
        this.patchSchedule('unpublish', a.unpublished_at);
      });
  }
  private localDate(value?: string | null) {
    return value ? String(value).slice(0, 16).replace(' ', 'T') : '';
  }
  media(control: 'thumbnail_id' | 'og_image_id', data: IAttachment) {
    this.form.controls[control].setValue(data?.id_attachment ?? '');
    this.form.controls[control].markAsTouched();
  }
  setTab(tab: 'general' | 'content' | 'seo' | 'media' | 'publication') {
    this.activeTab = tab;
    if (this.browser) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  selectStatus(status: ArticleStatus) {
    this.form.controls.status.setValue(status);
    if (status === 'scheduled' && !this.publishDate) {
      const date = new Date();
      date.setMinutes(Math.ceil((date.getMinutes() + 1) / 5) * 5, 0, 0);
      this.publishDate = this.dateToStruct(date);
      this.publishTime = {
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: 0,
      };
      this.syncSchedule();
    }
  }
  syncSchedule() {
    this.form.controls.published_at.setValue(
      this.composeDateTime(this.publishDate, this.publishTime),
    );
    this.form.controls.unpublished_at.setValue(
      this.composeDateTime(this.unpublishDate, this.unpublishTime),
    );
  }
  clearUnpublish() {
    this.unpublishDate = null;
    this.unpublishTime = null;
    this.syncSchedule();
  }
  generateArticle(locale: 'id' | 'en') {
    const value = this.form.getRawValue() as any;
    this.assistingLocale = locale;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'article',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({ title: value[`${locale}_title`] }),
        fields: {
          excerpt: value[`${locale}_excerpt`] || '',
          body: value[`${locale}_body`] || '',
          meta_description: value[`${locale}_meta_description`] || '',
          og_description: value[`${locale}_og_description`] || '',
        },
        field_types: {
          excerpt: 'multiline_text',
          body: 'rich_text_html',
          meta_description: 'seo_description',
          og_description: 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assistingLocale = null)))
      .subscribe({
        next: (fields) => {
          this.form.patchValue({
            [`${locale}_excerpt`]: fields['excerpt'],
            [`${locale}_body`]: fields['body'],
            [`${locale}_meta_description`]: fields['meta_description'],
            [`${locale}_og_description`]: fields['og_description'],
          } as any);
          this.notification.showSuccess(
            'Draf artikel berhasil dibuat. Periksa fakta dan gaya bahasa sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }
  assistArticleField(
    locale: 'id' | 'en',
    field: 'excerpt' | 'body' | 'meta_description' | 'og_description',
  ) {
    if (this.assistingField) return;
    const value = this.form.getRawValue() as any;
    const controlName = `${locale}_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'article',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          user_written_title: value[`${locale}_title`],
        }),
        fields: { [field]: value[controlName] || '' },
        field_types: {
          [field]:
            field === 'body'
              ? 'rich_text_html'
              : field === 'excerpt'
                ? 'multiline_text'
                : 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          this.form.get(controlName)?.setValue(fields[field] || '');
          this.notification.showSuccess(
            'Draf field sudah diisi. Periksa fakta dan gaya bahasa sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  translateArticleField(
    field: 'excerpt' | 'body' | 'meta_description' | 'og_description',
  ) {
    if (this.assistingField) return;
    const value = this.form.getRawValue() as any;
    const controlName = `en_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: 'article',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: { [field]: value[`id_${field}`] || '' },
        field_types: {
          [field]:
            field === 'body'
              ? 'rich_text_html'
              : field === 'excerpt'
                ? 'multiline_text'
                : 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          this.form.get(controlName)?.setValue(fields[field] || '');
          this.notification.showSuccess(
            'Field English sudah diterjemahkan. Judul tetap Anda isi sendiri.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }
  copyAndTranslateToEnglish() {
    const value = this.form.getRawValue() as any;
    this.translatingToEnglish = true;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: 'article',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: {
          excerpt: value.id_excerpt || '',
          body: value.id_body || '',
          meta_description: value.id_meta_description || '',
          og_description: value.id_og_description || '',
        },
        field_types: {
          excerpt: 'multiline_text',
          body: 'rich_text_html',
          meta_description: 'seo_description',
          og_description: 'seo_description',
        },
      })
      .pipe(finalize(() => (this.translatingToEnglish = false)))
      .subscribe({
        next: (fields) => {
          this.form.patchValue({
            en_excerpt: fields['excerpt'],
            en_body: fields['body'],
            en_meta_description: fields['meta_description'],
            en_og_description: fields['og_description'],
          });
          this.activeLocale = 'en';
          this.notification.showSuccess(
            'Deskripsi English sudah diisi. Judul dan slug tetap Anda tentukan sendiri.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }
  private slugify(value: string) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 255);
  }
  private showAssistantError(error: any) {
    this.notification.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan konten belum berhasil. Coba lagi sebentar.',
    );
  }
  dateLabel(value: NgbDateStruct | null) {
    if (!value) return 'Pilih tanggal';
    return `${String(value.day).padStart(2, '0')}/${String(value.month).padStart(2, '0')}/${value.year}`;
  }
  get scheduledDateInvalid() {
    return (
      this.form.controls.status.value === 'scheduled' &&
      (!this.publishDate || !this.publishTime)
    );
  }
  private translation(
    locale: 'id-ID' | 'en-US',
    prefix: 'id' | 'en',
    v: any,
  ): IArticleTranslation {
    return {
      locale,
      slug: v[`${prefix}_slug`],
      title: v[`${prefix}_title`],
      excerpt: v[`${prefix}_excerpt`] ?? '',
      body: v[`${prefix}_body`],
      meta_title: v[`${prefix}_meta_title`] ?? '',
      meta_description: v[`${prefix}_meta_description`] ?? '',
      canonical_url: v[`${prefix}_canonical_url`] ?? '',
      og_title: v[`${prefix}_og_title`] ?? '',
      og_description: v[`${prefix}_og_description`] ?? '',
      schema_json: '',
      status: 1,
    };
  }
  submit() {
    this.syncSchedule();
    this.form.markAllAsTouched();
    if (this.form.invalid || this.scheduledDateInvalid) {
      this.activeTab = this.firstInvalidTab();
      this.notification.showError(
        this.scheduledDateInvalid
          ? 'Lengkapi tanggal dan waktu publikasi artikel.'
          : 'Form artikel belum lengkap. Periksa field yang ditandai merah.',
      );
      this.formIssues.focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue() as any;
    const payload: IArticlePayload = {
      key: v.key,
      status: v.status,
      is_featured: v.is_featured ? 1 : 0,
      is_sticky: v.is_sticky ? 1 : 0,
      published_at: v.published_at || null,
      unpublished_at: v.unpublished_at || null,
      thumbnail_id: v.thumbnail_id || null,
      og_image_id: v.og_image_id || null,
      translations: [
        this.translation('id-ID', 'id', v),
        this.translation('en-US', 'en', v),
      ],
    };
    const action = this.id
      ? new UpdateBlogAction(payload, this.id)
      : new CreateBlogAction(payload);
    this.store.dispatch(action).subscribe({
      complete: () => void this.router.navigateByUrl('/blog'),
      error: (error) => {
        if (error?.error?.code !== 'ARTICLE_CONFLICT') return;
        this.activeTab = 'general';
        this.form.controls.key.setErrors({
          ...(this.form.controls.key.errors ?? {}),
          duplicate: true,
        });
        this.formIssues.focusFirstInvalid('key');
      },
    });
  }
  private firstInvalidTab() {
    if (this.form.controls.key.invalid) return 'general';
    if (
      this.form.controls.id_slug.invalid ||
      this.form.controls.id_title.invalid ||
      this.form.controls.id_body.invalid ||
      this.form.controls.en_slug.invalid ||
      this.form.controls.en_title.invalid ||
      this.form.controls.en_body.invalid
    )
      return 'content';
    if (this.form.controls.thumbnail_id.invalid) return 'media';
    return 'publication';
  }
  private patchSchedule(type: 'publish' | 'unpublish', value?: string | null) {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const dateValue = this.dateToStruct(date);
    const timeValue: NgbTimeStruct = {
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: 0,
    };
    if (type === 'publish') {
      this.publishDate = dateValue;
      this.publishTime = timeValue;
    } else {
      this.unpublishDate = dateValue;
      this.unpublishTime = timeValue;
    }
  }
  private composeDateTime(
    date: NgbDateStruct | null,
    time: NgbTimeStruct | null,
  ) {
    if (!date || !time) return '';
    return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
  }
  private dateToStruct(date: Date): NgbDateStruct {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }
  ngOnDestroy() {
    this.idEditor?.destroy();
    this.enEditor?.destroy();
  }
}
