import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  catchError,
  finalize,
  switchMap,
  tap,
} from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';
import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';
import {
  IWebsitePageEditorDetail,
  IWebsitePageEditorSaveRequest,
} from '../../../shared/interface/website-page-editor.interface';
import {
  IWebsitePageDetail,
  IWebsitePageSaveRequest,
  WebsitePageKey,
  WebsitePageLocale,
} from '../../../shared/interface/website-page.interface';
import { ApiMessageService } from '../../../shared/services/api-message.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { WebsitePageService } from '../../../shared/services/website-page.service';
import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';
import { WebsitePageForm } from '../website-page-form/website-page-form';

@Component({
  selector: 'app-edit-website-page',
  imports: [
    AsyncPipe,
    TranslateModule,
    PageWrapper,
    DetailErrorState,
    WebsitePageForm,
  ],
  templateUrl: './edit-website-page.html',
})
export class EditWebsitePage {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private websitePageService = inject(WebsitePageService);
  private apiMessageService = inject(ApiMessageService);
  private notificationService = inject(NotificationService);

  public pageKey = '';
  public detailErrorStatus: number | null = null;
  public page$ = new BehaviorSubject<IWebsitePageEditorDetail | null>(null);
  public saving = false;

  private source: IWebsitePageDetail | null = null;

  get pageTitle(): string {
    const titles: Record<string, string> = {
      home: 'website_home',
      about: 'website_about',
      contact: 'contact_settings',
      faq: 'faq_management',
      terms: 'terms_conditions',
      career: 'career',
    };

    return titles[this.pageKey] ?? 'website_page.edit_title';
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.pageKey = params.get('key')?.trim().toLowerCase() ?? '';
          return this.loadPage(this.pageKey);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  submit(request: IWebsitePageEditorSaveRequest): void {
    if (this.saving || !this.isWebsitePageKey(this.pageKey) || !this.source) {
      return;
    }

    const key = this.pageKey;
    this.saving = true;
    this.websitePageService
      .savePage(key, this.toWebsitePageSaveRequest(request))
      .pipe(
        switchMap((result) => {
          this.notificationService.showSuccess(
            this.apiMessageService.resolveResponse(result),
          );
          return this.loadPage(key);
        }),
        finalize(() => {
          this.saving = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  retryDetail(): void {
    this.loadPage(this.pageKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.page$.complete();
  }

  private loadPage(key: string): Observable<unknown> {
    this.detailErrorStatus = null;
    this.page$.next(null);
    this.source = null;

    if (!this.isWebsitePageKey(key)) {
      this.detailErrorStatus = 404;
      return EMPTY;
    }

    return this.websitePageService.getPage(key).pipe(
      tap((page) => {
        this.source = page;
        this.page$.next(this.toWebsitePageEditorDetail(page));
      }),
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error);
        return EMPTY;
      }),
    );
  }

  private toWebsitePageEditorDetail(
    page: IWebsitePageDetail,
  ): IWebsitePageEditorDetail {
    const template =
      page.key === 'home'
        ? 'home'
        : page.key === 'about'
          ? 'company-profile'
          : 'standard';

    return {
      id_website_page: `fixed:${page.key}`,
      id_parent_website_page: null,
      website_page_key: page.key,
      website_page_type: page.key,
      website_page_template: template,
      website_page_content_mode: 'html',
      website_page_default_locale: page.default_locale,
      website_page_status: page.is_published ? 1 : 0,
      effective_status: page.effective_status,
      website_page_visibility: 1,
      website_page_is_system: 1,
      website_page_is_featured: 0,
      website_page_sort_order: 0,
      website_page_publish_at: page.publish_at,
      website_page_unpublish_at: page.unpublish_at,
      website_page_settings_json: null,
      translations: page.translations.map((translation) => ({
        website_page_locale: translation.locale,
        website_page_slug: translation.path,
        website_page_title: translation.title,
        website_page_excerpt: translation.summary,
        website_page_content: translation.body_html,
        website_page_content_json: translation.content,
        website_page_meta_title: translation.seo.title,
        website_page_meta_description: translation.seo.description,
        website_page_meta_keywords: translation.seo.keywords,
        website_page_meta_robots: translation.seo.robots,
        website_page_canonical_url: translation.seo.canonical_url,
        website_page_og_title: translation.seo.social_title,
        website_page_og_description: translation.seo.social_description,
        website_page_schema_json: translation.seo.schema,
        website_page_i18n_status: translation.is_published ? 1 : 0,
        created: translation.created,
        updated: translation.updated,
      })),
      attachments: page.media.map((media) => ({
        id_attachment: media.id_attachment,
        collection_name: media.collection_name,
        name: media.name,
        original_name: media.original_name,
        file_name: media.file_name,
        mime_type: media.mime_type,
        extension: media.extension,
        disk: '',
        storage_path: '',
        file_size: media.file_size,
        width: media.width,
        height: media.height,
        asset_url: media.asset_url,
        website_page_attachment_role: media.slot,
        website_page_attachment_sort_order: media.sort_order,
        website_page_attachment_is_public: media.is_visible ? 1 : 0,
        website_page_attachment_action_type: media.click_action,
        website_page_attachment_action_value: media.click_target,
        translations: media.translations.map((translation) => ({
          website_page_attachment_locale: translation.locale,
          website_page_attachment_caption: translation.caption,
          website_page_attachment_alt_text: translation.alt_text,
          created: media.created,
          updated: media.updated,
        })),
        created: media.created,
        updated: media.updated,
      })),
      translation_count: page.translations.length,
      attachment_count: page.media.length,
      created_by: null,
      updated_by: null,
      created: page.created,
      updated: page.updated,
    };
  }

  private toWebsitePageSaveRequest(
    request: IWebsitePageEditorSaveRequest,
  ): IWebsitePageSaveRequest {
    const source = this.source!;
    let isPublished = source.is_published;
    let publishAt = source.publish_at;
    let unpublishAt = source.unpublish_at;

    for (const action of request.publicationActions) {
      switch (action.action) {
        case 'publish':
          isPublished = true;
          publishAt = null;
          unpublishAt = action.website_page_unpublish_at ?? null;
          break;
        case 'schedule':
          isPublished = true;
          publishAt = action.website_page_publish_at ?? null;
          unpublishAt = action.website_page_unpublish_at ?? null;
          break;
        case 'cancel_schedule':
        case 'unpublish':
        case 'archive':
          isPublished = false;
          publishAt = null;
          unpublishAt = null;
          break;
        case 'restore':
          break;
      }
    }

    return {
      is_published: isPublished,
      publish_at: publishAt,
      unpublish_at: unpublishAt,
      translations: request.payload.translations.map((translation) => ({
        locale: translation.locale as WebsitePageLocale,
        title: translation.title,
        summary: translation.excerpt ?? null,
        body_html: translation.content ?? null,
        content: translation.content_json ?? null,
        seo: {
          title: translation.meta_title ?? null,
          description: translation.meta_description ?? null,
          keywords: translation.meta_keywords ?? null,
          robots: translation.meta_robots ?? null,
          canonical_url: translation.canonical_url ?? null,
          social_title: translation.og_title ?? null,
          social_description: translation.og_description ?? null,
          schema: translation.schema_json ?? null,
        },
        is_published: translation.status === 1,
      })),
      media: (request.payload.attachments ?? []).map((media) => ({
        id_attachment: media.id_attachment,
        slot: media.role ?? 'og',
        is_visible: media.is_public === true || media.is_public === 1,
        click_action: media.action_type ?? 'none',
        click_target: media.action_value ?? null,
        translations: (media.translations ?? []).map((translation) => ({
          locale: translation.locale as WebsitePageLocale,
          caption: translation.caption ?? null,
          alt_text: translation.alt_text ?? null,
        })),
      })),
    };
  }

  private isWebsitePageKey(value: string): value is WebsitePageKey {
    return ['home', 'about', 'contact', 'faq', 'terms', 'career'].includes(
      value,
    );
  }
}
