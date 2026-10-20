import { NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

import { OfficeMediaDraft, OperatingDay } from './form-office.model';
import { MediaSelection } from '../../../shared/components/ui/media-box/media-box';
import { IAttachment } from '../../../shared/interface/attachment.interface';
import {
  IOfficeDetail,
  IOfficeOperatingHour,
} from '../../../shared/interface/office.interface';

// Stateless helpers of the office form.

//==================================================
//==== OPERATING DAYS
//==================================================

/** Seven closed days, Monday (1) to Sunday (7). */
export function createDefaultOperatingDays(): OperatingDay[] {
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

/** Builds the day editor from stored operating hours. */
export function operatingDaysFromHours(
  hours: IOfficeOperatingHour[],
): OperatingDay[] {
  const days = createDefaultOperatingDays();

  for (const item of hours) {
    const day = days.find(
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
      open_time: stringToTime(item.open_time),

      close_time: stringToTime(item.close_time),
    });
  }

  return days;
}

//==================================================
//==== STRING TO TIME
//==================================================

export function stringToTime(value: string | null): NgbTimeStruct | null {
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

export function timeToString(value: NgbTimeStruct | null): string | null {
  if (!value) {
    return null;
  }

  const hour = String(value.hour).padStart(2, '0');

  const minute = String(value.minute).padStart(2, '0');

  return `${hour}:${minute}`;
}

//==================================================
//==== TEXT
//==================================================

export function emptyToNull(value: string): string | null {
  const clean = value.trim();

  return clean || null;
}

//==================================================
//==== MEDIA
//==================================================

/** Builds the media editor from the stored office attachments. */
export function mediaDraftsFromDetail(
  attachments: IOfficeDetail['attachments'],
): OfficeMediaDraft[] {
  return attachments.map((item) => ({
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
}

export function toAttachmentArray(selection: MediaSelection): IAttachment[] {
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
