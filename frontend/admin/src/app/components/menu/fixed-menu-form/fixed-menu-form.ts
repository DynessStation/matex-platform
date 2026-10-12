import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { Button } from '../../../shared/components/ui/button/button';
import { FormFields } from '../../../shared/components/ui/form-fields/form-fields';
import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';
import {
  IWebNavigationDetail,
  IWebNavigationItem,
  IWebNavigationItemPayload,
} from '../../../shared/interface/web-navigation.interface';
import {
  CreateWebNavigationItemAction,
  UpdateWebNavigationItemAction,
} from '../../../shared/store/action/web-navigation.action';

interface FixedMenuDefinition {
  key: string;
  aliases?: string[];
  idLabel: string;
  enLabel: string;
  idPath: string;
  enPath: string;
  behaviorKey: string;
}

@Component({
  selector: 'app-fixed-menu-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormFields,
    Button,
    HasPermissionDirective,
  ],
  templateUrl: './fixed-menu-form.html',
})
export class FixedMenuForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly navigation = input<IWebNavigationDetail | null>(null);
  readonly item = input<IWebNavigationItem | null>(null);
  readonly completed = output<void>();
  readonly cancelled = output<void>();

  readonly definitions: FixedMenuDefinition[] = [
    {
      key: 'home',
      idLabel: 'Beranda',
      enLabel: 'Home',
      idPath: '/',
      enPath: '/en',
      behaviorKey: 'navigation_admin.behavior_home',
    },
    {
      key: 'about',
      idLabel: 'Tentang MATEX',
      enLabel: 'About MATEX',
      idPath: '/tentang-matex',
      enPath: '/en/about-matex',
      behaviorKey: 'navigation_admin.behavior_about',
    },
    {
      key: 'categories',
      idLabel: 'Kategori',
      enLabel: 'Category',
      idPath: '/katalog',
      enPath: '/en/catalog',
      behaviorKey: 'navigation_admin.behavior_categories',
    },
    {
      key: 'products',
      idLabel: 'Produk',
      enLabel: 'Product',
      idPath: '/katalog',
      enPath: '/en/catalog',
      behaviorKey: 'navigation_admin.behavior_products',
    },
    {
      key: 'articles',
      aliases: ['blog'],
      idLabel: 'Artikel',
      enLabel: 'Blog',
      idPath: '/artikel',
      enPath: '/en/articles',
      behaviorKey: 'navigation_admin.behavior_articles',
    },
    {
      key: 'contact',
      idLabel: 'Hubungi',
      enLabel: 'Contact',
      idPath: '/kontak',
      enPath: '/en/contact-us',
      behaviorKey: 'navigation_admin.behavior_contact',
    },
  ];

  readonly form: FormGroup = this.formBuilder.group({
    key: ['', Validators.required],
    id_label: ['', [Validators.required, Validators.maxLength(255)]],
    en_label: ['', [Validators.required, Validators.maxLength(255)]],
    status: [true],
  });

  submitting = false;

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(): void {
    this.populateForm();
  }

  get isEdit(): boolean {
    return this.item() !== null;
  }

  get availableDefinitions(): FixedMenuDefinition[] {
    const currentDefinition = this.definitionForKey(this.item()?.key ?? '');
    const usedKeys = new Set(
      (this.navigation()?.items ?? [])
        .filter(
          (candidate) =>
            candidate.id_web_navigation_item !==
            this.item()?.id_web_navigation_item,
        )
        .map((candidate) => this.definitionForKey(candidate.key)?.key)
        .filter((key): key is string => Boolean(key)),
    );

    return this.definitions.filter(
      (definition) =>
        definition.key === currentDefinition?.key ||
        !usedKeys.has(definition.key),
    );
  }

  get selectedDefinition(): FixedMenuDefinition | null {
    return this.definitionForKey(String(this.form.controls['key'].value ?? ''));
  }

  invalid(controlName: string): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  selectSection(): void {
    if (this.isEdit) return;

    const definition = this.selectedDefinition;
    if (!definition) return;

    this.form.patchValue({
      id_label: definition.idLabel,
      en_label: definition.enLabel,
    });
  }

  submit(): void {
    const navigation = this.navigation();
    const currentItem = this.item();
    const definition = this.selectedDefinition;

    if (!navigation || !definition || this.submitting) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: IWebNavigationItemPayload = {
      web_navigation_item_key: definition.key,
      web_navigation_item_sort_order:
        currentItem?.sort_order ?? this.nextSortOrder(),
      web_navigation_item_status: value.status === true ? 1 : 0,
      translations: [
        {
          locale: 'id-ID',
          label: String(value.id_label).trim(),
          path: definition.idPath,
          url: null,
          status: 1,
        },
        {
          locale: 'en-US',
          label: String(value.en_label).trim(),
          path: definition.enPath,
          url: null,
          status: 1,
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
    const definition = item
      ? this.definitionForKey(item.key)
      : (this.availableDefinitions[0] ?? null);

    if (!definition) {
      this.form.reset({ key: '', id_label: '', en_label: '', status: true });
      return;
    }

    const idTranslation = item?.translations.find(
      (translation) => translation.locale === 'id-ID',
    );
    const enTranslation = item?.translations.find(
      (translation) => translation.locale === 'en-US',
    );

    this.form.reset({
      key: definition.key,
      id_label: idTranslation?.label ?? definition.idLabel,
      en_label: enTranslation?.label ?? definition.enLabel,
      status: item ? item.status === 1 : true,
    });
  }

  private definitionForKey(key: string): FixedMenuDefinition | null {
    return (
      this.definitions.find((definition) =>
        [definition.key, ...(definition.aliases ?? [])].includes(key),
      ) ?? null
    );
  }

  private nextSortOrder(): number {
    const orders = (this.navigation()?.items ?? []).map(
      (candidate) => candidate.sort_order,
    );
    return orders.length ? Math.max(...orders) + 1 : 0;
  }
}
