import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of, shareReplay } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { PublicContactChannel, PublicOffice } from '../../../shared/interface/public-content.interface';
import { PublicContentService } from '../../../shared/services/public-content.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-contact-us',
  imports: [AsyncPipe, HomeNewsletter, ReactiveFormsModule, Breadcrumb],
  templateUrl: './contact-us.html', styleUrl: './contact-us.scss',
})
export class ContactUs {
  private fb = inject(FormBuilder);
  private content = inject(PublicContentService);
  private navigation = inject(PublicNavigationContextService);
  private notifications = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);
  private mapUrls = new Map<string, SafeResourceUrl>();
  readonly locale = this.navigation.locale();
  readonly contact$ = this.content.getContact(this.locale).pipe(map(response => response.data ?? null), catchError(() => of(null)), shareReplay(1));
  submitting = false;

  readonly breadcrumb: breadcrumb = {
    title: this.locale === 'en-US' ? 'Contact Us' : 'Hubungi Kami',
    items: [{ label: this.locale === 'en-US' ? 'Contact Us' : 'Hubungi Kami', active: true }],
  };

  readonly form = this.fb.group({
    name: ['', Validators.required], email: ['', Validators.email], phone: [''],
    topic_key: ['', Validators.required], message: ['', Validators.required], consent: [false, Validators.requiredTrue],
    website: [''],
  }, { validators: control => control.value.email || control.value.phone ? null : { contactRequired: true } });

  whatsapp(channels: PublicContactChannel[]): PublicContactChannel | undefined {
    return channels.find(channel => channel.type === 'whatsapp' && channel.is_primary)
      ?? channels.find(channel => channel.type === 'whatsapp');
  }

  mapUrl(office: PublicOffice): SafeResourceUrl | null {
    if (office.lat === null || office.lng === null) return null;
    const cached = this.mapUrls.get(office.code);
    if (cached) return cached;
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${office.lat},${office.lng}&z=15&output=embed`,
    );
    this.mapUrls.set(office.code, url);
    return url;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    const value = this.form.getRawValue();
    this.content.sendInquiry({
      locale: this.locale, topic_key: value.topic_key!, name: value.name!,
      email: value.email || null, phone: value.phone || null, message: value.message!,
      consent: value.consent === true, website: value.website ?? '', source_path: location.pathname,
    }).subscribe({
      next: response => {
        this.notifications.showSuccess(response.message);
        this.form.reset({ consent: false, website: '' });
        this.submitting = false;
      },
      error: () => { this.submitting = false; },
    });
  }
}
