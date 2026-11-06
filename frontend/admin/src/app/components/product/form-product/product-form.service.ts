import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Editor } from 'ngx-editor';
import { filter, Observable, switchMap, take } from 'rxjs';

import {
  marketplacePayload,
  marketplaceRow,
  pricePayload,
  priceRow,
} from './form-product.columns';
import {
  MARKETPLACE_PROVIDER_OPTIONS,
  PRICE_VISIBILITY_OPTIONS,
  PRODUCT_GALLERY_ACCEPT,
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  ProductFormLocale,
  ProductMeasurementControl,
  STOCK_STATUS_OPTIONS,
  ProductSpecificationRow,
} from './form-product.model';
import {
  formatMeasurement,
  specificationPayload,
  specificationRows,
  uniqueGallery,
} from './form-product.util';
import {
  TabState,
  tabState,
} from '../../../shared/components/ui/form-kit/form-kit.util';
import { InlineRow } from '../../../shared/components/ui/inline-table/inline-table.model';
import {
  MediaSelection,
  selectedAttachment,
  selectedAttachments,
} from '../../../shared/components/ui/media-box/media-box';
import { positionText } from '../../../shared/components/ui/order-list/order-list.util';
import { IApiErrorResponse } from '../../../shared/interface/api-response.interface';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import { ICategoryModel } from '../../../shared/interface/category.interface';
import {
  IProduct,
  IProductPayload,
  IProductRawColumns,
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

// Same rules as the server (backend ctrl/admin/product/input.ts).
const CODE = /^[A-Za-z0-9._/-]+$/;
const HS_CODE = /^[0-9][0-9.,]*$/;
const PLACE = /^\p{L}[\p{L}\s.'()-]*$/u;
const tidy = (value: string | null | undefined) =>
  value?.replace(/\s+/g, ' ').trim() || null;

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
  readonly saving = signal(false);
  readonly tried = signal(false);
  readonly idSpecRows = signal<InlineRow[]>([]);
  readonly enSpecRows = signal<InlineRow[]>([]);
  readonly idrRows = signal<InlineRow[]>([]);
  readonly usdRows = signal<InlineRow[]>([]);
  readonly marketplaceRows = signal<InlineRow[]>([]);
  /** Tables with a row still open: saving asks to close them first. */
  private readonly openRows = new Set<string>();
  media: Partial<Record<ProductMediaRole, IAttachment | IAttachment[] | null>> =
    { thumbnail: null, gallery: [], og: null };
  readonly form = this.fb.group({
    sku: ['', Validators.required],
    product_type: ['physical', Validators.required],
    product_kind: [''],
    status: ['draft', Validators.required],
    unit: ['pcs'],
    barcode: ['', [Validators.maxLength(120), Validators.pattern(CODE)]],
    manufacturer_code: [
      '',
      [Validators.maxLength(120), Validators.pattern(CODE)],
    ],
    country_origin: [
      'Indonesia',
      [Validators.maxLength(100), Validators.pattern(PLACE)],
    ],
    origin_province: [
      '',
      [Validators.maxLength(100), Validators.pattern(PLACE)],
    ],
    origin_city: ['', [Validators.maxLength(100), Validators.pattern(PLACE)]],
    hs_code: ['', [Validators.maxLength(50), Validators.pattern(HS_CODE)]],
    is_featured: [false],
    catalog_front: [false],
    weight_grams: [
      null as number | null,
      [Validators.min(0), Validators.max(10_000_000)],
    ],
    length_mm: [
      null as number | null,
      [Validators.min(0), Validators.max(100_000)],
    ],
    width_mm: [
      null as number | null,
      [Validators.min(0), Validators.max(100_000)],
    ],
    height_mm: [
      null as number | null,
      [Validators.min(0), Validators.max(100_000)],
    ],
    min_order_qty: [
      1,
      [Validators.required, Validators.min(1), Validators.max(1_000_000)],
    ],
    lead_time_days: [
      null as number | null,
      [Validators.min(0), Validators.max(3650)],
    ],
    manage_stock: [false],
    stock_quantity: [
      null as number | null,
      [Validators.min(0), Validators.max(999_999_999)],
    ],
    stock_status: ['in_stock'],
    price_visibility: ['contact'],
    internal_commerce_enabled: [false],
    id_slug: ['', Validators.required],
    id_name: ['', Validators.required],
    id_short_description: [''],
    id_description: [''],
    id_meta_title: [''],
    id_meta_description: [''],
    id_canonical_url: [''],
    id_og_title: [''],
    id_og_description: [''],
    en_slug: ['', Validators.required],
    en_name: ['', Validators.required],
    en_short_description: [''],
    en_description: [''],
    en_meta_title: [''],
    en_meta_description: [''],
    en_canonical_url: [''],
    en_og_title: [''],
    en_og_description: [''],
  });

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
  selectCategories(ids: Array<string | number> | null) {
    this.categoryIds = (ids ?? []).map(String);
    this.categoryError = this.categoryIds.length === 0;
  }
  selectMedia(role: ProductMediaRole, value: MediaSelection) {
    if (role !== 'gallery') {
      this.media[role] = selectedAttachment(value);
      return;
    }
    this.media.gallery = uniqueGallery(selectedAttachments(value));
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
  //==== ROWS AND TAB STATE
  //==================================================

  setRowOpen(table: string, open: boolean) {
    if (open) this.openRows.add(table);
    else this.openRows.delete(table);
  }
  specRows(locale: ProductFormLocale) {
    return locale === 'id' ? this.idSpecRows : this.enSpecRows;
  }
  /** The filled specifications of one language as the stored object. */
  specificationPayload(locale: ProductFormLocale) {
    return specificationPayload(
      this.specRows(locale)() as unknown as ProductSpecificationRow[],
    );
  }
  /** Website prices need both currencies. */
  private get missingPublicPrice(): boolean {
    const shown = (rows: InlineRow[]) =>
      rows.some(
        (row) =>
          row['type'] === 'end_user' &&
          row['status'] === 'active' &&
          row['shown'] === 'shown',
      );
    return (
      this.form.controls.price_visibility.value === 'displayed' &&
      !(shown(this.idrRows()) && shown(this.usdRows()))
    );
  }
  tabStates(): Record<
    'general' | 'content' | 'channels' | 'media' | 'seo',
    TabState
  > {
    const c = this.form.controls;
    const noCategory = this.categoryIds.length === 0;
    const general = tabState({ required: [c.sku, c.status] });
    return {
      general:
        general === 'error' || (noCategory && this.tried())
          ? 'error'
          : noCategory
            ? 'warn'
            : general,
      content: tabState({
        required: [c.id_name, c.id_slug, c.en_name, c.en_slug],
        recommended: [c.id_short_description, c.en_short_description],
      }),
      channels: this.missingPublicPrice
        ? this.tried()
          ? 'error'
          : 'warn'
        : this.marketplaceRows().length
          ? 'ok'
          : 'warn',
      media: this.media.thumbnail ? 'ok' : 'warn',
      seo: tabState({
        recommended: [c.id_meta_description, c.en_meta_description],
      }),
    };
  }
  /** After a save was tried: something still stops it. */
  get showIssue(): boolean {
    return (
      this.tried() &&
      (this.form.invalid ||
        this.categoryIds.length === 0 ||
        this.missingPublicPrice ||
        this.openRows.size > 0)
    );
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  submit() {
    this.tried.set(true);
    this.form.markAllAsTouched();
    this.categoryError = this.categoryIds.length === 0;
    this.pricePublicationError = this.missingPublicPrice;
    if (this.openRows.size) {
      const table = [...this.openRows][0];
      this.activeTab = table.startsWith('spec') ? 'content' : 'channels';
      this.notification.showError(
        'Masih ada baris yang terbuka. Simpan atau batalkan baris itu dulu.',
      );
      return;
    }
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
    this.saving.set(true);
    this.store.dispatch(action).subscribe({
      complete: () => void this.router.navigateByUrl('/product'),
      error: (error) => {
        this.saving.set(false);
        this.handleSaveError(error);
      },
    });
  }
  private payload(): IProductPayload {
    const v = this.form.getRawValue(),
      translation = (locale: 'id-ID' | 'en-US', p: ProductFormLocale) => ({
        locale,
        slug: v[`${p}_slug` as const]!,
        name: v[`${p}_name` as const]!,
        short_description: v[`${p}_short_description` as const] || '',
        description: v[`${p}_description` as const] || '',
        specifications: this.specificationPayload(p),
        meta_title: v[`${p}_meta_title` as const] || '',
        meta_description: v[`${p}_meta_description` as const] || '',
        canonical_url: v[`${p}_canonical_url` as const] || '',
        og_title: v[`${p}_og_title` as const] || '',
        og_description: v[`${p}_og_description` as const] || '',
        status: 1 as const,
      });
    const media: IProductPayload['media'] = [];
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
      sku: v.sku!,
      product_type: v.product_type as IProductPayload['product_type'],
      product_kind: v.product_kind || null,
      status: v.status as IProductPayload['status'],
      unit: v.unit || null,
      barcode: tidy(v.barcode),
      manufacturer_code: tidy(v.manufacturer_code),
      country_origin: tidy(v.country_origin),
      origin_province: tidy(v.origin_province),
      origin_city: tidy(v.origin_city),
      hs_code: tidy(v.hs_code),
      weight_grams: v.weight_grams,
      length_mm: v.length_mm,
      width_mm: v.width_mm,
      height_mm: v.height_mm,
      min_order_qty: Number(v.min_order_qty) || 1,
      lead_time_days: v.lead_time_days,
      manage_stock: v.manage_stock ? 1 : 0,
      stock_quantity: v.stock_quantity,
      stock_status: v.stock_status!,
      price_visibility:
        v.price_visibility as IProductPayload['price_visibility'],
      internal_commerce_enabled: v.internal_commerce_enabled ? 1 : 0,
      is_featured: v.is_featured ? 1 : 0,
      catalog_front: v.catalog_front ? 1 : 0,
      category_ids: this.categoryIds,
      media,
      prices: [
        ...this.idrRows().map((row) => pricePayload(row, 'IDR')),
        ...this.usdRows().map((row) => pricePayload(row, 'USD')),
      ].map((price, index) => ({ ...price, sort_order: index })),
      marketplaces: this.marketplaceRows().map((row, index) => ({
        ...marketplacePayload(row),
        sort_order: index,
      })),
      translations: [translation('id-ID', 'id'), translation('en-US', 'en')],
    };
  }

  //==================================================
  //==== EDIT DATA
  //==================================================

  private patch(p: IProduct) {
    const raw: IProduct & IProductRawColumns = p;
    this.product = p;
    this.categoryIds = (p.categories ?? []).map((x) => String(x.id));
    const id = p.translations?.find((x) => x.locale === 'id-ID'),
      en = p.translations?.find((x) => x.locale === 'en-US');
    const value: Record<string, unknown> = {
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
      catalog_front: Boolean(p.catalog_front),
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
        this.specRows(prefix).set(
          specificationRows(t.specifications).map((row) => ({ ...row })),
        );
      }
    this.form.patchValue(value as Parameters<typeof this.form.patchValue>[0]);
    const prices = p.prices ?? [];
    this.idrRows.set(
      prices.filter((x) => x.currency !== 'USD').map((x) => priceRow(x)),
    );
    this.usdRows.set(
      prices.filter((x) => x.currency === 'USD').map((x) => priceRow(x)),
    );
    // One recommended channel, the first one if none (or several) are marked.
    const links = p.marketplaces ?? [];
    const main = Math.max(
      links.findIndex((x) => x.is_primary),
      0,
    );
    this.marketplaceRows.set(
      links.map((x, index) =>
        marketplaceRow({ ...x, is_primary: index === main }),
      ),
    );
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
    return 'general';
  }

  /** Line under "Tampilkan di depan katalog": the read-only place, or what saving does. */
  get frontInfo(): string {
    const product = this.product;
    if (!this.form.controls.catalog_front.value)
      return 'Tidak ditandai: tampil setelah produk di depan, dari yang terbaru.';
    return product?.catalog_front
      ? `${positionText(product.sort_order, product.front_total)} di depan katalog. Ubah lewat "Produk di depan".`
      : 'Masuk paling akhir di depan katalog setelah disimpan (maksimal 12 produk).';
  }

  private handleSaveError(error: IApiErrorResponse): void {
    const code = String(error?.error?.code || '');
    if (code === 'PRODUCT_FRONT_FULL') {
      this.activeTab = 'general';
      return;
    }
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
      const locale = String(error?.error?.data?.['locale'] || 'id-ID');
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
