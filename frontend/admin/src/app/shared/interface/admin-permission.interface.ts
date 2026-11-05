import { IApiResponse } from './api-response.interface';

export interface IAdminPermission {
  id_admin_permission: string;
  permission_key: string;
  permission_name: string;
  permission_group: string | null;
  permission_description: string | null;
  /** 1 active, 0 inactive. */
  permission_status: number;
  /** How many access profiles hold it. */
  access_count: number;
}

export interface IAdminPermissionGroup {
  /** null for permissions without a group, listed under "Other". */
  id_admin_permission_group: string | null;
  name: string;
  permissions: IAdminPermission[];
}

export type IAdminPermissionGroupsResponse = IApiResponse<
  IAdminPermissionGroup[]
>;

export interface IAdminPermissionGroupMutation {
  id_admin_permission_group: string;
  name: string;
}

export interface ICreateAdminPermission {
  permission_key: string;
  permission_name: string;
  permission_group: string | null;
  permission_description: string | null;
  permission_status: 0 | 1;
}

export interface IUpdateAdminPermission {
  permission_name: string;
  permission_group: string | null;
  permission_description: string | null;
}

export type IAdminPermissionMutationResponse = IApiResponse<{
  id_admin_permission?: string;
  id?: string;
}>;
