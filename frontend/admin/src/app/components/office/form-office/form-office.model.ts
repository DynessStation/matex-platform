import { NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

import { IAttachment } from '../../../shared/interface/attachment.interface';

//==================================================
//==== TABS
//==================================================

export type OfficeFormTab =
  'general' | 'location' | 'contact' | 'hours' | 'media' | 'publication';

export type OfficeFormMode = 'create' | 'edit';

//==================================================
//==== OPERATING DAY EDITOR
//==================================================

export interface OperatingRange {
  open_time: NgbTimeStruct | null;

  close_time: NgbTimeStruct | null;
}

export interface OperatingDay {
  day_of_week: number;

  is_closed: boolean;

  ranges: OperatingRange[];
}

/** The range a day gets when it is switched open (08:00-17:00). */
export function defaultOperatingRange(): OperatingRange {
  return {
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
  };
}

//==================================================
//==== MEDIA EDITOR
//==================================================

export interface OfficeMediaDraft {
  attachment: IAttachment;

  attachment_role: 'cover' | 'gallery';

  caption: string;

  is_public: boolean;
}

export const OFFICE_MEDIA_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
