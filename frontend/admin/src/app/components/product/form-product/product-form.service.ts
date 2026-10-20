import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Editor } from 'ngx-editor';
import { filter, Observable, switchMap, take } from 'rxjs';

import {
  CURRENCY_OPTIONS,
  MARKETPLACE_PROVIDER_OPTIONS,
  PRICE_TYPE_OPTIONS,
  PRICE_VISIBILITY_OPTIONS,
  PRODUCT_GALLERY_ACCEPT,
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  ProductFormLocale,
  ProductMeasurementControl,
  ProductSpecificationRow,
  STOCK_STATUS_OPTIONS,
} from './form-product.model';
import {
  formatMeasurement,
  specificationPayload,
  specificationRows,
  uniqueGallery,
} from './form-product.util';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { ICategoryModel } from '../../../shared/interface/category.interface';
import {
  IProduct,
  IProductPayload,
  ProductMediaRole,
} from '../../../shared/interface/product.interface';
import { FormIssueNavigatorService } from '../../../shared/services/form-issue-navigator.service';
import { LocalizationService } from '../../../shared/services/localization.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { GetCategoriesAction } from '../../../shared/store/action/category.action';
import {
  CreateProductAction,
  EditProductAction,
  UpdateProductAction,
} from '../../../shared/store/action/product.action';
import { CategoryState } from '../../../shared/store/state/category.state';
import { ProductState } from '../../../shared/store/state/product.state';

// Shared state of the product form and its tabs: the reactive form and its row arrays,
// categories and media, loading the edited product, and saving with its validation.
// Provided by FormProduct (one instance per open form); the tab components inject it.
@Injectable()
export class ProductFormService {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private localization = inject(LocalizationService);
  private notification = inject(NotificationService);
  private formIssues = inject(FormIssueNavigatorService);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Bound to the form's input in connect().
  type: Signal<string> = signal('create');

  connect(form: { type: Signal<string> }): void {
    this.type = form.type;
  }

  readonly productImageAccept = PRODUCT_IMAGE_ACCEPT;
  readonly productGalleryAccept = PRODUCT_GALLERY_ACCEPT;
  readonly productTypeOptions = PRODUCT_TYPE_OPTIONS;
  readonly productStatusOptions = PRODUCT_STATUS_OPTIONS;
  readonly stockStatusOptions = STOCK_STATUS_OPTIONS;
  readonly priceVisibilityOptions = PRICE_VISIBILITY_OPTIONS;
  readonly priceTypeOptions = PRICE_TYPE_OPTIONS;
  readonly currencyOptions = CURRENCY_OPTIONS;
  readonly marketplaceProviderOptions = MARKETPLACE_PROVIDER_OPTIONS;
  categories$: Observable<ICategoryModel> = this.store.select(
    CategoryState.category,
  );
  product: IProduct | null = null;
  id: string | null = null;
  activeTab = 'general';
  activeLocale: ProductFormLocale = 'id';
  idDescriptionEditor?: Editor;
  enDescriptionEditor?: Editor;
  categoryIds: string[] = [];
  categoryError = false;
  pricePublicationError = false;
  media: Partial<Record<ProductMediaRole, IAttachment | IAttachment[] | null>> =
    { thumbnail: null, gallery: [], og: null };
  readonly form = this.fb.group({
    key: [
      '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    sku: ['', Validators.required],
    product_type: ['physical', Validators.required],
    product_kind: [''],
    status: ['draft', Validators.required],
    unit: ['pcs'],
    barcode: [''],
    manufacturer_code: [''],
    country_origin: ['Indonesia'],
    origin_province: [''],
    origin_city: [''],
    hs_code: [''],
    is_featured: [false],
    sort_order: [0],
    weight_grams: [null as number | null, Validators.min(0)],
    length_mm: [null as number | null, Validators.min(0)],
    width_mm: [null as number | null, Validators.min(0)],
    height_mm: [null as number | null, Validators.min(0)],
    min_order_qty: [1, [Validators.required, Validators.min(1)]],
    lead_time_days: [null as number | null, Validators.min(0)],
    manage_stock: [false],
    stock_quantity: [null as number | null, Validators.min(0)],
    stock_status: ['in_stock'],
    price_visibility: ['contact'],
    internal_commerce_enabled: [false],
    id_slug: ['', Validators.required],
    id_name: ['', Validators.required],
    id_short_description: [''],
    id_description: [''],
    id_specifications: this.fb.array([]),
    id_meta_title: [''],
    id_meta_description: [''],
    id_canonical_url: [''],
    id_og_title: [''],
    id_og_description: [''],
    en_slug: ['', Validators.required],
    en_name: ['', Validators.required],
    en_short_description: [''],
    en_description: [''],
    en_specifications: this.fb.array([]),
    en_meta_title: [''],
    en_meta_description: [''],
    en_canonical_url: [''],
    en_og_title: [''],
    en_og_description: [''],
    prices: this.fb.array([]),
    marketplaces: this.fb.array([]),
  });
  get prices() {
    return this.form.controls.prices as FormArray;
  }
  get marketplaces() {
    return this.form.controls.marketplaces as FormArray;
  }

  //==================================================
  //==== LIFECYCLE (called by FormProduct)
  //==================================================

  init() {
    if (this.isBrowser) {
      this.idDescriptionEditor = new Editor();
      this.enDescriptionEditor = new Editor();
    }
    this.store.dispatch(new GetCategoriesAction({ locale: 'id-ID' }));
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id)
      this.store
        .dispatch(new EditProductAction(this.id))
        .pipe(
          switchMap(() => this.store.select(ProductState.selectedProduct)),
          filter((v): v is IProduct => Boolean(v)),
          take(1),
        )
        .subscribe((v) => this.patch(v));
    else {
      this.addCurrencyPrice('IDR');
      this.addCurrencyPrice('USD');
    }
  }

  destroy() {
    this.idDescriptionEditor?.destroy();
    this.enDescriptionEditor?.destroy();
  }

  //==================================================
  //==== TABS, CATEGORIES, MEDIA
  //==================================================

  setTab(tab: string) {
    this.activeTab = tab;
  }
  selectCategories(ids: any[]) {
    this.categoryIds = (ids ?? []).map(String);
    this.categoryError = this.categoryIds.length === 0;
  }
  selectMedia(role: ProductMediaRole, value: any) {
    if (role !== 'gallery' || !Array.isArray(value)) {
      this.media[role] = value;
      return;
    }
    this.media.gallery = uniqueGallery(value);
  }

  measurementHelper(controlName: ProductMeasurementControl) {
    const raw = Number(this.form.get(controlName)?.value);
    if (!Number.isFinite(raw) || raw < 0) return '';
    return formatMeasurement(
      raw,
      controlName === 'weight_grams' ? 'grams' : 'mm',
      this.localization.locale(),
    );
  }

  //==================================================
  //==== ROWS
  //==================================================

  specifications(locale: ProductFormLocale) {
    return this.form.get(`${locale}_specifications`) as FormArray;
  }
  addSpecification(locale: ProductFormLocale, value: any = {}) {
    this.specifications(locale).push(
      this.fb.group({
        label: [value.label ?? '', Validators.required],
        value: [value.value ?? '', Validators.required],
      }),
    );
  }
  removeSpecification(locale: ProductFormLocale, index: number) {
    this.specifications(locale).removeAt(index);
  }
  /** The filled specifications of one language as the stored object. */
  specificationPayload(locale: ProductFormLocale) {
    return specificationPayload(
      this.specifications(locale).getRawValue() as ProductSpecificationRow[],
    );
  }
  addPrice(value: any = {}) {
    this.prices.push(
      this.fb.group({
        type: [value.type ?? 'end_user', Validators.required],
        label: [value.label ?? ''],
        currency: [value.currency ?? 'IDR', Validators.required],
        amount: [
          value.amount ?? null,
          [Validators.required, Validators.min(0)],
        ],
        compare_at: [value.compare_at ?? null],
        min_qty: [value.min_qty ?? null],
        max_qty: [value.max_qty ?? null],
        is_public: [value.is_public ?? true],
        is_active: [value.is_active ?? true],
      }),
    );
  }
  addCurrencyPrice(currency: 'IDR' | 'USD') {
    const existing = this.prices.controls.find(
      (row) =>
        row.get('type')?.value === 'end_user' &&
        row.get('currency')?.value === currency,
    );
    if (existing) {
      existing.get('is_active')?.setValue(true);
      existing.get('is_public')?.setValue(true);
      return;
    }
    this.addPrice({
      currency,
      type: 'end_user',
      label: currency === 'IDR' ? 'Harga konsumen' : 'Consumer price',
      is_public: true,
      is_active: true,
    });
  }
  addMarketplace(value: any = {}) {
    const isFirst = this.marketplaces.length === 0;
    this.marketplaces.push(
      this.fb.group({
        provider: [value.provider ?? 'shopee', Validators.required],
        label: [value.label ?? ''],
        url: [
          value.url ?? '',
          [Validators.required, Validators.pattern(/^https?:\/\//i)],
        ],
        sku: [value.sku ?? ''],
        price: [value.price ?? null, Validators.min(0)],
        currency: [
          value.currency ?? 'IDR',
          [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)],
        ],
        is_primary: [value.is_primary ?? isFirst],
        is_active: [value.is_active ?? true],
      }),
    );
  }
  remove(array: FormArray, index: number) {
    array.removeAt(index);
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  submit() {
    this.form.markAllAsTouched();
    this.categoryError = this.categoryIds.length === 0;
    const publicCurrencies = new Set(
      this.prices
        .getRawValue()
        .filter(
          (price: any) =>
            price.type === 'end_user' && price.is_active && price.is_public,
        )
        .map((price: any) => String(price.currency).toUpperCase()),
    );
    this.pricePublicationError =
      this.form.controls.price_visibility.value === 'displayed' &&
      !['IDR', 'USD'].every((currency) => publicCurrencies.has(currency));
    if (this.form.invalid || this.categoryError || this.pricePublicationError) {
      this.activeTab = this.categoryError
        ? 'general'
        : this.pricePublicationError
          ? 'channels'
          : this.invalidTab();
      this.notification.showError(
        this.categoryError
          ? 'Pilih minimal satu kategori produk sebelum menyimpan.'
          : this.pricePublicationError
            ? 'Harga publik Rupiah dan Dollar wajib diisi serta diaktifkan.'
            : 'Form produk belum lengkap. Periksa field yang ditandai merah.',
      );
      this.formIssues.focusFirstInvalid();
      return;
    }
    const payload = this.payload();
    const action =
      this.type() === 'edit' && this.id
        ? new UpdateProductAction(payload, this.id)
        : new CreateProductAction(payload);
    this.store.dispatch(action).subscribe({
      complete: () => void this.router.navigateByUrl('/product'),
      error: (error) => this.handleSaveError(error),
    });
  }
  private payload(): IProductPayload {
    const v: any = this.form.getRawValue(),
      translation = (locale: 'id-ID' | 'en-US', p: ProductFormLocale) => ({
        locale,
        slug: v[`${p}_slug`]!,
        name: v[`${p}_name`]!,
        short_description: v[`${p}_short_description`] || '',
        description: v[`${p}_description`] || '',
        specifications: this.specificationPayload(p),
        meta_title: v[`${p}_meta_title`] || '',
        meta_description: v[`${p}_meta_description`] || '',
        canonical_url: v[`${p}_canonical_url`] || '',
        og_title: v[`${p}_og_title`] || '',
        og_description: v[`${p}_og_description`] || '',
        status: 1 as const,
      });
    const media: any[] = [];
    for (const role of ['thumbnail', 'og'] as ProductMediaRole[]) {
      const item = this.media[role] as IAttachment | null;
      if (item?.id_attachment)
        media.push({ id: item.id_attachment, role, sort_order: 0 });
    }
    for (const [index, item] of (
      (this.media.gallery as IAttachment[]) ?? []
    ).entries())
      if (item?.id_attachment)
        media.push({
          id: item.id_attachment,
          role: 'gallery' as const,
          sort_order: index,
        });
    return {
      key: v.key!,
      sku: v.sku!,
      product_type: v.product_type as any,
      product_kind: v.product_kind || null,
      status: v.status as any,
      unit: v.unit || null,
      barcode: v.barcode || null,
      manufacturer_code: v.manufacturer_code || null,
      country_origin: v.country_origin || null,
      origin_province: v.origin_province || null,
      origin_city: v.origin_city || null,
      hs_code: v.hs_code || null,
      weight_grams: v.weight_grams,
      length_mm: v.length_mm,
      width_mm: v.width_mm,
      height_mm: v.height_mm,
      min_order_qty: Number(v.min_order_qty) || 1,
      lead_time_days: v.lead_time_days,
      manage_stock: v.manage_stock ? 1 : 0,
      stock_quantity: v.stock_quantity,
      stock_status: v.stock_status!,
      price_visibility: v.price_visibility as any,
      internal_commerce_enabled: v.internal_commerce_enabled ? 1 : 0,
      is_featured: v.is_featured ? 1 : 0,
      sort_order: Number(v.sort_order) || 0,
      category_ids: this.categoryIds,
      media,
      prices: v.prices.map((x: any, i: number) => ({
        ...x,
        currency: String(x.currency || 'IDR').toUpperCase(),
        is_public: x.type === 'end_user' ? Boolean(x.is_public) : false,
        label: x.label || null,
        sort_order: i,
      })),
      marketplaces: v.marketplaces.map((x: any, i: number) => ({
        ...x,
        label: x.label || null,
        sku: x.sku || null,
        sort_order: i,
      })),
      translations: [translation('id-ID', 'id'), translation('en-US', 'en')],
    };
  }

  //==================================================
  //==== EDIT DATA
  //==================================================

  private patch(p: IProduct) {
    const raw: any = p;
    this.product = p;
    this.categoryIds = (p.categories ?? []).map((x) => String(x.id));
    const id = p.translations?.find((x) => x.locale === 'id-ID'),
      en = p.translations?.find((x) => x.locale === 'en-US');
    const value: any = {
      key: p.key,
      sku: p.sku,
      product_type: raw.product_type,
      product_kind: raw.product_kind ?? p.product_kind,
      status: p.status,
      unit: raw.product_unit ?? p.unit,
      barcode: raw.product_barcode ?? p.barcode,
      manufacturer_code: raw.product_manufacturer_code ?? p.manufacturer_code,
      country_origin: raw.product_country_origin ?? p.country_origin,
      origin_province: raw.product_origin_province ?? p.origin_province,
      origin_city: raw.product_origin_city ?? p.origin_city,
      hs_code: raw.product_hs_code ?? p.hs_code,
      weight_grams: raw.product_weight_grams ?? p.weight,
      length_mm: raw.product_length_mm ?? p.length_mm,
      width_mm: raw.product_width_mm ?? p.width_mm,
      height_mm: raw.product_height_mm ?? p.height_mm,
      min_order_qty: raw.product_min_order_qty ?? p.min_order_qty,
      lead_time_days: raw.product_lead_time_days ?? p.lead_time_days,
      manage_stock: Boolean(raw.product_manage_stock ?? p.manage_stock),
      stock_quantity: raw.product_stock_quantity ?? p.stock_quantity,
      stock_status: p.stock_status,
      price_visibility: p.price_visibility,
      internal_commerce_enabled: Boolean(
        raw.product_internal_commerce_enabled ?? p.internal_commerce_enabled,
      ),
      is_featured: p.is_featured,
      sort_order: p.sort_order,
    };
    for (const [prefix, t] of [
      ['id', id],
      ['en', en],
    ] as const)
      if (t) {
        Object.assign(value, {
          [`${prefix}_slug`]: t.slug,
          [`${prefix}_name`]: t.name,
          [`${prefix}_short_description`]: t.short_description,
          [`${prefix}_description`]: t.description,
          [`${prefix}_meta_title`]: t.meta_title,
          [`${prefix}_meta_description`]: t.meta_description,
          [`${prefix}_canonical_url`]: t.canonical_url,
          [`${prefix}_og_title`]: t.og_title,
          [`${prefix}_og_description`]: t.og_description,
        });
        this.specifications(prefix).clear();
        specificationRows(t.specifications).forEach((row) =>
          this.addSpecification(prefix, row),
        );
      }
    this.form.patchValue(value);
    this.prices.clear();
    (p.prices ?? []).forEach((x) => this.addPrice(x));
    if (!this.prices.length) this.addPrice();
    this.marketplaces.clear();
    let primaryAssigned = false;
    (p.marketplaces ?? []).forEach((x) => {
      const isPrimary = Boolean(x.is_primary) && !primaryAssigned;
      if (isPrimary) primaryAssigned = true;
      this.addMarketplace({ ...x, is_primary: isPrimary });
    });
    if (this.marketplaces.length && !primaryAssigned)
      this.marketplaces.at(0).get('is_primary')?.setValue(true);
    this.media.thumbnail = raw.product_thumbnail;
    this.media.gallery = raw.product_galleries ?? [];
    this.media.og = p.media?.find((x) => x.role === 'og') ?? null;
  }

  //==================================================
  //==== ERRORS
  //==================================================

  private invalidTab() {
    if (
      ['id_slug', 'id_name', 'en_slug', 'en_name'].some(
        (k) => this.form.get(k)?.invalid,
      )
    )
      return 'content';
    if (this.prices.invalid || this.marketplaces.invalid) return 'channels';
    return 'general';
  }

  private handleSaveError(error: any): void {
    const code = String(error?.error?.code || '');
    if (code === 'PRODUCT_CATEGORY_INVALID') {
      this.activeTab = 'general';
      this.categoryError = true;
      this.formIssues.focusFirstInvalid();
      return;
    }
    if (
      code === 'PRODUCT_MEDIA_INVALID' ||
      code === 'PRODUCT_MEDIA_TYPE_INVALID'
    ) {
      this.activeTab = 'media';
      this.formIssues.focusFirstInvalid();
      return;
    }
    if (code === 'PRODUCT_DUPLICATE' || code === 'PRODUCT_KEY_EXISTS') {
      this.activeTab = 'general';
      this.form.controls.key.setErrors({
        ...(this.form.controls.key.errors ?? {}),
        duplicate: true,
      });
      this.formIssues.focusFirstInvalid('key');
      return;
    }
    if (code === 'PRODUCT_SKU_EXISTS') {
      this.activeTab = 'general';
      this.form.controls.sku.setErrors({
        ...(this.form.controls.sku.errors ?? {}),
        duplicate: true,
      });
      this.formIssues.focusFirstInvalid('sku');
      return;
    }
    if (code === 'PRODUCT_SLUG_EXISTS') {
      const locale = String(error?.error?.data?.locale || 'id-ID');
      this.activeTab = 'content';
      this.activeLocale = locale === 'en-US' ? 'en' : 'id';
      const control =
        this.form.controls[this.activeLocale === 'en' ? 'en_slug' : 'id_slug'];
      control.setErrors({ ...(control.errors ?? {}), duplicate: true });
      this.formIssues.focusFirstInvalid(
        this.activeLocale === 'en' ? 'en_slug' : 'id_slug',
      );
    }
  }
}
