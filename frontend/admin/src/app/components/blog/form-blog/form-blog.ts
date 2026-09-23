import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, input, PLATFORM_ID } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Editor, NgxEditorModule } from 'ngx-editor';
import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  ArticleStatus,
  IArticleDetail,
  IArticlePayload,
  IArticleTranslation,
} from '../../../shared/interface/blog.interface';
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
    ReactiveFormsModule,
    NgxEditorModule,
    FormFields,
    ImageUpload,
    Button,
  ],
  templateUrl: './form-blog.html',
  styleUrl: './form-blog.scss',
})
export class FormBlog {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  readonly type = input<'create' | 'edit'>('create');
  readonly mediaConfig = mediaConfig;
  readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  id: string | null = null;
  article: IArticleDetail | null = null;
  idEditor?: Editor;
  enEditor?: Editor;
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
      });
  }
  private localDate(value?: string | null) {
    return value ? String(value).slice(0, 16).replace(' ', 'T') : '';
  }
  media(control: 'thumbnail_id' | 'og_image_id', data: IAttachment) {
    this.form.controls[control].setValue(data?.id_attachment ?? '');
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
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
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
    this.store
      .dispatch(action)
      .subscribe({ complete: () => void this.router.navigateByUrl('/blog') });
  }
  ngOnDestroy() {
    this.idEditor?.destroy();
    this.enEditor?.destroy();
  }
}
