import { IApiResponse } from './api-response.interface';
import { IPaginateModel } from './core.interface';
import { IListResponse } from './list.interface';

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

  /** Places that use the file (D-5, U-14); a used file cannot be deleted. */
  usage_total?: number;

  usage?: { source: string; total: number }[];

  //==================================================
  //==== LEGACY TEMPLATE COMPATIBILITY
  //==================================================

  /**
   * @deprecated
   * Use id_attachment.
   */
  id?: string;

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
//==== ATTACHMENT LIST RESPONSE
//==================================================

export type IAttachmentListResponse = IListResponse<IAttachment>;

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
