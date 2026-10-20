import {
  Injectable,
  OutputEmitterRef,
  Signal,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { TranslateService } from '@ngx-translate/core';

import {
  OfficeFormMode,
  OfficeFormTab,
  OfficeMediaDraft,
  OperatingDay,
} from './form-office.model';
import {
  createDefaultOperatingDays,
  emptyToNull,
  mediaDraftsFromDetail,
  operatingDaysFromHours,
  timeToString,
} from './form-office.util';
import {
  IOfficeAttachmentPayload,
  IOfficeDetail,
  IOfficeLocationValue,
  IOfficeOperatingHour,
  IOfficePayload,
} from '../../../shared/interface/office.interface';
import { LocalizationService } from '../../../shared/services/localization.service';
import { NotificationService } from '../../../shared/services/notification.service';

// Shared state of the office form and its tabs: the reactive form, the operating day and
// media drafts, edit-data patching, and submit with its validation. Provided by FormOffice
// (one instance per open form); the tab components inject it.
@Injectable()
export class OfficeFormService {
  private formBuilder = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private translate = inject(TranslateService);
  public readonly localization = inject(LocalizationService);

  //==================================================
  //==== INPUT / OUTPUT
  //==================================================

  // Bound to the form's inputs and output in connect().
  mode: Signal<OfficeFormMode> = signal('create');

  editData: Signal<IOfficeDetail | null> = signal(null);

  private formSubmit: OutputEmitterRef<IOfficePayload> | null = null;

  connect(form: {
    mode: Signal<OfficeFormMode>;
    editData: Signal<IOfficeDetail | null>;
    formSubmit: OutputEmitterRef<IOfficePayload>;
  }): void {
    this.mode = form.mode;
    this.editData = form.editData;
    this.formSubmit = form.formSubmit;
  }

  //==================================================
  //==== VIEW STATE
  //==================================================

  public activeTab: OfficeFormTab = 'general';

  public scheduleError = '';

  public officeMedia: OfficeMediaDraft[] = [];

  public operatingDays: OperatingDay[] = createDefaultOperatingDays();

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group({
    office_code: [
      '',

      [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[A-Za-z0-9_-]+$/),
      ],
    ],

    office_name: ['', [Validators.required, Validators.maxLength(255)]],

    office_description: [''],

    address: [''],

    city: [''],

    province: [''],

    postal_code: [''],

    email: ['', [Validators.email]],

    phone: [''],

    lat: this.formBuilder.control<number | null>(
      null,

      [Validators.min(-90), Validators.max(90)],
    ),

    lng: this.formBuilder.control<number | null>(
      null,

      [Validators.min(-180), Validators.max(180)],
    ),

    attendance_enabled: [false],

    attendance_radius_meter: this.formBuilder.control<number | null>(null),

    website_url: [''],

    is_public: [false],

    public_slug: [''],

    public_sort_order: [0],

    google_place_id: [''],

    google_maps_url: [''],

    google_business_url: [''],
  });

  //==================================================
  //==== EDIT DATA
  //==================================================

  constructor() {
    effect(() => {
      const data = this.editData();

      if (!data) {
        return;
      }

      this.form.patchValue(
        {
          office_code: data.office_code ?? '',

          office_name: data.office_name,

          office_description: data.office_description ?? '',

          address: data.address ?? '',

          city: data.city ?? '',

          province: data.province ?? '',

          postal_code: data.postal_code ?? '',

          email: data.email ?? '',

          phone: data.phone ?? '',

          lat: data.lat,

          lng: data.lng,

          attendance_enabled: data.attendance_enabled === 1,

          attendance_radius_meter: data.attendance_radius_meter,

          website_url: data.website_url ?? '',

          is_public: data.is_public === 1,

          public_slug: data.public_slug ?? '',

          public_sort_order: data.public_sort_order,

          google_place_id: data.google_place_id ?? '',

          google_maps_url: data.google_maps_url ?? '',

          google_business_url: data.google_business_url ?? '',
        },

        {
          emitEvent: false,
        },
      );

      this.operatingDays = operatingDaysFromHours(data.operating_hours);

      this.officeMedia = mediaDraftsFromDetail(data.attachments);
    });
  }

  //==================================================
  //==== LOCATION VALUE
  //==================================================

  get locationValue(): IOfficeLocationValue | null {
    const lat = this.form.controls.lat.value;

    const lng = this.form.controls.lng.value;

    if (lat === null || lng === null) {
      return null;
    }

    return {
      address: emptyToNull(this.form.controls.address.value),

      city: emptyToNull(this.form.controls.city.value),

      province: emptyToNull(this.form.controls.province.value),

      postal_code: emptyToNull(this.form.controls.postal_code.value),

      lat,

      lng,

      google_place_id: emptyToNull(this.form.controls.google_place_id.value),

      google_maps_url: emptyToNull(this.form.controls.google_maps_url.value),
    };
  }

  //==================================================
  //==== LOCATION CHANGED
  //==================================================

  locationChanged(location: IOfficeLocationValue): void {
    this.form.patchValue({
      address: location.address ?? '',

      city: location.city ?? '',

      province: location.province ?? '',

      postal_code: location.postal_code ?? '',

      lat: location.lat,

      lng: location.lng,

      google_place_id: location.google_place_id ?? '',

      google_maps_url: location.google_maps_url ?? '',
    });
  }

  //==================================================
  //==== WEEKDAY
  //==================================================

  weekdayLabel(dayOfWeek: number): string {
    return this.localization.weekdayLong(dayOfWeek);
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(): void {
    //==================================================
    //==== FORM
    //==================================================

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.activeTab = this.getFirstInvalidTab();

      this.notificationService.showError(
        this.translate.instant('office.validation.review_form'),
      );

      return;
    }

    //==================================================
    //==== LOCATION
    //==================================================

    if (!this.validateLocation()) {
      return;
    }

    //==================================================
    //==== OPERATING HOURS
    //==================================================

    const operatingHours = this.buildOperatingHours();

    if (!operatingHours) {
      this.activeTab = 'hours';

      return;
    }

    const value = this.form.getRawValue();

    const attachments: IOfficeAttachmentPayload[] = this.officeMedia.map(
      (item, index) => ({
        id_attachment: item.attachment.id_attachment,

        attachment_role: item.attachment_role,

        caption: emptyToNull(item.caption),

        sort_order: index,

        is_public: item.is_public ? 1 : 0,
      }),
    );

    this.formSubmit?.emit({
      office_code: value.office_code.trim().toUpperCase(),

      office_name: value.office_name.trim(),

      office_description: emptyToNull(value.office_description),

      address: emptyToNull(value.address),

      city: emptyToNull(value.city),

      province: emptyToNull(value.province),

      postal_code: emptyToNull(value.postal_code),

      email: emptyToNull(value.email),

      phone: emptyToNull(value.phone),

      lat: value.lat,

      lng: value.lng,

      attendance_enabled: value.attendance_enabled ? 1 : 0,

      attendance_radius_meter: value.attendance_enabled
        ? value.attendance_radius_meter
        : null,

      website_url: emptyToNull(value.website_url),

      is_public: value.is_public ? 1 : 0,

      public_slug: value.is_public ? emptyToNull(value.public_slug) : null,

      public_sort_order: Number(value.public_sort_order || 0),

      google_place_id: emptyToNull(value.google_place_id),

      google_maps_url: emptyToNull(value.google_maps_url),

      google_business_url: emptyToNull(value.google_business_url),

      operating_hours: operatingHours,

      attachments,
    });
  }

  //==================================================
  //==== FIRST INVALID TAB
  //==================================================

  private getFirstInvalidTab(): OfficeFormTab {
    const controls = this.form.controls;

    if (controls.office_code.invalid || controls.office_name.invalid) {
      return 'general';
    }

    if (
      controls.lat.invalid ||
      controls.lng.invalid ||
      controls.attendance_radius_meter.invalid
    ) {
      return 'location';
    }

    if (controls.email.invalid) {
      return 'contact';
    }

    return 'general';
  }

  //==================================================
  //==== BUILD HOURS
  //==================================================

  private buildOperatingHours(): IOfficeOperatingHour[] | null {
    this.scheduleError = '';

    const result: IOfficeOperatingHour[] = [];

    for (const day of this.operatingDays) {
      if (day.is_closed) {
        result.push({
          day_of_week: day.day_of_week,

          sequence: 1,

          open_time: null,

          close_time: null,

          is_closed: 1,
        });

        continue;
      }

      if (!day.ranges.length) {
        this.scheduleError = this.scheduleMessage(
          'office.validation.operating_time_required',
          day,
        );

        return null;
      }

      for (let index = 0; index < day.ranges.length; index++) {
        const range = day.ranges[index];

        const openTime = timeToString(range.open_time);

        const closeTime = timeToString(range.close_time);

        //==================================================
        //==== REQUIRED TIME
        //==================================================

        if (!openTime || !closeTime) {
          this.scheduleError = this.scheduleMessage(
            'office.validation.operating_time_incomplete',
            day,
          );

          return null;
        }

        //==================================================
        //==== SAME TIME
        //==================================================

        if (openTime === closeTime) {
          this.scheduleError = this.scheduleMessage(
            'office.validation.operating_time_same',
            day,
          );

          return null;
        }

        result.push({
          day_of_week: day.day_of_week,

          sequence: index + 1,

          open_time: openTime,

          close_time: closeTime,

          is_closed: 0,
        });
      }
    }

    return result;
  }

  private scheduleMessage(key: string, day: OperatingDay): string {
    return this.translate.instant(key, {
      day: this.weekdayLabel(day.day_of_week),
    });
  }

  //==================================================
  //==== VALIDATE LOCATION
  //==================================================

  private validateLocation(): boolean {
    const value = this.form.getRawValue();

    const lat = value.lat;

    const lng = value.lng;

    //==================================================
    //==== LATITUDE
    //==================================================

    if (
      lat !== null &&
      (!Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90)
    ) {
      this.form.controls.lat.markAsTouched();

      return this.rejectLocation('office.validation.latitude_range');
    }

    //==================================================
    //==== LONGITUDE
    //==================================================

    if (
      lng !== null &&
      (!Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)
    ) {
      this.form.controls.lng.markAsTouched();

      return this.rejectLocation('office.validation.longitude_range');
    }

    //==================================================
    //==== PAIR
    //==================================================

    if ((lat === null && lng !== null) || (lat !== null && lng === null)) {
      return this.rejectLocation('office.validation.coordinate_pair');
    }

    //==================================================
    //==== ATTENDANCE GEOFENCE
    //==================================================

    if (value.attendance_enabled) {
      if (lat === null || lng === null) {
        return this.rejectLocation(
          'office.validation.location_required_for_attendance',
        );
      }

      const radius = Number(value.attendance_radius_meter);

      if (!Number.isInteger(radius) || radius <= 0) {
        this.form.controls.attendance_radius_meter.markAsTouched();

        return this.rejectLocation(
          'office.validation.attendance_radius_positive',
        );
      }
    }

    return true;
  }

  /** Opens the Location tab and shows the message; always returns false. */
  private rejectLocation(key: string): false {
    this.activeTab = 'location';

    this.notificationService.showError(this.translate.instant(key));

    return false;
  }
}
