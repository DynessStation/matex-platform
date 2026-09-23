import { CommonModule } from '@angular/common';

import { Component, DestroyRef, inject, input, output } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Store } from '@ngxs/store';

import { Observable } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';

import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';

import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';

import { ICmsPageModel } from '../../../shared/interface/cms-page.interface';

import {
  IWebNavigationDetail,
  IWebNavigationItem,
  WebNavigationItemLinkType,
  IWebNavigationItemPayload,
} from '../../../shared/interface/web-navigation.interface';

import { GetCmsPagesAction } from '../../../shared/store/action/cms-page.action';

import {
  CreateWebNavigationItemAction,
  UpdateWebNavigationItemAction,
} from '../../../shared/store/action/web-navigation.action';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

@Component({
  selector: 'app-form-menu',

  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFields,
    Button,
    HasPermissionDirective,
  ],

  templateUrl: './form-menu.html',

  styleUrl: './form-menu.scss',
})
export class FormMenu {
  private formBuilder = inject(FormBuilder);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  readonly navigation = input<IWebNavigationDetail | null>(null);

  readonly item = input<IWebNavigationItem | null>(null);

  readonly completed = output<void>();

  readonly cancelled = output<void>();

  readonly cmsPages$: Observable<ICmsPageModel | null> = this.store.select(
    CmsPageState.cmsPages,
  );

  readonly linkTypes: {
    value: WebNavigationItemLinkType;
    label: string;
  }[] = [
    {
      value: 'cms_page',
      label: 'CMS Page',
    },
    {
      value: 'internal',
      label: 'Internal Route',
    },
    {
      value: 'external',
      label: 'External Link',
    },
    {
      value: 'label',
      label: 'Parent / Label',
    },
  ];

  readonly badgeColors = [
    'bg-danger',
    'bg-success',
    'bg-warning',
    'bg-info',
    'bg-dark',
  ];

  form: FormGroup = this.formBuilder.group({
    key: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-z0-9][a-z0-9_-]*$/),
        Validators.maxLength(100),
      ],
    ],

    link_type: ['cms_page', Validators.required],

    parent_id: [null],

    cms_page_id: [null],

    icon: [''],

    badge_text: [''],

    badge_color: [''],

    target_blank: [false],

    status: [true],

    id_label: ['', [Validators.required, Validators.maxLength(255)]],

    en_label: ['', [Validators.required, Validators.maxLength(255)]],

    id_path: [''],

    en_path: [''],

    id_url: [''],

    en_url: [''],
  });

  submitting = false;

  constructor() {
    this.form.controls['link_type'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyTargetValidators();
      });
  }

  ngOnInit(): void {
    this.store.dispatch(
      new GetCmsPagesAction({
        limit: 100,
        locale: 'id-ID',
      }),
    );

    this.applyTargetValidators();

    this.resetForm();
  }

  ngOnChanges(): void {
    this.populateForm();
  }

  get isEdit(): boolean {
    return this.item() !== null;
  }

  get parentItems(): IWebNavigationItem[] {
    const currentItem = this.item();

    if (!currentItem) {
      return this.items;
    }

    const excludedIds = new Set<string>([currentItem.id_web_navigation_item]);

    let changed = true;

    while (changed) {
      changed = false;

      for (const candidate of this.items) {
        const parentId = candidate.id_parent_web_navigation_item;

        if (
          parentId &&
          excludedIds.has(parentId) &&
          !excludedIds.has(candidate.id_web_navigation_item)
        ) {
          excludedIds.add(candidate.id_web_navigation_item);

          changed = true;
        }
      }
    }

    return this.items.filter(
      (candidate) => !excludedIds.has(candidate.id_web_navigation_item),
    );
  }

  get items(): IWebNavigationItem[] {
    return this.navigation()?.items ?? [];
  }

  get linkType(): WebNavigationItemLinkType {
    return this.form.controls['link_type'].value;
  }

  itemTitle(item: IWebNavigationItem): string {
    const navigation = this.navigation();

    const defaultTranslation = item.translations.find(
      (translation) => translation.locale === navigation?.default_locale,
    );

    return defaultTranslation?.label ?? item.translations[0]?.label ?? item.key;
  }

  invalid(controlName: string): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    const navigation = this.navigation();

    const currentItem = this.item();

    if (!navigation || this.submitting) {
      return;
    }

    this.applyTargetValidators();

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();

    const parentId = value.parent_id || null;

    const idTranslation = currentItem?.translations.find(
      (translation) => translation.locale === 'id-ID',
    );

    const enTranslation = currentItem?.translations.find(
      (translation) => translation.locale === 'en-US',
    );

    const parentChanged =
      currentItem?.id_parent_web_navigation_item !== parentId;

    const payload: IWebNavigationItemPayload = {
      id_parent_web_navigation_item: parentId,

      id_cms_page:
        this.linkType === 'cms_page' ? value.cms_page_id || null : null,

      web_navigation_item_key: String(value.key).trim().toLowerCase(),

      web_navigation_item_link_type: this.linkType,

      web_navigation_item_target_blank:
        this.linkType === 'external' && value.target_blank === true,

      web_navigation_item_icon: String(value.icon ?? '').trim() || null,

      web_navigation_item_badge_text:
        String(value.badge_text ?? '').trim() || null,

      web_navigation_item_badge_color:
        String(value.badge_color ?? '').trim() || null,

      web_navigation_item_sort_order:
        currentItem && !parentChanged
          ? currentItem.sort_order
          : this.nextSortOrder(parentId),

      web_navigation_item_status: value.status === true ? 1 : 0,

      web_navigation_item_settings_json: currentItem?.settings ?? null,

      translations: [
        {
          locale: 'id-ID',

          label: String(value.id_label).trim(),

          path:
            this.linkType === 'internal' ? String(value.id_path).trim() : null,

          url:
            this.linkType === 'external' ? String(value.id_url).trim() : null,

          status: idTranslation?.status ?? 1,
        },
        {
          locale: 'en-US',

          label: String(value.en_label).trim(),

          path:
            this.linkType === 'internal' ? String(value.en_path).trim() : null,

          url:
            this.linkType === 'external' ? String(value.en_url).trim() : null,

          status: enTranslation?.status ?? 1,
        },
      ],
    };

    this.submitting = true;

    const request = currentItem
      ? new UpdateWebNavigationItemAction(
          navigation.id_web_navigation,
          currentItem.id_web_navigation_item,
          payload,
        )
      : new CreateWebNavigationItemAction(
          navigation.id_web_navigation,
          payload,
        );

    this.store.dispatch(request).subscribe({
      complete: () => {
        this.submitting = false;

        if (!currentItem) {
          this.resetForm();
        }

        this.completed.emit();
      },

      error: () => {
        this.submitting = false;
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private populateForm(): void {
    const item = this.item();

    if (!item) {
      this.resetForm();

      return;
    }

    const idTranslation = item.translations.find(
      (translation) => translation.locale === 'id-ID',
    );

    const enTranslation = item.translations.find(
      (translation) => translation.locale === 'en-US',
    );

    this.form.reset({
      key: item.key,

      link_type: item.link_type,

      parent_id: item.id_parent_web_navigation_item,

      cms_page_id: item.id_cms_page,

      icon: item.icon ?? '',

      badge_text: item.badge_text ?? '',

      badge_color: item.badge_color ?? '',

      target_blank: item.target_blank,

      status: item.status === 1,

      id_label: idTranslation?.label ?? '',

      en_label: enTranslation?.label ?? '',

      id_path: idTranslation?.path ?? '',

      en_path: enTranslation?.path ?? '',

      id_url: idTranslation?.url ?? '',

      en_url: enTranslation?.url ?? '',
    });

    this.applyTargetValidators();
  }

  private nextSortOrder(parentId: string | null): number {
    const siblingOrders = this.items
      .filter(
        (candidate) => candidate.id_parent_web_navigation_item === parentId,
      )
      .map((candidate) => candidate.sort_order);

    return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
  }

  private applyTargetValidators(): void {
    const cmsPage = this.form.controls['cms_page_id'];

    const idPath = this.form.controls['id_path'];

    const enPath = this.form.controls['en_path'];

    const idUrl = this.form.controls['id_url'];

    const enUrl = this.form.controls['en_url'];

    cmsPage.clearValidators();

    idPath.clearValidators();

    enPath.clearValidators();

    idUrl.clearValidators();

    enUrl.clearValidators();

    if (this.linkType === 'cms_page') {
      cmsPage.setValidators([Validators.required]);
    }

    if (this.linkType === 'internal') {
      const internalPathValidators = [
        Validators.required,
        Validators.pattern(/^\/(?!\/).*/),
        Validators.maxLength(500),
      ];

      idPath.setValidators(internalPathValidators);

      enPath.setValidators(internalPathValidators);
    }

    if (this.linkType === 'external') {
      const externalUrlValidators = [
        Validators.required,
        Validators.pattern(/^https?:\/\/.+/i),
        Validators.maxLength(1000),
      ];

      idUrl.setValidators(externalUrlValidators);

      enUrl.setValidators(externalUrlValidators);
    }

    for (const control of [cmsPage, idPath, enPath, idUrl, enUrl]) {
      control.updateValueAndValidity({
        emitEvent: false,
      });
    }
  }

  private resetForm(): void {
    this.form.reset({
      key: '',

      link_type: 'cms_page',

      parent_id: null,

      cms_page_id: null,

      icon: '',

      badge_text: '',

      badge_color: '',

      target_blank: false,

      status: true,

      id_label: '',

      en_label: '',

      id_path: '',

      en_path: '',

      id_url: '',

      en_url: '',
    });

    this.applyTargetValidators();
  }
}
