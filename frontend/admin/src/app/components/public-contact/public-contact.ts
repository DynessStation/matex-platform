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
import { AiFieldAction } from '../../shared/components/ui/ai-field-action/ai-field-action';
import { Button } from '../../shared/components/ui/button/button';
import { HelpTip } from '../../shared/components/ui/help/help-tip/help-tip';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { IApiErrorResponse } from '../../shared/interface/api-response.interface';
import {
  IContactInquiryTopic,
  IPublicContactChannel,
  IPublicContactSettings,
  PublicContactType,
} from '../../shared/interface/public-contact.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { ContentAssistantService } from '../../shared/services/content-assistant.service';
import { FormIssueNavigatorService } from '../../shared/services/form-issue-navigator.service';
import { NotificationService } from '../../shared/services/notification.service';
import { PublicContactService } from '../../shared/services/public-contact.service';

/** One language pair of a card, as the form keeps it. */
interface ContactTranslationRow {
  id_label: string;
  id_description: string;
  en_label: string;
  en_description: string;
}

interface ContactChannelRow {
  key: string;
  type: PublicContactType;
  value: string;
  url: string;
  is_primary: boolean;
  is_public: boolean;
  translations: ContactTranslationRow;
}

interface ContactTopicRow {
  key: string;
  recipient_email: string;
  status: boolean;
  translations: ContactTranslationRow;
}

@Component({
  selector: 'app-public-contact',
  imports: [
    HelpTip,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    Select2Module,
    PageWrapper,
    Button,
    AiFieldAction,
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
  private formIssues = inject(FormIssueNavigatorService);
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
        field_types: { description: 'multiline_text' },
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
        field_types: { description: 'multiline_text' },
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

  private showAssistantError(error: IApiErrorResponse): void {
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

  addChannel(value?: Partial<IPublicContactChannel>): void {
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
        translations: this.translations(value?.translations),
      }),
    );
  }

  addTopic(value?: Partial<IContactInquiryTopic>): void {
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
        status: [value?.status !== 0],
        translations: this.translations(value?.translations),
      }),
    );
  }

  /** Moves a card up or down; the list order is the order on the website (saved as 1..n). */
  move(array: FormArray, index: number, step: -1 | 1): void {
    const control = array.at(index);
    array.removeAt(index, { emitEvent: false });
    array.insert(index + step, control);
    array.markAsDirty();
  }

  private load(settings: IPublicContactSettings): void {
    this.channels.clear();
    this.topics.clear();
    settings.channels.forEach((item) => this.addChannel(item));
    settings.topics.forEach((item) => this.addTopic(item));
  }

  submit(): void {
    if (!this.topics.length) {
      this.notifications.showError(
        'Tambahkan minimal satu topik agar formulir kontak publik dapat digunakan.',
      );
      return;
    }
    this.applyDuplicateKeyErrors(this.channels);
    this.applyDuplicateKeyErrors(this.topics);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notifications.showError(
        'Pengaturan kontak belum lengkap atau memiliki kunci yang sama. Periksa field yang ditandai merah.',
      );
      this.formIssues.focusFirstInvalid();
      return;
    }
    const raw = this.form.getRawValue();
    const mapTranslations = (value: ContactTranslationRow) => [
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
      channels: (raw.channels as ContactChannelRow[]).map((item) => ({
        key: item.key,
        type: item.type,
        value: item.value,
        url: this.isDerivedChannel(item.type) ? null : item.url || null,
        is_primary: item.is_primary ? 1 : 0,
        is_public: item.is_public ? 1 : 0,
        translations: mapTranslations(item.translations),
      })),
      topics: (raw.topics as ContactTopicRow[]).map((item) => ({
        key: item.key,
        recipient_email: item.recipient_email || null,
        status: item.status ? 1 : 0,
        translations: mapTranslations(item.translations),
      })),
    };
    this.service.updateSettings(payload).subscribe({
      next: (response) => {
        this.notifications.showSuccess(this.messages.resolveResponse(response));
        if (response.data) this.load(response.data);
      },
      error: () => this.formIssues.focusFirstInvalid(),
    });
  }

  private applyDuplicateKeyErrors(array: FormArray): void {
    const counts = new Map<string, number>();
    for (const group of array.controls) {
      const key = String(group.get('key')?.value || '')
        .trim()
        .toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const group of array.controls) {
      const control = group.get('key');
      const key = String(control?.value || '')
        .trim()
        .toLowerCase();
      const errors = { ...(control?.errors ?? {}) };
      delete errors['duplicate'];
      if (key && (counts.get(key) ?? 0) > 1) errors['duplicate'] = true;
      control?.setErrors(Object.keys(errors).length ? errors : null);
    }
  }
}
