import { CommonModule } from '@angular/common';

import { Component, DestroyRef, inject, input } from '@angular/core';

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

import { CreateWebNavigationItemAction } from '../../../shared/store/action/web-navigation.action';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

import { WebNavigationState } from '../../../shared/store/state/web-navigation.state';

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
    this.resetSortOrder();
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

    if (!navigation || this.submitting) {
      return;
    }

    this.applyTargetValidators();

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();

    const payload: IWebNavigationItemPayload = {
      id_parent_web_navigation_item: value.parent_id || null,

      id_cms_page:
        this.linkType === 'cms_page' ? value.cms_page_id || null : null,

      web_navigation_item_key: String(value.key).trim().toLowerCase(),

      web_navigation_item_link_type: this.linkType,

      web_navigation_item_target_blank:
        this.linkType === 'external' ? value.target_blank === true : false,

      web_navigation_item_icon: String(value.icon ?? '').trim() || null,

      web_navigation_item_badge_text:
        String(value.badge_text ?? '').trim() || null,

      web_navigation_item_badge_color:
        String(value.badge_color ?? '').trim() || null,

      web_navigation_item_sort_order: navigation.items.length,

      web_navigation_item_status: value.status === true ? 1 : 0,

      web_navigation_item_settings_json: null,

      translations: [
        {
          locale: 'id-ID',

          label: String(value.id_label).trim(),

          path:
            this.linkType === 'internal' ? String(value.id_path).trim() : null,

          url:
            this.linkType === 'external' ? String(value.id_url).trim() : null,

          status: 1,
        },
        {
          locale: 'en-US',

          label: String(value.en_label).trim(),

          path:
            this.linkType === 'internal' ? String(value.en_path).trim() : null,

          url:
            this.linkType === 'external' ? String(value.en_url).trim() : null,

          status: 1,
        },
      ],
    };

    this.submitting = true;

    this.store
      .dispatch(
        new CreateWebNavigationItemAction(
          navigation.id_web_navigation,
          payload,
        ),
      )
      .subscribe({
        complete: () => {
          this.submitting = false;

          this.resetForm();
        },

        error: () => {
          this.submitting = false;
        },
      });
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

    this.resetSortOrder();
  }

  private resetSortOrder(): void {
    const latest = this.store.selectSnapshot(
      WebNavigationState.selectedNavigation,
    );

    if (
      latest &&
      latest.id_web_navigation === this.navigation()?.id_web_navigation
    ) {
      return;
    }
  }
}
