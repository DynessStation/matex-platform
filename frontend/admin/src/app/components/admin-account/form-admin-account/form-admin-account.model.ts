//==================================================
//==== FORM VALUE
//==================================================

export interface AdminAccountFormValue {
  name: string;
  alias: string;

  email_1: string;
  email_2: string;

  phone_country_1: string;
  phone_1: string;

  phone_country_2: string;
  phone_2: string;

  id_profile_photo: string;

  id_master_comp: string;
  id_office: string;
  id_chair: string;
  id_access: string;

  is_all_access: boolean;

  password: string;
  confirm_password: string;
}

export type AdminAccountFormMode = 'create' | 'edit';

export type AdminPasswordStrength = 'weak' | 'normal' | 'strong' | null;

//==================================================
//==== LOOKUP TYPES
//==================================================

export type AdminLookupType = 'company' | 'office' | 'chair' | 'access';

export interface AdminLookupState {
  page: number;
  search: string;
  hasMore: boolean;
  loading: boolean;
  initialized: boolean;
}

export interface AdminLookupSearch {
  type: AdminLookupType;
  search: string;
}

//==================================================
//==== CONSTANTS
//==================================================

export const ADMIN_DEFAULT_COUNTRY_CODE = '62';

export const ADMIN_LOOKUP_LIMIT = 20;

export const ADMIN_PROFILE_PHOTO_ACCEPT: string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function emptyLookupState(search = ''): AdminLookupState {
  return {
    page: 1,
    search,
    hasMore: false,
    loading: false,
    initialized: false,
  };
}
