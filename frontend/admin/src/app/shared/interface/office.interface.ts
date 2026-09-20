import { IAttachment } from './attachment.interface';

//==================================================
//==== OFFICE
//==================================================

export interface IOffice {
  id: any;

  id_office: string;

  office_code: string | null;

  office_name: string;

  office_description: string | null;

  address: string | null;

  city: string | null;

  province: string | null;

  postal_code: string | null;

  email: string | null;

  phone: string | null;

  lat: number | null;

  lng: number | null;

  attendance_enabled: 0 | 1;

  attendance_radius_meter: number | null;

  website_url: string | null;

  is_public: 0 | 1;

  public_slug: string | null;

  public_sort_order: number;

  google_place_id: string | null;

  google_maps_url: string | null;

  google_business_url: string | null;

  admin_count: number;

  media_count: number;

  status: 0 | 1;

  status_label: string;

  visibility_label: string;

  created: string;

  updated: string;
}

//==================================================
//==== PAGINATION
//==================================================

export interface IOfficePagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  pagerows: number;

  total_pages: number;

  has_more: boolean;
}

export interface IOfficeModel {
  success: boolean;

  data: IOffice[];

  pagination: IOfficePagination;
}

//==================================================
//==== OPERATING HOUR
//==================================================

export interface IOfficeOperatingHour {
  id_office_operating_hour?: number;

  day_of_week: number;

  sequence: number;

  open_time: string | null;

  close_time: string | null;

  is_closed: 0 | 1;
}

//==================================================
//==== OFFICE ATTACHMENT
//==================================================

export interface IOfficeAttachment extends IAttachment {
  id_office_attachment?: number;

  attachment_role: 'cover' | 'gallery';

  caption: string | null;

  sort_order: number;

  is_public: 0 | 1;
}

//==================================================
//==== DETAIL
//==================================================

export interface IOfficeDetail extends Omit<IOffice, 'id'> {
  operating_hours: IOfficeOperatingHour[];

  attachments: IOfficeAttachment[];
}

export interface IOfficeDetailResponse {
  success: boolean;

  data: IOfficeDetail;
}

//==================================================
//==== SAVE ATTACHMENT
//==================================================

export interface IOfficeAttachmentPayload {
  id_attachment: string;

  attachment_role: 'cover' | 'gallery';

  caption: string | null;

  sort_order: number;

  is_public: 0 | 1;
}

//==================================================
//==== SAVE
//==================================================

export interface IOfficePayload {
  office_code: string;

  office_name: string;

  office_description: string | null;

  address: string | null;

  city: string | null;

  province: string | null;

  postal_code: string | null;

  email: string | null;

  phone: string | null;

  lat: number | null;

  lng: number | null;

  attendance_enabled: 0 | 1;

  attendance_radius_meter: number | null;

  website_url: string | null;

  is_public: 0 | 1;

  public_slug: string | null;

  public_sort_order: number;

  google_place_id: string | null;

  google_maps_url: string | null;

  google_business_url: string | null;

  operating_hours: IOfficeOperatingHour[];

  attachments: IOfficeAttachmentPayload[];
}

export interface IOfficeMutationResponse {
  success: boolean;

  code: string;

  message: string;

  data: {
    id_office: string;
  };
}
//==================================================
//==== STATUS
//==================================================

export interface IUpdateOfficeStatus {
  status: 0 | 1;
}

export interface IUpdateOfficeStatusResponse {
  success: boolean;

  code: string;

  message: string;

  data: {
    id_office: string;

    status: 0 | 1;

    affected_accounts?: number;
  };
}

//==================================================
//==== LOCATION PICKER
//==================================================

export interface IOfficeLocationValue {
  address: string | null;

  city: string | null;

  province: string | null;

  postal_code: string | null;

  lat: number;

  lng: number;

  google_place_id: string | null;

  google_maps_url: string | null;
}
