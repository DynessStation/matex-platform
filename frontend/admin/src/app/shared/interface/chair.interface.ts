import { IApiResponse } from './api-response.interface';
import { IListResponse } from './list.interface';

//==================================================
//==== CHAIR / POSITION
//==================================================

export interface IChair {
  /**
   * Compatibility field untuk generic table template.
   */
  id: string;

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

//==================================================
//==== LIST
//==================================================

export type IChairModel = IListResponse<IChair>;

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
  id: string;
}

export type IDeleteChairResponse = IApiResponse<IDeleteChairData>;
