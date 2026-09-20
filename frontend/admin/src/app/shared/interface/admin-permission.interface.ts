import { IApiResponse } from './api-response.interface';

//==================================================
//==== ADMIN PERMISSION
//==================================================

export interface IAdminPermission {
  /**
   * Internal numeric ID khusus compatibility
   * dengan generic Table.
   *
   * BUKAN ID database / API.
   */
  id: number;

  /**
   * Actual identifier dari API (Hashids).
   */
  id_admin_permission: string;

  permission_key: string;

  permission_name: string;

  permission_group: string | null;

  permission_description: string | null;

  permission_status: 0 | 1;

  status_label: string;

  access_count: number;

  created: string;

  updated: string;
}

//==================================================
//==== PAGINATION
//==================================================

export interface IAdminPermissionPagination {
  total: number;

  page: number;

  limit: number;

  length: number;

  pagerows: number;
}

//==================================================
//==== LIST
//==================================================

export interface IAdminPermissionModel {
  success: boolean;

  data: IAdminPermission[];

  pagination: IAdminPermissionPagination;
}

//==================================================
//==== MUTATION DATA
//==================================================

export interface IAdminPermissionMutationData {
  id_admin_permission: string;
}

//==================================================
//==== CREATE
//==================================================

export interface ICreateAdminPermission {
  permission_key: string;

  permission_name: string;

  permission_group: string | null;

  permission_description: string | null;
}

export type ICreateAdminPermissionResponse =
  IApiResponse<IAdminPermissionMutationData>;

//==================================================
//==== DETAIL
//==================================================

export interface IAdminPermissionDetailResponse {
  success: boolean;

  data: {
    id_admin_permission: string;

    permission_key: string;

    permission_name: string;

    permission_group: string | null;

    permission_description: string | null;

    permission_status: 0 | 1;

    access_count: number;

    created: string;

    updated: string;
  };
}

//==================================================
//==== UPDATE
//==================================================

export interface IUpdateAdminPermission {
  /**
   * permission_key intentionally not included.
   * Key is immutable after creation.
   */
  permission_name: string;

  permission_group: string | null;

  permission_description: string | null;
}

export type IUpdateAdminPermissionResponse =
  IApiResponse<IAdminPermissionMutationData>;

//==================================================
//==== STATUS
//==================================================

export interface IUpdateAdminPermissionStatus {
  permission_status: 0 | 1;
}

export interface IUpdateAdminPermissionStatusData {
  id_admin_permission: string;

  permission_status: 0 | 1;
}

export type IUpdateAdminPermissionStatusResponse =
  IApiResponse<IUpdateAdminPermissionStatusData>;

//==================================================
//==== DELETE
//==================================================

export interface IDeleteAdminPermissionData {
  id_admin_permission: string;
}

export type IDeleteAdminPermissionResponse =
  IApiResponse<IDeleteAdminPermissionData>;
