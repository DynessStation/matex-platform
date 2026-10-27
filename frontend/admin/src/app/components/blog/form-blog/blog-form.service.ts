import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { Editor } from 'ngx-editor';

import { BlogFormLocale, BlogFormTab } from './form-blog.model';
import {
  articleTranslation,
  composeDateTime,
  dateLabel,
  dateToStruct,
  localDate,
} from './form-blog.util';
import {
  MediaSelection,
  selectedAttachment,
} from '../../../shared/components/ui/media-box/media-box';
import { mediaConfig } from '../../../shared/data/media-config';
import {
  ArticleStatus,
  IArticleDetail,
  IArticlePayload,
} from '../../../shared/interface/blog.interface';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  CreateBlogAction,
  EditBlogAction,
  UpdateBlogAction,
} from '../../../shared/store/action/blog.action';
import { BlogState } from '../../../shared/store/state/blog.state';

// Shared state of the article form and its tabs: the reactive form, the editors, the
// publication schedule, loading the edited article, and saving with its validation.
// Provided by FormBlog (one instance per open form); the tab components inject it.
@Injectable()
export class BlogFormService {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);
  private formIssues = inject(FormIssueNavigatorService);

  // Bound to the form's input in connect().
  type: Signal<'create' | 'edit'> = signal('create');

  connect(form: { type: Signal<'create' | 'edit'> }): void {
    this.type = form.type;
  }

  readonly mediaConfig = mediaConfig;
  readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly dateLabel = dateLabel;
  id: string | null = null;
  article: IArticleDetail | null = null;
  idEditor?: Editor;
  enEditor?: Editor;
  activeTab: BlogFormTab = 'general';
  activeLocale: BlogFormLocale = 'id';
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

  //==================================================
  //==== LIFECYCLE (called by FormBlog)
  //==================================================

  init() {
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
          published_at: localDate(a.published_at),
          unpublished_at: localDate(a.unpublished_at),
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

  destroy() {
    this.idEditor?.destroy();
    this.enEditor?.destroy();
  }

  //==================================================
  //==== TABS AND MEDIA
  //==================================================

  media(control: 'thumbnail_id' | 'og_image_id', value: MediaSelection) {
    this.form.controls[control].setValue(
      selectedAttachment(value)?.id_attachment ?? '',
    );
    this.form.controls[control].markAsTouched();
  }
  setTab(tab: BlogFormTab) {
    this.activeTab = tab;
    if (this.browser) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  //==================================================
  //==== PUBLICATION SCHEDULE
  //==================================================

  selectStatus(status: ArticleStatus) {
    this.form.controls.status.setValue(status);
    if (status === 'scheduled' && !this.publishDate) {
      // Default slot: the next five-minute mark from now.
      const date = new Date();
      date.setMinutes(Math.ceil((date.getMinutes() + 1) / 5) * 5, 0, 0);
      this.publishDate = dateToStruct(date);
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
      composeDateTime(this.publishDate, this.publishTime),
    );
    this.form.controls.unpublished_at.setValue(
      composeDateTime(this.unpublishDate, this.unpublishTime),
    );
  }
  clearUnpublish() {
    this.unpublishDate = null;
    this.unpublishTime = null;
    this.syncSchedule();
  }
  get scheduledDateInvalid() {
    return (
      this.form.controls.status.value === 'scheduled' &&
      (!this.publishDate || !this.publishTime)
    );
  }
  private patchSchedule(type: 'publish' | 'unpublish', value?: string | null) {
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const dateValue = dateToStruct(date);
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

  //==================================================
  //==== SUBMIT
  //==================================================

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
    const v = this.form.getRawValue();
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
        articleTranslation('id-ID', 'id', v),
        articleTranslation('en-US', 'en', v),
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
  private firstInvalidTab(): BlogFormTab {
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
}
