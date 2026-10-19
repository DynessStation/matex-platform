import { toFlag } from '../../../helper/input.helper';
// Input normalizers and operating-hour validation for office create and update.

export interface OfficeOperatingHourInput {
  day_of_week: number;
  sequence?: number;
  open_time?: string | null;
  close_time?: string | null;
  is_closed?: number | boolean;
}

export interface NormalizedOfficeOperatingHour {
  day_of_week: number;
  sequence: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: 0 | 1;
}

export type OperatingHourResult =
  | {
      success: true;
      data: NormalizedOfficeOperatingHour[];
    }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

// Time

export const normalizeTime = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const clean = value.trim();

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(clean);

  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
};

// Operating hours

export const validateOperatingHours = (value: unknown): OperatingHourResult => {
  if (!Array.isArray(value)) {
    return {
      success: false,
      status: 400,
      code: 'OFFICE_OPERATING_HOURS_ARRAY_INVALID',
      message: 'Operating hours must be an array',
    };
  }

  if (value.length > 30) {
    return {
      success: false,
      status: 400,
      code: 'OFFICE_OPERATING_HOURS_AMOUNT_INVALID',
      message: 'Too many operating hour entries',
    };
  }

  const result: NormalizedOfficeOperatingHour[] = [];

  const uniqueKeys = new Set<string>();

  const closedDays = new Set<number>();

  const entriesPerDay = new Map<number, number>();

  for (const raw of value) {
    const item = raw as OfficeOperatingHourInput;

    const day = Number(item?.day_of_week);

    const sequence = item?.sequence === undefined ? 1 : Number(item.sequence);

    const isClosed = toFlag(item?.is_closed, 0);

    // Day

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_OPERATING_DAY_INVALID',
        message: 'Invalid operating day',
      };
    }

    // Sequence

    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_OPERATING_HOURS_SEQUENCE_INVALID',
        message: 'Invalid operating hour sequence',
      };
    }

    const key = `${day}:${sequence}`;

    if (uniqueKeys.has(key)) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_OPERATING_HOURS_DUPLICATED',
        message: 'Duplicate operating hour entry',
      };
    }

    uniqueKeys.add(key);

    entriesPerDay.set(day, (entriesPerDay.get(day) ?? 0) + 1);

    // Closed

    if (isClosed === 1) {
      if (sequence !== 1) {
        return {
          success: false,
          status: 400,
          code: 'OFFICE_OPERATING_DAY_SEQUENCE_INVALID',
          message: 'Closed day must use sequence 1',
        };
      }

      closedDays.add(day);

      result.push({
        day_of_week: day,
        sequence,
        open_time: null,
        close_time: null,
        is_closed: 1,
      });

      continue;
    }

    // Open / close

    const openTime = normalizeTime(item?.open_time);

    const closeTime = normalizeTime(item?.close_time);

    if (!openTime || !closeTime) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_OPERATING_HOURS_OPEN_CLOSE_INVALID', // SUMPAH BINGUNG NAMAIN CODENYA WKWK
        message: 'Open and close time are required for operating days',
      };
    }

    if (openTime === closeTime) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_OPERATING_HOURS_SAME_OPEN_CLOSE',
        message: 'Open time and close time cannot be the same',
      };
    }

    result.push({
      day_of_week: day,
      sequence,
      open_time: openTime,
      close_time: closeTime,
      is_closed: 0,
    });
  }

  // Closed day cannot have another range

  for (const day of closedDays) {
    if ((entriesPerDay.get(day) ?? 0) > 1) {
      return {
        success: false,
        status: 400,
        code: 'OFFICE_OPERATING_HOURS_CONTAIN_ANOTHER_OPERATING_TIME',
        message: 'Closed day cannot contain another operating time',
      };
    }
  }

  result.sort((a, b) => a.day_of_week - b.day_of_week || a.sequence - b.sequence);

  return {
    success: true,
    data: result,
  };
};
