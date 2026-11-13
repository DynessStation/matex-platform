import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  Signal,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  NgbDateStruct,
  NgbModal,
  NgbTimeStruct,
} from '@ng-bootstrap/ng-bootstrap';
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
  EnglishAutofill,
  controlPairs,
} from '../../../shared/components/ui/english/english-autofill';
import {
  TabState,
  tabState,
} from '../../../shared/components/ui/form-kit/form-kit.util';
import {
  MediaSelection,
  selectedAttachment,
} from '../../../shared/components/ui/media-box/media-box';
import {
  TagChoice,
  TagOption,
} from '../../../shared/components/ui/tag-picker/tag-picker.model';
import { mediaConfig } from '../../../shared/data/media-config';
import {
  ArticleStatus,
  IArticleDetail,
  IArticlePayload,
} from '../../../shared/interface/blog.interface';
import { BlogService } from '../../../shared/services/blog.service';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  CreateBlogAction,
  EditBlogAction,
  UpdateBlogAction,
} from '../../../shared/store/action/blog.action';
import { AuthState } from '../../../shared/store/state/auth.state';
import { BlogState } from '../../../shared/store/state/blog.state';
import { ArticleTagsModal } from '../article-tags-modal/article-tags-modal';

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
  private blog = inject(BlogService);
  private modal = inject(NgbModal);

  // Bound to the form's input in connect().
  type: Signal<'create' | 'edit'> = signal('create');

  connect(form: { type: Signal<'create' | 'edit'> }): void {
    this.type = form.type;
  }

  /** English that follows Indonesian on save (V1.2 Part 3, stage 4). */
  readonly english = inject(EnglishAutofill);

  constructor() {
    this.english.configure('article', () =>
      controlPairs(
        this.form.controls,
        [
          'title',
          'slug',
          'excerpt',
          'body',
          'meta_title',
          'meta_description',
          'og_title',
          'og_description',
        ],
        {
          types: {
            excerpt: 'multiline_text',
            body: 'rich_text_html',
            meta_description: 'seo_description',
            og_description: 'seo_description',
          },
          slugs: { slug: 'title' },
        },
      ),
    );
    // English hidden: the Indonesian fields are the ones on screen.
    effect(() => {
      if (!this.english.visible()) this.activeLocale = 'id';
    });
  }

  readonly mediaConfig = mediaConfig;
  readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly dateLabel = dateLabel;
  id: string | null = null;
  article: IArticleDetail | null = null;
  idEditor?: Editor;
  enEditor?: Editor;
  activeTab: BlogFormTab = 'content';
  readonly saving = signal(false);
  readonly tried = signal(false);
  readonly tagOptions = signal<TagOption[]>([]);
  activeLocale: BlogFormLocale = 'id';
  publishDate: NgbDateStruct | null = null;
  publishTime: NgbTimeStruct | null = null;
  unpublishDate: NgbDateStruct | null = null;
  unpublishTime: NgbTimeStruct | null = null;
  readonly form = this.fb.group({
    tags: [[] as TagChoice[]],
    author_name: ['', Validators.maxLength(120)],
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
    this.loadTags();
    // A new article starts under its writer's name; a pen name can replace it.
    if (!this.id) {
      void this.english.remember(null);
      this.form.controls.author_name.setValue(
        this.store.selectSnapshot(AuthState.user)?.name ?? '',
      );
    }
    if (this.id)
      this.store.dispatch(new EditBlogAction(this.id)).subscribe(() => {
        const a = this.store.selectSnapshot(BlogState.selectedBlog);
        if (!a) return;
        this.article = a;
        const id = a.translations.find((t) => t.locale === 'id-ID'),
          en = a.translations.find((t) => t.locale === 'en-US');
        this.form.patchValue({
          tags: a.tags,
          author_name: a.author_name,
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
        void this.english.remember(this.id);
      });
  }

  destroy() {
    this.idEditor?.destroy();
    this.enEditor?.destroy();
  }

  //==================================================
  //==== TABS AND MEDIA
  //==================================================

  private loadTags() {
    this.blog.getTags().subscribe((response) => {
      this.tagOptions.set(
        (response.data ?? []).map((tag) => ({
          id: tag.id,
          name: tag.name_id,
          count: tag.article_count,
        })),
      );
    });
  }
  /** Kelola tag; the list is read again afterwards, names may have changed. */
  manageTags() {
    const refresh = () => this.loadTags();
    this.modal
      .open(ArticleTagsModal, { size: 'lg', centered: true })
      .result.then(refresh, refresh);
  }

  //==================================================
  //==== TAB STATE
  //==================================================

  tabStates(): Record<BlogFormTab, TabState> {
    const c = this.form.controls;
    return {
      content: tabState({
        required: [
          c.id_title,
          c.id_slug,
          c.id_body,
          c.en_title,
          c.en_slug,
          c.en_body,
        ],
        recommended: [c.id_excerpt, c.en_excerpt, c.tags, c.author_name],
      }),
      seo: tabState({
        recommended: [c.id_meta_description, c.en_meta_description],
      }),
      media: tabState({
        required: [c.thumbnail_id],
        recommended: [c.og_image_id],
      }),
      publication: this.scheduledDateInvalid
        ? 'error'
        : tabState({ required: [c.status] }),
    };
  }
  /** After a save was tried: something still stops it. */
  get showIssue(): boolean {
    return this.tried() && (this.form.invalid || this.scheduledDateInvalid);
  }

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

  async submit() {
    if (this.english.busy() || this.saving()) return;
    // English follows Indonesian before anything is checked.
    await this.english.fill(this.form.controls.id_title.value ?? '');
    this.syncSchedule();
    this.tried.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.scheduledDateInvalid) {
      this.english.revealInvalid(this.form.controls);
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
      tags: v.tags ?? [],
      author_name: v.author_name ?? '',
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
    this.saving.set(true);
    const id = this.id;
    this.store.dispatch(action).subscribe({
      complete: async () => {
        await this.english.saveSources(
          id ?? this.store.selectSnapshot(BlogState.lastCreatedId),
        );
        void this.router.navigateByUrl('/blog');
      },
      error: (error) => {
        this.saving.set(false);
        if (error?.error?.code !== 'ARTICLE_CONFLICT') return;
        // The server found the address taken after the form's own check said free.
        this.activeTab = 'content';
        this.form.controls.id_slug.setErrors({
          ...(this.form.controls.id_slug.errors ?? {}),
          duplicate: true,
        });
        this.formIssues.focusFirstInvalid('id_slug');
      },
    });
  }
  private firstInvalidTab(): BlogFormTab {
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
