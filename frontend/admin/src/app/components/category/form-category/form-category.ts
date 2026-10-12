import { Component, inject, input } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { filter, finalize, switchMap, take } from 'rxjs';

import { AdvanceDropdown } from '../../../shared/components/ui/advance-dropdown/advance-dropdown';
import { AiFieldAction } from '../../../shared/components/ui/ai-field-action/ai-field-action';
import { Button } from '../../../shared/components/ui/button/button';
import { ImageUpload } from '../../../shared/components/ui/image-upload/image-upload';
import { LocalizedNumberInputDirective } from '../../../shared/directives/localized-number-input.directive';
import { mediaConfig } from '../../../shared/data/media-config';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  ICategory,
  ICategoryDetail,
  ICategoryPayload,
  ProductCategoryStatus,
} from '../../../shared/interface/category.interface';
import { ContentAssistantService } from '../../../shared/services/content-assistant.service';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  CreateCategoryAction,
  EditCategoryAction,
  GetCategoriesAction,
  UpdateCategoryAction,
} from '../../../shared/store/action/category.action';
import { CategoryState } from '../../../shared/store/state/category.state';

@Component({
  selector: 'app-form-category',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    AdvanceDropdown,
    AiFieldAction,
    LocalizedNumberInputDirective,
    ImageUpload,
    Button,
  ],
  templateUrl: './form-category.html',
  styleUrl: './form-category.scss',
})
export class FormCategory {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private contentAssistant = inject(ContentAssistantService);
  private notification = inject(NotificationService);
  private formIssues = inject(FormIssueNavigatorService);

  readonly type = input<string>('create');
  readonly categories = input<ICategory[]>([]);
  readonly categoryType = input<string | null>('product');
  readonly mediaConfig = mediaConfig;

  category: ICategoryDetail | null = null;
  id: string | null = null;
  activeTab = 'general';
  activeLocale: 'id' | 'en' = 'id';
  assisting = false;
  assistingField: string | null = null;

  assistCategoryField(
    locale: 'id' | 'en',
    field: 'description' | 'meta_description' | 'og_description',
    mode: 'generate' | 'translate' = 'generate',
  ) {
    if (this.assistingField) return;
    const value = this.form.getRawValue() as any;
    const controlName = `${locale}_${field}`;
    this.assistingField = controlName;
    this.contentAssistant
      .assist({
        mode,
        content_type: 'product-category',
        source_locale: mode === 'translate' ? 'id-ID' : undefined,
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          user_written_name: value[`${locale}_name`] || '',
          category_key: value.key || '',
        }),
        fields: {
          [field]:
            mode === 'translate'
              ? value[`id_${field}`] || ''
              : value[controlName] || '',
        },
        field_types: {
          [field]:
            field === 'description' ? 'multiline_text' : 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assistingField = null)))
      .subscribe({
        next: (fields) => {
          this.form.get(controlName)?.setValue(fields[field] || '');
          this.notification.showSuccess(
            mode === 'translate'
              ? 'Field English sudah diterjemahkan. Nama tetap Anda isi sendiri.'
              : 'Draf field sudah diisi. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  readonly form = this.fb.group({
    key: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    parent_id: [''],
    status: ['draft' as ProductCategoryStatus, Validators.required],
    is_featured: [false],
    sort_order: [0, [Validators.required, Validators.min(0)]],
    image_id: [''],
    icon_id: [''],
    og_image_id: [''],
    id_slug: ['', Validators.required],
    id_name: ['', Validators.required],
    id_description: [''],
    id_meta_title: [''],
    id_meta_description: [''],
    id_canonical_url: [''],
    id_og_title: [''],
    id_og_description: [''],
    en_slug: ['', Validators.required],
    en_name: ['', Validators.required],
    en_description: [''],
    en_meta_title: [''],
    en_meta_description: [''],
    en_canonical_url: [''],
    en_og_title: [''],
    en_og_description: [''],
  });

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
    if (!this.id) return;
    this.store
      .dispatch(new EditCategoryAction(this.id))
      .pipe(
        switchMap(() => this.store.select(CategoryState.selectedCategory)),
        filter((value): value is ICategoryDetail => Boolean(value)),
        take(1),
      )
      .subscribe((category) => this.patch(category));
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }
  selectItem(value: any[]) {
    this.form.controls.parent_id.setValue(value?.[0] ?? '');
  }
  selectMedia(
    control: 'image_id' | 'icon_id' | 'og_image_id',
    media: IAttachment | null,
  ) {
    this.form.controls[control].setValue(media?.id_attachment ?? '');
  }

  generateDescription(locale: 'id' | 'en') {
    const value = this.form.getRawValue() as any;
    this.assisting = true;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'product-category',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          name: value[`${locale}_name`] || '',
          key: value.key || '',
        }),
        fields: {
          description: value[`${locale}_description`] || '',
          meta_description: value[`${locale}_meta_description`] || '',
          og_description: value[`${locale}_og_description`] || '',
        },
        field_types: {
          description: 'multiline_text',
          meta_description: 'seo_description',
          og_description: 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assisting = false)))
      .subscribe({
        next: (fields) => {
          this.form.patchValue({
            [`${locale}_description`]: fields['description'] || '',
            [`${locale}_meta_description`]: fields['meta_description'] || '',
            [`${locale}_og_description`]: fields['og_description'] || '',
          });
          this.notification.showSuccess(
            'Draf deskripsi kategori dibuat. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  copyAndTranslateToEnglish() {
    const value = this.form.getRawValue() as any;
    this.assisting = true;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: 'product-category',
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: {
          description: value.id_description || '',
          meta_description: value.id_meta_description || '',
          og_description: value.id_og_description || '',
        },
        field_types: {
          description: 'multiline_text',
          meta_description: 'seo_description',
          og_description: 'seo_description',
        },
      })
      .pipe(finalize(() => (this.assisting = false)))
      .subscribe({
        next: (fields) => {
          this.form.patchValue({
            en_description: fields['description'] || '',
            en_meta_description: fields['meta_description'] || '',
            en_og_description: fields['og_description'] || '',
          });
          this.activeLocale = 'en';
          this.notification.showSuccess(
            'Deskripsi English sudah diisi. Nama dan slug tetap Anda tentukan sendiri.',
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
        : 'Bantuan penulisan belum berhasil. Coba lagi sebentar.',
    );
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.activeTab = this.invalidTab();
      this.notification.showError(
        'Form kategori belum lengkap. Periksa field yang ditandai merah.',
      );
      this.formIssues.focusFirstInvalid();
      return;
    }
    const payload = this.payload();
    const action =
      this.type() === 'edit' && this.id
        ? new UpdateCategoryAction(payload, this.id)
        : new CreateCategoryAction(payload);
    this.store.dispatch(action).subscribe({
      complete: () => {
        if (this.type() === 'edit') {
          void this.router.navigateByUrl('/category');
          return;
        }
        this.form.reset({ status: 'draft', sort_order: 0, is_featured: false });
        this.category = null;
        this.activeTab = 'general';
        this.store.dispatch(new GetCategoriesAction({ type: 'product' }));
      },
      error: (error) => {
        if (error?.error?.code !== 'PRODUCT_CATEGORY_CONFLICT') return;
        this.activeTab = 'general';
        this.form.controls.key.setErrors({
          ...(this.form.controls.key.errors ?? {}),
          duplicate: true,
        });
        this.formIssues.focusFirstInvalid('key');
      },
    });
  }

  private patch(category: ICategoryDetail) {
    this.category = category;
    const id = category.translations.find((item) => item.locale === 'id-ID');
    const en = category.translations.find((item) => item.locale === 'en-US');
    this.form.patchValue({
      key: category.key,
      parent_id: category.parent_id ?? '',
      status: category.status,
      is_featured: category.is_featured,
      sort_order: category.sort_order,
      image_id: category.category_image?.id_attachment ?? '',
      icon_id: category.category_icon?.id_attachment ?? '',
      og_image_id: category.category_meta_image?.id_attachment ?? '',
      id_slug: id?.slug ?? '',
      id_name: id?.name ?? '',
      id_description: id?.description ?? '',
      id_meta_title: id?.meta_title ?? '',
      id_meta_description: id?.meta_description ?? '',
      id_canonical_url: id?.canonical_url ?? '',
      id_og_title: id?.og_title ?? '',
      id_og_description: id?.og_description ?? '',
      en_slug: en?.slug ?? '',
      en_name: en?.name ?? '',
      en_description: en?.description ?? '',
      en_meta_title: en?.meta_title ?? '',
      en_meta_description: en?.meta_description ?? '',
      en_canonical_url: en?.canonical_url ?? '',
      en_og_title: en?.og_title ?? '',
      en_og_description: en?.og_description ?? '',
    });
  }

  private payload(): ICategoryPayload {
    const value: any = this.form.getRawValue();
    const translation = (locale: 'id-ID' | 'en-US', prefix: 'id' | 'en') => ({
      locale,
      slug: value[`${prefix}_slug`]!,
      name: value[`${prefix}_name`]!,
      description: value[`${prefix}_description`] ?? '',
      meta_title: value[`${prefix}_meta_title`] ?? '',
      meta_description: value[`${prefix}_meta_description`] ?? '',
      canonical_url: value[`${prefix}_canonical_url`] ?? '',
      og_title: value[`${prefix}_og_title`] ?? '',
      og_description: value[`${prefix}_og_description`] ?? '',
      status: 1 as const,
    });
    return {
      key: value.key!,
      parent_id: value.parent_id || null,
      status: value.status!,
      is_featured: value.is_featured ? 1 : 0,
      sort_order: Number(value.sort_order) || 0,
      image_id: value.image_id || null,
      icon_id: value.icon_id || null,
      og_image_id: value.og_image_id || null,
      translations: [translation('id-ID', 'id'), translation('en-US', 'en')],
    };
  }

  private invalidTab() {
    const content = ['id_slug', 'id_name', 'en_slug', 'en_name'];
    return content.some((key) => this.form.get(key)?.invalid)
      ? 'content'
      : 'general';
  }
}
