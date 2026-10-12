import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Select2Data, Select2Module } from 'ng-select2-component';
import { finalize } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { AiFieldAction } from '../../shared/components/ui/ai-field-action/ai-field-action';
import { LocalizedNumberInputDirective } from '../../shared/directives/localized-number-input.directive';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IPublicContactSettings } from '../../shared/interface/public-contact.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { ContentAssistantService } from '../../shared/services/content-assistant.service';
import { NotificationService } from '../../shared/services/notification.service';
import { PublicContactService } from '../../shared/services/public-contact.service';

@Component({
  selector: 'app-public-contact',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    Select2Module,
    PageWrapper,
    Button,
    AiFieldAction,
    LocalizedNumberInputDirective,
    HasPermissionDirective,
  ],
  templateUrl: './public-contact.html',
  styleUrl: './public-contact.scss',
})
export class PublicContact {
  private fb = inject(FormBuilder);
  private service = inject(PublicContactService);
  private notifications = inject(NotificationService);
  private messages = inject(ApiMessageService);
  private contentAssistant = inject(ContentAssistantService);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly channelTypeOptions: Select2Data = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telepon' },
    { value: 'social', label: 'Media sosial' },
    { value: 'website', label: 'Website' },
    { value: 'other', label: 'Lainnya' },
  ];
  loading = true;
  assistingKey: string | null = null;

  readonly form = this.fb.group({
    channels: this.fb.array([]),
    topics: this.fb.array([]),
  });
  get channels() {
    return this.form.controls.channels as FormArray;
  }
  get topics() {
    return this.form.controls.topics as FormArray;
  }
  isDerivedChannel(type: unknown): boolean {
    return ['whatsapp', 'email', 'phone'].includes(String(type));
  }

  copyTranslationToEnglish(kind: 'channel' | 'topic', index: number): void {
    const group = (kind === 'channel' ? this.channels : this.topics).at(
      index,
    ) as FormGroup;
    const translations = group.controls['translations'] as FormGroup;
    const key = `${kind}-${index}-translate`;
    if (this.assistingKey) return;
    this.assistingKey = key;
    this.contentAssistant
      .assist({
        mode: 'translate',
        content_type: `public-contact-${kind}`,
        source_locale: 'id-ID',
        target_locale: 'en-US',
        fields: {
          description: String(
            translations.controls['id_description'].value || '',
          ),
        },
      })
      .pipe(finalize(() => (this.assistingKey = null)))
      .subscribe({
        next: (fields) => {
          translations.patchValue({
            en_description: fields['description'] || '',
          });
          this.notifications.showSuccess(
            'Keterangan English sudah diisi. Label tetap Anda tentukan sendiri.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  generateChannelDescription(index: number, locale: 'id' | 'en'): void {
    const group = this.channels.at(index) as FormGroup;
    const translations = group.controls['translations'] as FormGroup;
    const key = `channel-${index}-${locale}`;
    if (this.assistingKey) return;
    this.assistingKey = key;
    this.contentAssistant
      .assist({
        mode: 'generate',
        content_type: 'public-contact-channel',
        target_locale: locale === 'id' ? 'id-ID' : 'en-US',
        context: JSON.stringify({
          type: group.controls['type'].value,
          label: translations.controls[`${locale}_label`].value,
        }),
        fields: {
          description: String(
            translations.controls[`${locale}_description`].value || '',
          ),
        },
      })
      .pipe(finalize(() => (this.assistingKey = null)))
      .subscribe({
        next: (fields) => {
          translations.controls[`${locale}_description`].setValue(
            fields['description'] || '',
          );
          this.notifications.showSuccess(
            'Draf keterangan dibuat. Periksa kembali sebelum menyimpan.',
          );
        },
        error: (error) => this.showAssistantError(error),
      });
  }

  private showAssistantError(error: any): void {
    this.notifications.showError(
      error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
        ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
        : 'Bantuan penulisan belum berhasil. Coba lagi sebentar.',
    );
  }

  ngOnInit(): void {
    this.service.getSettings().subscribe({
      next: (response) => {
        this.load(response.data ?? { channels: [], topics: [] });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private translations(
    values?: Array<{
      locale: string;
      label: string;
      description?: string | null;
    }>,
  ) {
    const find = (locale: string) =>
      values?.find((item) => item.locale === locale);
    return this.fb.group({
      id_label: [find('id-ID')?.label ?? '', Validators.required],
      id_description: [find('id-ID')?.description ?? ''],
      en_label: [find('en-US')?.label ?? '', Validators.required],
      en_description: [find('en-US')?.description ?? ''],
    });
  }

  addChannel(value?: any): void {
    this.channels.push(
      this.fb.group({
        key: [
          value?.key ?? '',
          [
            Validators.required,
            Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          ],
        ],
        type: [value?.type ?? 'whatsapp', Validators.required],
        value: [value?.value ?? '', Validators.required],
        url: [value?.url ?? ''],
        is_primary: [value?.is_primary === 1],
        is_public: [value?.is_public !== 0],
        sort_order: [value?.sort_order ?? this.channels.length],
        translations: this.translations(value?.translations),
      }),
    );
  }

  addTopic(value?: any): void {
    this.topics.push(
      this.fb.group({
        key: [
          value?.key ?? '',
          [
            Validators.required,
            Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          ],
        ],
        recipient_email: [
          value?.recipient_email ?? '',
          [Validators.required, Validators.email],
        ],
        sort_order: [value?.sort_order ?? this.topics.length],
        status: [value?.status !== 0],
        translations: this.translations(value?.translations),
      }),
    );
  }

  private load(settings: IPublicContactSettings): void {
    this.channels.clear();
    this.topics.clear();
    settings.channels.forEach((item) => this.addChannel(item));
    settings.topics.forEach((item) => this.addTopic(item));
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const mapTranslations = (value: any) => [
      {
        locale: 'id-ID' as const,
        label: value.id_label,
        description: value.id_description || null,
        status: 1 as const,
      },
      {
        locale: 'en-US' as const,
        label: value.en_label,
        description: value.en_description || null,
        status: 1 as const,
      },
    ];
    const payload: IPublicContactSettings = {
      channels: raw.channels.map((item: any) => ({
        key: item.key,
        type: item.type,
        value: item.value,
        url: this.isDerivedChannel(item.type) ? null : item.url || null,
        is_primary: item.is_primary ? 1 : 0,
        is_public: item.is_public ? 1 : 0,
        sort_order: Number(item.sort_order),
        translations: mapTranslations(item.translations),
      })),
      topics: raw.topics.map((item: any) => ({
        key: item.key,
        recipient_email: item.recipient_email || null,
        sort_order: Number(item.sort_order),
        status: item.status ? 1 : 0,
        translations: mapTranslations(item.translations),
      })),
    };
    this.service.updateSettings(payload).subscribe((response) => {
      this.notifications.showSuccess(this.messages.resolveResponse(response));
      if (response.data) this.load(response.data);
    });
  }
}
