import { PaginateModel } from './core.interface';

export interface AttachmentModel extends PaginateModel {
  data: Attachment[];
}

export interface Attachment {
  id: number;
  name: string;
  file_name: string;
  asset_url?: string;
  mime_type: string;
  original_url: string;
}
