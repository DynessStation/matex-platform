import { IApiResponse } from './api-response.interface';

export type PublicContactType = 'whatsapp' | 'email' | 'phone' | 'social' | 'website' | 'other';
export interface IPublicContactTranslation { locale: 'id-ID' | 'en-US'; label: string; description: string | null; status: 0 | 1; }
export interface IPublicContactChannel {
  key: string; type: PublicContactType; value: string; url: string | null;
  is_primary: 0 | 1; is_public: 0 | 1; sort_order: number;
  translations: IPublicContactTranslation[];
}
export interface IContactInquiryTopic {
  key: string; recipient_email: string | null; sort_order: number; status: 0 | 1;
  translations: IPublicContactTranslation[];
}
export interface IPublicContactSettings { channels: IPublicContactChannel[]; topics: IContactInquiryTopic[]; }
export type IPublicContactResponse = IApiResponse<IPublicContactSettings>;
