import { IApiResponse } from './api-response.interface';

//==================================================
//==== ADMIN ACCESS
//==================================================

export interface IAdminAccess {
  //==================================================
  //==== TABLE COMPATIBILITY
  //==================================================

  id: any;

  id_admin_access: string;

  access_name: string;

  access_description: string | null;

  permission_count: number;

  admin_count: number;

  admin_access_status: 0 | 1;

  status_label: string;

  created: string;

  updated: string;
}

//==================================================
//==== PAGINATION
//==================================================

export interface IAdminAccessPagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  pagerows: number;

  total_pages: number;

  has_more: boolean;
}

//==================================================
//==== MODEL
//==================================================

export interface IAdminAccessModel {
  success: boolean;

  data: IAdminAccess[];

  pagination: IAdminAccessPagination;
}

//==================================================
//==== PERMISSION
//==================================================

export interface IAdminAccessPermission {
  id_admin_permission: string;

  permission_key: string;

  permission_name: string;

  permission_description: string | null;
}

//==================================================
//==== PERMISSION GROUP
//==================================================

export interface IAdminAccessPermissionGroup {
  permission_group: string;

  permissions: IAdminAccessPermission[];
}

//==================================================
//==== PERMISSION MATRIX RESPONSE
//==================================================

export interface IAdminAccessPermissionMatrixResponse {
  success: boolean;

  data: IAdminAccessPermissionGroup[];
}

//==================================================
//==== DETAIL PERMISSION
//==================================================

export interface IAdminAccessDetailPermission extends IAdminAccessPermission {
  permission_group: string;
}

//==================================================
//==== DETAIL
//==================================================

export interface IAdminAccessDetail {
  id_admin_access: string;

  access_name: string;

  access_description: string | null;

  admin_access_status: 0 | 1;

  status_label: string;

  admin_count: number;

  permission_ids: string[];

  permissions: IAdminAccessDetailPermission[];

  created: string;

  updated: string;
}

//==================================================
//==== DETAIL RESPONSE
//==================================================

export interface IAdminAccessDetailResponse {
  success: boolean;

  data: IAdminAccessDetail;
}

//==================================================
//==== SAVE PAYLOAD
//==================================================

export interface IAdminAccessPayload {
  access_name: string;

  access_description: string | null;

  permissions: string[];
}

//==================================================
//==== MUTATION
//==================================================

export interface IAdminAccessMutationData {
  id_admin_access: string;
}

export type IAdminAccessMutationResponse =
  IApiResponse<IAdminAccessMutationData>;

//==================================================
//==== STATUS PAYLOAD
//==================================================

export interface IUpdateAdminAccessStatus {
  admin_access_status: 0 | 1;
}

//==================================================
//==== STATUS RESPONSE
//==================================================

export interface IUpdateAdminAccessStatusData {
  id_admin_access: string;

  admin_access_status: 0 | 1;

  affected_accounts?: number;
}

export type IUpdateAdminAccessStatusResponse =
  IApiResponse<IUpdateAdminAccessStatusData>;

//==================================================
//==== DELETE
//==================================================

export interface IDeleteAdminAccessData {
  id_admin_access: string;
}

export type IDeleteAdminAccessResponse = IApiResponse<IDeleteAdminAccessData>;
