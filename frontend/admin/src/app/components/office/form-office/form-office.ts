import {
  Component,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  NgbNavModule,
  NgbTimepickerModule,
  NgbTimeStruct,
} from '@ng-bootstrap/ng-bootstrap';

import { NotificationService } from '../../../shared/services/notification.service';

import { Button } from '../../../shared/components/ui/button/button';

import { LocationPicker } from '../../../shared/components/ui/location-picker/location-picker';

import { MediaModal } from '../../../shared/components/ui/modal/media-modal/media-modal';

import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';

import { IAttachment } from '../../../shared/interface/attachment.interface';

import {
  IOfficeAttachmentPayload,
  IOfficeDetail,
  IOfficeLocationValue,
  IOfficeOperatingHour,
  IOfficePayload,
} from '../../../shared/interface/office.interface';

import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalizationService } from '../../../shared/services/localization.service';

//==================================================
//==== OPERATING DAY EDITOR
//==================================================

interface OperatingRange {
  open_time: NgbTimeStruct | null;

  close_time: NgbTimeStruct | null;
}

interface OperatingDay {
  day_of_week: number;

  is_closed: boolean;

  ranges: OperatingRange[];
}

//==================================================
//==== MEDIA EDITOR
//==================================================

interface OfficeMediaDraft {
  attachment: IAttachment;

  attachment_role: 'cover' | 'gallery';

  caption: string;

  is_public: boolean;
}

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-form-office',

  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgbNavModule,
    NgbTimepickerModule,
    Button,
    MediaModal,
    LocationPicker,
    HasPermissionDirective,
  ],

  templateUrl: './form-office.html',

  styleUrl: './form-office.scss',
})
export class FormOffice {
  private formBuilder = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private translate = inject(TranslateService);

  readonly mediaModal = viewChild<MediaModal>('mediaModal');

  readonly mode = input<'create' | 'edit'>('create');

  readonly editData = input<IOfficeDetail | null>(null);

  readonly formSubmit = output<IOfficePayload>();

  public activeTab = 'general';

  public scheduleError = '';

  public officeMedia: OfficeMediaDraft[] = [];

  public operatingDays: OperatingDay[] = this.createDefaultOperatingDays();

  public readonly officeMediaAccept = ['image/jpeg', 'image/png', 'image/webp'];

  private localizationService = inject(LocalizationService);

  public readonly localization = this.localizationService;

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

      this.patchOperatingHours(data.operating_hours);

      this.officeMedia = data.attachments.map((item) => ({
        attachment: {
          ...item,

          id: item.id_attachment,

          original_url: item.asset_url,

          size: item.file_size,
        },

        attachment_role: item.attachment_role,

        caption: item.caption ?? '',

        is_public: item.is_public === 1,
      }));
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
      address: this.emptyToNull(this.form.controls.address.value),

      city: this.emptyToNull(this.form.controls.city.value),

      province: this.emptyToNull(this.form.controls.province.value),

      postal_code: this.emptyToNull(this.form.controls.postal_code.value),

      lat,

      lng,

      google_place_id: this.emptyToNull(
        this.form.controls.google_place_id.value,
      ),

      google_maps_url: this.emptyToNull(
        this.form.controls.google_maps_url.value,
      ),
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
  //==== OPERATING DAYS
  //==================================================

  private createDefaultOperatingDays(): OperatingDay[] {
    return Array.from(
      {
        length: 7,
      },

      (_, index) => ({
        day_of_week: index + 1,

        is_closed: true,

        ranges: [],
      }),
    );
  }

  weekdayLabel(dayOfWeek: number): string {
    return this.localization.weekdayLong(dayOfWeek);
  }

  private patchOperatingHours(hours: IOfficeOperatingHour[]): void {
    this.operatingDays = this.createDefaultOperatingDays();

    for (const item of hours) {
      const day = this.operatingDays.find(
        (current) => current.day_of_week === item.day_of_week,
      );

      if (!day) {
        continue;
      }

      if (item.is_closed === 1) {
        day.is_closed = true;

        day.ranges = [];

        continue;
      }

      day.is_closed = false;

      day.ranges.push({
        open_time: this.stringToTime(item.open_time),

        close_time: this.stringToTime(item.close_time),
      });
    }
  }

  toggleDay(day: OperatingDay): void {
    day.is_closed = !day.is_closed;

    if (!day.is_closed && !day.ranges.length) {
      day.ranges.push({
        open_time: {
          hour: 8,
          minute: 0,
          second: 0,
        },

        close_time: {
          hour: 17,
          minute: 0,
          second: 0,
        },
      });
    }

    if (day.is_closed) {
      day.ranges = [];
    }
  }

  addRange(day: OperatingDay): void {
    day.is_closed = false;

    day.ranges.push({
      open_time: null,

      close_time: null,
    });
  }

  removeRange(
    day: OperatingDay,

    index: number,
  ): void {
    day.ranges.splice(index, 1);

    if (!day.ranges.length) {
      day.is_closed = true;
    }
  }

  //==================================================
  //==== MEDIA
  //==================================================

  openMedia(): void {
    this.mediaModal()?.openModal();
  }

  get selectedMedia(): IAttachment[] {
    return this.officeMedia.map((item) => item.attachment);
  }

  selectMedia(selection: MediaSelection): void {
    const selected = this.toAttachmentArray(selection);

    const oldMap = new Map(
      this.officeMedia.map((item) => [item.attachment.id_attachment, item]),
    );

    const hasCover = selected.some(
      (attachment) =>
        oldMap.get(attachment.id_attachment)?.attachment_role === 'cover',
    );

    let coverAssigned = hasCover;

    this.officeMedia = selected.map((attachment) => {
      const existing = oldMap.get(attachment.id_attachment);

      if (existing) {
        return existing;
      }

      const role: 'cover' | 'gallery' = !coverAssigned ? 'cover' : 'gallery';

      if (role === 'cover') {
        coverAssigned = true;
      }

      return {
        attachment,

        attachment_role: role,

        caption: '',

        is_public: true,
      };
    });
  }

  setCover(index: number): void {
    this.officeMedia = this.officeMedia.map((item, currentIndex) => ({
      ...item,

      attachment_role: currentIndex === index ? 'cover' : 'gallery',
    }));
  }

  removeMedia(index: number): void {
    const wasCover = this.officeMedia[index]?.attachment_role === 'cover';

    this.officeMedia.splice(index, 1);

    this.officeMedia = [...this.officeMedia];

    if (wasCover && this.officeMedia.length) {
      this.setCover(0);
    }
  }

  moveMedia(
    index: number,

    direction: -1 | 1,
  ): void {
    const target = index + direction;

    if (target < 0 || target >= this.officeMedia.length) {
      return;
    }

    const next = [...this.officeMedia];

    [next[index], next[target]] = [next[target], next[index]];

    this.officeMedia = next;
  }

  updateCaption(
    index: number,

    value: string,
  ): void {
    this.officeMedia[index] = {
      ...this.officeMedia[index],

      caption: value,
    };

    this.officeMedia = [...this.officeMedia];
  }

  updateMediaPublic(
    index: number,

    checked: boolean,
  ): void {
    this.officeMedia[index] = {
      ...this.officeMedia[index],

      is_public: checked,
    };

    this.officeMedia = [...this.officeMedia];
  }

  private toAttachmentArray(selection: MediaSelection): IAttachment[] {
    if (!selection) {
      return [];
    }

    if (Array.isArray(selection)) {
      return selection.filter(
        (item): item is IAttachment =>
          typeof item === 'object' && item !== null && 'id_attachment' in item,
      );
    }

    if (typeof selection === 'object' && 'id_attachment' in selection) {
      return [selection as IAttachment];
    }

    return [];
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

        caption: this.emptyToNull(item.caption),

        sort_order: index,

        is_public: item.is_public ? 1 : 0,
      }),
    );

    this.formSubmit.emit({
      office_code: value.office_code.trim().toUpperCase(),

      office_name: value.office_name.trim(),

      office_description: this.emptyToNull(value.office_description),

      address: this.emptyToNull(value.address),

      city: this.emptyToNull(value.city),

      province: this.emptyToNull(value.province),

      postal_code: this.emptyToNull(value.postal_code),

      email: this.emptyToNull(value.email),

      phone: this.emptyToNull(value.phone),

      lat: value.lat,

      lng: value.lng,

      attendance_enabled: value.attendance_enabled ? 1 : 0,

      attendance_radius_meter: value.attendance_enabled
        ? value.attendance_radius_meter
        : null,

      website_url: this.emptyToNull(value.website_url),

      is_public: value.is_public ? 1 : 0,

      public_slug: value.is_public ? this.emptyToNull(value.public_slug) : null,

      public_sort_order: Number(value.public_sort_order || 0),

      google_place_id: this.emptyToNull(value.google_place_id),

      google_maps_url: this.emptyToNull(value.google_maps_url),

      google_business_url: this.emptyToNull(value.google_business_url),

      operating_hours: operatingHours,

      attachments,
    });
  }

  //==================================================
  //==== FIRST INVALID TAB
  //==================================================

  private getFirstInvalidTab(): string {
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
        this.scheduleError = this.translate.instant(
          'office.validation.operating_time_required',
          {
            day: this.weekdayLabel(day.day_of_week),
          },
        );

        return null;
      }

      for (let index = 0; index < day.ranges.length; index++) {
        const range = day.ranges[index];

        const openTime = this.timeToString(range.open_time);

        const closeTime = this.timeToString(range.close_time);

        //==================================================
        //==== REQUIRED TIME
        //==================================================
        if (!openTime || !closeTime) {
          this.scheduleError = this.translate.instant(
            'office.validation.operating_time_incomplete',
            {
              day: this.weekdayLabel(day.day_of_week),
            },
          );

          return null;
        }
        //==================================================
        //==== SAME TIME
        //==================================================

        if (openTime === closeTime) {
          this.scheduleError = this.translate.instant(
            'office.validation.operating_time_same',
            {
              day: this.weekdayLabel(day.day_of_week),
            },
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

  //==================================================
  //==== HELPERS
  //==================================================

  //==================================================
  //==== STRING TO TIME
  //==================================================

  private stringToTime(value: string | null): NgbTimeStruct | null {
    if (!value) {
      return null;
    }

    const parts = value.slice(0, 8).split(':').map(Number);

    const hour = parts[0];

    const minute = parts[1];

    const second = parts[2] ?? 0;

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return {
      hour,
      minute,
      second,
    };
  }

  //==================================================
  //==== TIME TO STRING
  //==================================================

  private timeToString(value: NgbTimeStruct | null): string | null {
    if (!value) {
      return null;
    }

    const hour = String(value.hour).padStart(2, '0');

    const minute = String(value.minute).padStart(2, '0');

    return `${hour}:${minute}`;
  }

  private emptyToNull(value: string): string | null {
    const clean = value.trim();

    return clean || null;
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
      this.activeTab = 'location';

      this.form.controls.lat.markAsTouched();

      this.notificationService.showError(
        this.translate.instant('office.validation.latitude_range'),
      );

      return false;
    }

    //==================================================
    //==== LONGITUDE
    //==================================================

    if (
      lng !== null &&
      (!Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)
    ) {
      this.activeTab = 'location';

      this.form.controls.lng.markAsTouched();

      this.notificationService.showError(
        this.translate.instant('office.validation.longitude_range'),
      );

      return false;
    }

    //==================================================
    //==== PAIR
    //==================================================

    if ((lat === null && lng !== null) || (lat !== null && lng === null)) {
      this.activeTab = 'location';

      this.notificationService.showError(
        this.translate.instant('office.validation.coordinate_pair'),
      );

      return false;
    }

    //==================================================
    //==== ATTENDANCE GEOFENCE
    //==================================================

    if (value.attendance_enabled) {
      if (lat === null || lng === null) {
        this.activeTab = 'location';

        this.notificationService.showError(
          this.translate.instant(
            'office.validation.location_required_for_attendance',
          ),
        );

        return false;
      }

      const radius = Number(value.attendance_radius_meter);

      if (!Number.isInteger(radius) || radius <= 0) {
        this.activeTab = 'location';

        this.form.controls.attendance_radius_meter.markAsTouched();

        this.notificationService.showError(
          this.translate.instant(
            'office.validation.attendance_radius_positive',
          ),
        );

        return false;
      }
    }

    return true;
  }
}
