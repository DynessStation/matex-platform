import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, DOCUMENT, inject, RESPONSE_INIT, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { catchError, finalize, map, of, shareReplay, tap, timeout } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import {
  PublicContactChannel,
  PublicContactData,
  PublicOffice,
} from '../../../shared/interface/public-content.interface';
import { IPublicWebsitePage } from '../../../shared/interface/website-page.interface';
import { NotificationService } from '../../../shared/services/notification.service';
import { PublicContentService } from '../../../shared/services/public-content.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { WebsitePageSeoService } from '../../../shared/services/website-page-seo.service';
import { WebsitePageService } from '../../../shared/services/website-page.service';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

interface OfficeScheduleRow {
  day: string;
  hours: string;
}

interface ContactOfficeView extends PublicOffice {
  display_address: string;
  map: SafeResourceUrl | null;
  schedule: OfficeScheduleRow[];
}

interface ContactView extends Omit<PublicContactData, 'offices'> {
  offices: ContactOfficeView[];
}

@Component({
  selector: 'app-contact-us',
  imports: [AsyncPipe, HomeNewsletter, ReactiveFormsModule, Breadcrumb],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
})
export class ContactUs {
  private fb = inject(FormBuilder);
  private content = inject(PublicContentService);
  private navigation = inject(PublicNavigationContextService);
  private notifications = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);
  private websitePages = inject(WebsitePageService);
  private websiteSeo = inject(WebsitePageSeoService);
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private response = inject(RESPONSE_INIT, { optional: true });
  private originalLang = this.document.documentElement.lang;
  private mapUrls = new Map<string, SafeResourceUrl>();
  readonly locale = this.navigation.locale();
  readonly page = signal<IPublicWebsitePage | null>(null);
  readonly pageState = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  readonly contactState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly submission = signal<
    | { state: 'idle' }
    | { state: 'success'; reference: string }
    | { state: 'error'; message: string }
  >({ state: 'idle' });
  readonly contact$ = this.content.getContact(this.locale).pipe(
    map((response): ContactView | null => {
      if (!response.data) {
        this.contactState.set('error');
        return null;
      }
      this.contactState.set('ready');
      return {
        ...response.data,
        offices: response.data.offices.map((office) => this.officeView(office)),
      };
    }),
    catchError(() => {
      this.contactState.set('error');
      return of(null);
    }),
    shareReplay(1),
  );
  submitting = false;

  readonly breadcrumb: breadcrumb = {
    title: this.locale === 'en-US' ? 'Contact Us' : 'Hubungi Kami',
    items: [{ label: this.locale === 'en-US' ? 'Contact Us' : 'Hubungi Kami', active: true }],
  };

  readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', Validators.email],
      phone: ['', Validators.maxLength(50)],
      topic_key: ['', Validators.required],
      message: ['', [Validators.required, Validators.maxLength(5000)]],
      consent: [false, Validators.requiredTrue],
      website: [''],
    },
    {
      validators: (control) =>
        control.value.email || control.value.phone ? null : { contactRequired: true },
    },
  );

  constructor() {
    this.websiteSeo.prepare();

    if (this.response) {
      const headers = new Headers(this.response.headers);
      headers.set('Cache-Control', 'no-store');
      this.response.headers = headers;
    }

    const path = this.locale === 'en-US' ? 'contact-us' : 'kontak';
    this.websitePages
      .getPage(this.locale, path)
      .pipe(
        timeout(15000),
        tap((page) => {
          this.pageState.set('ready');
          this.page.set(page);
          this.breadcrumb.title = page.title;
          this.breadcrumb.items = [{ label: page.title, active: true }];
          this.websiteSeo.apply(page);
        }),
        catchError((error: unknown) => {
          const missing = error instanceof HttpErrorResponse && error.status === 404;
          this.pageState.set(missing ? 'missing' : 'error');
          if (this.response) this.response.status = missing ? 404 : 503;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.destroyRef.onDestroy(() => {
      this.websiteSeo.clear();
      this.document.documentElement.lang = this.originalLang;
    });
  }

  pageMessage(indonesian: string, english: string): string {
    return this.locale === 'en-US' ? english : indonesian;
  }

  whatsapp(channels: PublicContactChannel[]): PublicContactChannel | undefined {
    return (
      channels.find((channel) => channel.type === 'whatsapp' && channel.is_primary) ??
      channels.find((channel) => channel.type === 'whatsapp')
    );
  }

  channelIcon(type: string): string {
    const icons: Record<string, string> = {
      whatsapp: 'ri-whatsapp-line',
      email: 'ri-mail-line',
      phone: 'ri-phone-line',
      social: 'ri-share-line',
      website: 'ri-global-line',
    };
    return icons[type] ?? 'ri-links-line';
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

  private officeView(office: PublicOffice): ContactOfficeView {
    const addressParts = [office.address, office.city, office.province, office.postal_code]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .filter((part, index, parts) => {
        const normalized = part.toLocaleLowerCase();
        return !parts
          .slice(0, index)
          .some((previous) => previous.toLocaleLowerCase().includes(normalized));
      });

    return {
      ...office,
      display_address: addressParts.join(', '),
      map: this.mapUrl(office),
      schedule: this.officeSchedule(office),
    };
  }

  private officeSchedule(office: PublicOffice): OfficeScheduleRow[] {
    if (!office.operating_hours?.length) return [];
    const weekdays =
      this.locale === 'en-US'
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    return weekdays.flatMap((day, index) => {
      const ranges = office.operating_hours.filter((item) => item.day_of_week === index + 1);
      if (!ranges.length) return [];
      const openRanges = ranges.filter(
        (item) => !item.is_closed && item.open_time && item.close_time,
      );
      return [
        {
          day,
          hours: openRanges.length
            ? openRanges
                .map((item) => `${item.open_time!.slice(0, 5)}–${item.close_time!.slice(0, 5)}`)
                .join(', ')
            : this.locale === 'en-US'
              ? 'Closed'
              : 'Tutup',
        },
      ];
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) return;
    this.submission.set({ state: 'idle' });
    this.submitting = true;
    const value = this.form.getRawValue();
    this.content
      .sendInquiry({
        locale: this.locale,
        topic_key: value.topic_key!,
        name: value.name!,
        email: value.email || null,
        phone: value.phone || null,
        message: value.message!,
        consent: value.consent === true,
        website: value.website ?? '',
        source_path: location.pathname,
      })
      .pipe(
        finalize(() => {
          this.submitting = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const reference = response.data?.reference ?? '';
          this.submission.set({ state: 'success', reference });
          this.notifications.showSuccess(
            this.locale === 'en-US'
              ? 'Your message has been received.'
              : 'Pesan Anda sudah diterima.',
          );
          this.form.reset({ consent: false, website: '' });
        },
        error: (error: unknown) => {
          const rateLimited = error instanceof HttpErrorResponse && error.status === 429;
          this.submission.set({
            state: 'error',
            message: rateLimited
              ? this.locale === 'en-US'
                ? 'Too many messages were sent. Please wait a moment and try again.'
                : 'Terlalu banyak pesan dikirim. Tunggu sebentar lalu coba kembali.'
              : this.locale === 'en-US'
                ? 'The message could not be sent. Please try again or use another contact channel.'
                : 'Pesan belum dapat dikirim. Coba kembali atau gunakan kanal kontak lainnya.',
          });
        },
      });
  }
}
