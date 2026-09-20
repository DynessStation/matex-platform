import { IApiResponse } from './api-response.interface';

//==================================================
//==== CHAIR / POSITION
//==================================================

export interface IChair {
  /**
   * Compatibility field untuk generic Table Kartify.
   */
  id: any;

  id_chair: string;

  chair_name: string;

  chair_description: string | null;

  admin_count: number;

  chair_status: 0 | 1;

  status_label: string;

  created: string;

  updated: string;
}

//==================================================
//==== PAGINATION
//==================================================

export interface IChairPagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  pagerows: number;

  total_pages: number;

  has_more: boolean;
}

//==================================================
//==== LIST
//==================================================

export interface IChairModel {
  success: boolean;

  data: IChair[];

  pagination: IChairPagination;
}

//==================================================
//==== DETAIL
//==================================================

export interface IChairDetail {
  id_chair: string;

  chair_name: string;

  chair_description: string | null;

  chair_status: 0 | 1;

  status_label: string;

  admin_count: number;

  created: string;

  updated: string;
}

export interface IChairDetailResponse {
  success: boolean;

  data: IChairDetail;
}

//==================================================
//==== SAVE
//==================================================

export interface IChairPayload {
  chair_name: string;

  chair_description: string | null;
}

export interface IChairMutationData {
  id_chair: string;
}

export type IChairMutationResponse = IApiResponse<IChairMutationData>;

//==================================================
//==== STATUS
//==================================================

export interface IUpdateChairStatus {
  chair_status: 0 | 1;
}

export interface IUpdateChairStatusData {
  id_chair: string;

  chair_status: 0 | 1;

  affected_accounts?: number;
}

export type IUpdateChairStatusResponse = IApiResponse<IUpdateChairStatusData>;

//==================================================
//==== DELETE
//==================================================

export interface IDeleteChairData {
  id_chair: string;
}

export type IDeleteChairResponse = IApiResponse<IDeleteChairData>;
