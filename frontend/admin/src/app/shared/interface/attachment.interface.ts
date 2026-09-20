import { IPaginateModel } from './core.interface';
import { IApiResponse } from './api-response.interface';

//==================================================
//==== ATTACHMENT
//==================================================

export interface IAttachment {
  id_attachment: string;

  collection_name: string;

  name: string;

  original_name: string;

  file_name: string;

  mime_type: string;

  extension: string;

  disk: string;

  storage_path: string;

  file_size: number;

  width: number | null;

  height: number | null;

  asset_url: string;

  created?: string;

  updated?: string;

  //==================================================
  //==== KARTIFY LEGACY COMPATIBILITY
  //==================================================

  /**
   * @deprecated
   * Use id_attachment.
   */
  id?: any;

  /**
   * @deprecated
   * Use asset_url.
   */
  original_url?: string;

  /**
   * @deprecated
   * Use file_size.
   */
  size?: number;
}

//==================================================
//==== ATTACHMENT MODEL
//==================================================

export interface IAttachmentModel extends IPaginateModel {
  data: IAttachment[];
}

//==================================================
//==== ATTACHMENT API PAGINATION
//==================================================

export interface IAttachmentPagination {
  page: number;

  limit: number;

  total: number;

  length: number;

  total_pages: number;

  has_more: boolean;
}

//==================================================
//==== ATTACHMENT LIST RESPONSE
//==================================================

export interface IAttachmentListResponse {
  success: boolean;

  data: IAttachment[];

  pagination: IAttachmentPagination;
}

//==================================================
//==== CREATE ATTACHMENT PAYLOAD
//==================================================

export interface ICreateAttachmentPayload {
  collection: string;

  files: File[];
}

//==================================================
//==== CREATE ATTACHMENT RESPONSE
//==================================================

export type ICreateAttachmentResponse = IApiResponse<IAttachment[]>;

//==================================================
//==== DELETE ATTACHMENT RESPONSE
//==================================================

export interface IDeleteAttachmentData {
  id_attachment: string;
}

export type IDeleteAttachmentResponse = IApiResponse<IDeleteAttachmentData>;

//==================================================
//==== BULK DELETE ATTACHMENT RESPONSE
//==================================================

export interface IDeleteAllAttachmentData {
  deleted: number;
}

export type IDeleteAllAttachmentResponse =
  IApiResponse<IDeleteAllAttachmentData>;
