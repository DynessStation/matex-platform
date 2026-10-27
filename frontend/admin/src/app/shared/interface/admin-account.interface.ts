import { IApiResponse } from './api-response.interface';
import { IAttachment } from './attachment.interface';
import { IListResponse } from './list.interface';

//==================================================
//==== ADMIN ACCOUNT
//==================================================

export interface IAdminAccount {
  /**
   * Compatibility untuk generic table template.
   */
  id: string;

  id_admin_acct: string;

  id_master_comp: string;

  comp_name: string;

  comp_alias: string;

  id_office: string;

  office_name: string;

  name: string;

  alias: string;

  email_1: string | null;

  email_2: string | null;

  phone_1: string | null;

  phone_2: string | null;

  id_profile_photo: string | null;

  profile_photo: IAttachment | null;

  uuid: string;

  id_chair: string;

  chair_name: string;

  chair_description: string | null;

  id_admin_access: string;

  access_name: string;

  is_all_access: 0 | 1;

  admin_acct_status: 0 | 1;

  status_label: string;

  created: string;

  updated: string;
}

//==================================================
//==== PAGINATION
//==================================================

//==================================================
//==== LIST
//==================================================

export type IAdminAccountModel = IListResponse<IAdminAccount>;

//==================================================
//==== SELECT
//==================================================

export interface IAdminAccountSelectOption {
  value: string;

  label: string;

  data?: Record<string, unknown>;
}

export type IAdminAccountSelectResponse =
  IListResponse<IAdminAccountSelectOption>;

export interface IAdminAccountSelectParams {
  page?: number;

  limit?: number;

  search?: string;
}

//==================================================
//==== CREATE
//==================================================

export interface ICreateAdminAccount {
  name: string;

  alias: string;

  email_1: string;

  email_2: string | null;

  phone_1: string;

  phone_2: string | null;

  id_profile_photo: string | null;

  id_master_comp: string;

  id_office: string;

  id_chair: string;

  id_access: string;

  is_all_access: boolean;

  password: string;
}

//==================================================
//==== UPDATE
//==================================================

export interface IUpdateAdminAccount {
  name: string;

  alias: string;

  email_1: string;

  email_2: string | null;

  phone_1: string;

  phone_2: string | null;

  id_profile_photo: string | null;

  id_master_comp: string;

  id_office: string;

  id_chair: string;

  id_access: string;

  is_all_access: boolean;
}

//==================================================
//==== MUTATION
//==================================================

export interface IAdminAccountMutationData {
  id_admin_acct: string;
}

export type ICreateAdminAccountResponse =
  IApiResponse<IAdminAccountMutationData>;

export type IUpdateAdminAccountResponse =
  IApiResponse<IAdminAccountMutationData>;

//==================================================
//==== DETAIL
//==================================================

export interface IAdminAccountDetailResponse {
  success: boolean;

  data: {
    id_admin_acct: string;

    name: string;

    alias: string;

    email_1: string;

    email_2: string | null;

    phone_1: string;

    phone_2: string | null;

    id_profile_photo: string | null;

    profile_photo: IAttachment | null;

    master_comp: {
      id_master_comp: string;

      comp_name: string;

      comp_alias: string;
    };

    office: {
      id_office: string;

      office_name: string;
    };

    chair: {
      id_chair: string;

      chair_name: string;

      chair_description: string | null;
    };

    access: {
      id_access: string;

      access_name: string;
    };

    is_all_access: 0 | 1;

    admin_acct_status: 0 | 1;

    created: string;

    updated: string;
  };
}

//==================================================
//==== STATUS
//==================================================

export interface IUpdateAdminAccountStatus {
  admin_acct_status: 0 | 1;
}

export interface IUpdateAdminAccountStatusData {
  id_admin_acct: string;

  admin_acct_status: 0 | 1;
}

export type IUpdateAdminAccountStatusResponse =
  IApiResponse<IUpdateAdminAccountStatusData>;

//==================================================
//==== DELETE
//==================================================

export interface IDeleteAdminAccountData {
  id_admin_acct: string;
}

export type IDeleteAdminAccountResponse = IApiResponse<IDeleteAdminAccountData>;
