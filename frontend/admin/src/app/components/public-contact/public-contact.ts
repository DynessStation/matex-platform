import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { finalize } from 'rxjs';

import { ContactInsight } from './contact-insight/contact-insight';
import {
  channelLink,
  channelPayload,
  channelRow,
  channelValueError,
  isEmail,
  isHttpUrl,
  oneMainPerType,
  socialPayload,
  socialRow,
  topicPayload,
  topicRow,
  withRow,
} from './public-contact.util';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { AiFieldAction } from '../../shared/components/ui/ai-field-action/ai-field-action';
import { HelpTip } from '../../shared/components/ui/help/help-tip/help-tip';
import { InlineTable } from '../../shared/components/ui/inline-table/inline-table';
import {
  InlineChange,
  InlineColumn,
  InlineOption,
  InlineRow,
} from '../../shared/components/ui/inline-table/inline-table.model';
import { InsightToggle } from '../../shared/components/ui/insight/insight-toggle';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { LocalizedNumberInputDirective } from '../../shared/directives/localized-number-input.directive';
import { IApiErrorResponse } from '../../shared/interface/api-response.interface';
import {
  IPublicContactResponse,
  IPublicContactSettings,
} from '../../shared/interface/public-contact.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { ContentAssistantService } from '../../shared/services/content-assistant.service';
import { NotificationService } from '../../shared/services/notification.service';
import { PublicContactService } from '../../shared/services/public-contact.service';
import { AuthState } from '../../shared/store/state/auth.state';
import { hasPermissionAccess } from '../../shared/utils/permission.util';

const required = (value: unknown) =>
  String(value ?? '').trim() ? null : 'form_kit.required';

const SHOWN_OPTIONS: InlineOption[] = [
  { value: 'shown', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
];

// Pengaturan Kontak: three compact tables, each row saved on its own check. A save sends the one
// list that changed (the server keeps the others) and shows what the server made of it.
@Component({
  selector: 'app-public-contact',
  imports: [
    FormsModule,
    LocalizedNumberInputDirective,
    RouterModule,
    TranslateModule,
    PageWrapper,
    HelpTip,
    AiFieldAction,
    InlineTable,
    InsightToggle,
    HasPermissionDirective,
    ContactInsight,
  ],
  templateUrl: './public-contact.html',
  styleUrl: './public-contact.scss',
})
export class PublicContact {
  private readonly service = inject(PublicContactService);
  private readonly notifications = inject(NotificationService);
  private readonly messages = inject(ApiMessageService);
  private readonly contentAssistant = inject(ContentAssistantService);
  private readonly translate = inject(TranslateService);
  private readonly store = inject(Store);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly loading = signal(true);
  readonly insightOpen = signal(true);
  readonly insightVersion = signal(0);
  readonly socials = signal<InlineRow[]>([]);
  readonly channels = signal<InlineRow[]>([]);
  readonly topics = signal<InlineRow[]>([]);
  readonly assisting = signal('');

  /** Without the right to change, the tables only show. */
  readonly canEdit = computed(() =>
    hasPermissionAccess(
      'public_contact.update',
      this.store.selectSnapshot(AuthState.permissions) ?? [],
      this.store.selectSnapshot(AuthState.isAllAccess) === true,
    ),
  );

  readonly socialColumns: InlineColumn[] = [
    {
      key: 'platform',
      label: 'public_contact.platform',
      type: 'select',
      width: '150px',
      options: [
        { value: 'facebook', label: 'Facebook', icon: 'ri-facebook-fill' },
        { value: 'instagram', label: 'Instagram', icon: 'ri-instagram-line' },
        { value: 'tiktok', label: 'TikTok', icon: 'ri-tiktok-line' },
        { value: 'youtube', label: 'YouTube', icon: 'ri-youtube-line' },
        { value: 'linkedin', label: 'LinkedIn', icon: 'ri-linkedin-fill' },
      ],
    },
    {
      key: 'name',
      label: 'public_contact.account_name',
      placeholder: '@matex',
      validate: required,
    },
    {
      key: 'url',
      label: 'public_contact.link_url',
      link: true,
      placeholder: 'https://',
      validate: (value) => (isHttpUrl(value) ? null : 'form_kit.invalid_url'),
    },
    {
      key: 'status',
      label: 'public_contact.status',
      type: 'select',
      width: '120px',
      options: [
        { value: 'active', label: 'Aktif', tone: 'success' },
        { value: 'inactive', label: 'Inaktif', tone: 'danger' },
      ],
    },
    {
      key: 'shown',
      label: 'public_contact.publication',
      type: 'select',
      width: '120px',
      options: SHOWN_OPTIONS,
    },
  ];

  readonly channelColumns: InlineColumn[] = [
    {
      key: 'type',
      label: 'public_contact.type',
      type: 'select',
      width: '140px',
      options: [
        { value: 'whatsapp', label: 'WhatsApp', icon: 'ri-whatsapp-line' },
        { value: 'email', label: 'Email', icon: 'ri-mail-line' },
        { value: 'phone', label: 'Telepon', icon: 'ri-phone-line' },
        { value: 'website', label: 'Website', icon: 'ri-global-line' },
        { value: 'other', label: 'Lainnya', icon: 'ri-links-line' },
      ],
    },
    {
      key: 'value',
      label: 'public_contact.value',
      validate: (value, row) =>
        channelValueError(String(row['type']), String(value ?? '')),
    },
    {
      key: 'link',
      label: 'public_contact.link_auto',
      type: 'computed',
      link: true,
      compute: (row) =>
        channelLink(String(row['type']), String(row['value'] ?? '')),
    },
    {
      key: 'rank',
      label: 'public_contact.channel_status',
      type: 'select',
      width: '110px',
      options: [
        { value: 'primary', label: 'Utama', tone: 'success' },
        { value: 'normal', label: 'Biasa', tone: 'info' },
      ],
    },
    {
      key: 'shown',
      label: 'public_contact.publication',
      type: 'select',
      width: '110px',
      options: SHOWN_OPTIONS,
    },
  ];

  readonly topicColumns: InlineColumn[] = [
    {
      key: 'recipient_email',
      label: 'public_contact.recipient',
      placeholder: 'nama@matexindo.com',
      validate: (value) => {
        const email = String(value ?? '').trim();
        if (!email) return 'form_kit.required';
        return isEmail(email) ? null : 'form_kit.invalid_email';
      },
    },
    { key: 'id_label', label: 'Label - ID', validate: required },
    { key: 'en_label', label: 'Label - EN', validate: required },
    {
      key: 'shown',
      label: 'public_contact.publication',
      type: 'select',
      width: '120px',
      options: SHOWN_OPTIONS,
    },
  ];

  readonly socialBlank: InlineRow = {
    platform: 'facebook',
    status: 'inactive',
    shown: 'hidden',
  };
  readonly channelBlank: InlineRow = {
    type: 'whatsapp',
    rank: 'normal',
    shown: 'hidden',
  };
  readonly topicBlank: InlineRow = { shown: 'shown' };

  /** An active account must be made inactive before it can go. */
  readonly canRemoveSocial = (row: InlineRow) => row['status'] === 'inactive';

  /** At most three accounts per platform. */
  readonly validateSocial = (row: InlineRow, index: number) => {
    const others = this.socials().filter(
      (item, position) =>
        position !== index && item['platform'] === row['platform'],
    );
    return others.length >= 3
      ? { platform: 'public_contact.platform_full' }
      : {};
  };

  readonly validateLabels = (row: InlineRow) => {
    const errors: Record<string, string> = {};
    for (const key of ['id_label', 'en_label']) {
      const message = required(row[key]);
      if (message) errors[key] = message;
    }
    return errors;
  };

  constructor() {
    this.service
      .getSettings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => this.apply(response));
  }

  private apply(response: IPublicContactResponse): void {
    const data = response.data;
    if (!data) return;
    this.socials.set((data.socials ?? []).map(socialRow));
    this.channels.set(data.channels.map(channelRow));
    this.topics.set(data.topics.map(topicRow));
  }

  private save(
    payload: Partial<IPublicContactSettings>,
    change?: InlineChange,
  ) {
    this.service.updateSettings(payload).subscribe({
      next: (response) => {
        this.notifications.showSuccess(this.messages.resolveResponse(response));
        change?.done(true);
        this.apply(response);
        this.insightVersion.update((value) => value + 1);
      },
      error: () => {
        change?.done(false);
        // A refused order change must not stay on screen.
        if (!change) {
          this.service.getSettings().subscribe((res) => this.apply(res));
        }
      },
    });
  }

  saveSocial(change: InlineChange): void {
    const rows = withRow(this.socials(), change.row, change.index);
    this.save({ socials: rows.map(socialPayload) }, change);
  }

  removeSocial(change: InlineChange): void {
    const rows = this.socials().filter((_, index) => index !== change.index);
    this.save({ socials: rows.map(socialPayload) }, change);
  }

  saveChannel(change: InlineChange): void {
    const rows = oneMainPerType(
      withRow(this.channels(), change.row, change.index),
      change.row,
    );
    this.save({ channels: rows.map(channelPayload) }, change);
  }

  removeChannel(change: InlineChange): void {
    const rows = this.channels().filter((_, index) => index !== change.index);
    this.save({ channels: rows.map(channelPayload) }, change);
  }

  saveTopic(change: InlineChange): void {
    const rows = withRow(this.topics(), change.row, change.index);
    this.save({ topics: rows.map(topicPayload) }, change);
  }

  removeTopic(change: InlineChange): void {
    if (this.topics().length <= 1) {
      this.notifications.showError(
        this.translate.instant('public_contact.topic_needed'),
      );
      change.done(false);
      return;
    }
    const rows = this.topics().filter((_, index) => index !== change.index);
    this.save({ topics: rows.map(topicPayload) }, change);
  }

  reorderChannels(rows: InlineRow[]): void {
    this.save({ channels: rows.map(channelPayload) });
  }

  reorderTopics(rows: InlineRow[]): void {
    this.save({ topics: rows.map(topicPayload) });
  }

  //==================================================
  //==== WRITING HELP
  //==================================================

  describe(
    row: InlineRow,
    set: (key: string, value: unknown) => void,
    locale: 'id' | 'en',
  ): void {
    this.assist(
      `${locale}-generate`,
      () =>
        this.contentAssistant.assist({
          mode: 'generate',
          content_type: 'public-contact-channel',
          target_locale: locale === 'id' ? 'id-ID' : 'en-US',
          context: JSON.stringify({
            type: row['type'],
            label: row[`${locale}_label`],
          }),
          fields: { description: String(row[`${locale}_description`] ?? '') },
          field_types: { description: 'multiline_text' },
        }),
      (fields) => set(`${locale}_description`, fields['description'] || ''),
    );
  }

  translateDescription(
    row: InlineRow,
    set: (key: string, value: unknown) => void,
  ): void {
    this.assist(
      'translate',
      () =>
        this.contentAssistant.assist({
          mode: 'translate',
          content_type: 'public-contact-channel',
          source_locale: 'id-ID',
          target_locale: 'en-US',
          fields: { description: String(row['id_description'] ?? '') },
          field_types: { description: 'multiline_text' },
        }),
      (fields) => set('en_description', fields['description'] || ''),
    );
  }

  private assist(
    key: string,
    request: () => ReturnType<ContentAssistantService['assist']>,
    done: (fields: Record<string, string>) => void,
  ): void {
    if (this.assisting()) return;
    this.assisting.set(key);
    request()
      .pipe(finalize(() => this.assisting.set('')))
      .subscribe({
        next: (fields) => done(fields),
        error: (error: IApiErrorResponse) =>
          this.notifications.showError(
            error?.error?.code === 'CONTENT_ASSISTANT_NOT_CONFIGURED'
              ? 'Fitur isi otomatis belum aktif. Periksa konfigurasi layanan konten.'
              : 'Bantuan penulisan belum berhasil. Coba lagi sebentar.',
          ),
      });
  }
}
