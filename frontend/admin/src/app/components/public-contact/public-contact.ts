import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../shared/components/ui/button/button';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IPublicContactSettings, PublicContactType } from '../../shared/interface/public-contact.interface';
import { ApiMessageService } from '../../shared/services/api-message.service';
import { NotificationService } from '../../shared/services/notification.service';
import { PublicContactService } from '../../shared/services/public-contact.service';

@Component({
  selector: 'app-public-contact',
  imports: [ReactiveFormsModule, RouterModule, TranslateModule, PageWrapper, Button, HasPermissionDirective],
  templateUrl: './public-contact.html', styleUrl: './public-contact.scss',
})
export class PublicContact {
  private fb = inject(FormBuilder);
  private service = inject(PublicContactService);
  private notifications = inject(NotificationService);
  private messages = inject(ApiMessageService);
  readonly channelTypes: PublicContactType[] = ['whatsapp', 'email', 'phone', 'social', 'website', 'other'];
  loading = true;

  readonly form = this.fb.group({ channels: this.fb.array([]), topics: this.fb.array([]) });
  get channels() { return this.form.controls.channels as FormArray; }
  get topics() { return this.form.controls.topics as FormArray; }

  ngOnInit(): void {
    this.service.getSettings().subscribe({
      next: response => { this.load(response.data ?? { channels: [], topics: [] }); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private translations(values?: Array<{ locale: string; label: string; description?: string | null }>) {
    const find = (locale: string) => values?.find(item => item.locale === locale);
    return this.fb.group({
      id_label: [find('id-ID')?.label ?? '', Validators.required],
      id_description: [find('id-ID')?.description ?? ''],
      en_label: [find('en-US')?.label ?? '', Validators.required],
      en_description: [find('en-US')?.description ?? ''],
    });
  }

  addChannel(value?: any): void {
    this.channels.push(this.fb.group({
      key: [value?.key ?? '', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      type: [value?.type ?? 'whatsapp', Validators.required], value: [value?.value ?? '', Validators.required],
      url: [value?.url ?? ''], is_primary: [value?.is_primary === 1], is_public: [value?.is_public !== 0],
      sort_order: [value?.sort_order ?? this.channels.length], translations: this.translations(value?.translations),
    }));
  }

  addTopic(value?: any): void {
    this.topics.push(this.fb.group({
      key: [value?.key ?? '', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      recipient_email: [value?.recipient_email ?? '', Validators.email],
      sort_order: [value?.sort_order ?? this.topics.length], status: [value?.status !== 0],
      translations: this.translations(value?.translations),
    }));
  }

  private load(settings: IPublicContactSettings): void {
    this.channels.clear(); this.topics.clear();
    settings.channels.forEach(item => this.addChannel(item));
    settings.topics.forEach(item => this.addTopic(item));
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const mapTranslations = (value: any) => [
      { locale: 'id-ID' as const, label: value.id_label, description: value.id_description || null, status: 1 as const },
      { locale: 'en-US' as const, label: value.en_label, description: value.en_description || null, status: 1 as const },
    ];
    const payload: IPublicContactSettings = {
      channels: raw.channels.map((item: any) => ({
        key: item.key, type: item.type, value: item.value, url: item.url || null,
        is_primary: item.is_primary ? 1 : 0, is_public: item.is_public ? 1 : 0,
        sort_order: Number(item.sort_order), translations: mapTranslations(item.translations),
      })),
      topics: raw.topics.map((item: any) => ({
        key: item.key, recipient_email: item.recipient_email || null, sort_order: Number(item.sort_order),
        status: item.status ? 1 : 0, translations: mapTranslations(item.translations),
      })),
    };
    this.service.updateSettings(payload).subscribe(response => {
      this.notifications.showSuccess(this.messages.resolveResponse(response));
      if (response.data) this.load(response.data);
    });
  }
}
