import { IApiResponse } from './api-response.interface';

export type PublicContactType =
  'whatsapp' | 'email' | 'phone' | 'social' | 'website' | 'other';
export interface IPublicContactTranslation {
  locale: 'id-ID' | 'en-US';
  label: string;
  description: string | null;
  status: 0 | 1;
}
export interface IPublicContactChannel {
  key: string;
  type: PublicContactType;
  value: string;
  url: string | null;
  is_primary: 0 | 1;
  is_public: 0 | 1;
  /** Read-only: the place in the list (1..n), set by the list order. */
  sort_order?: number;
  translations: IPublicContactTranslation[];
}
export interface IContactInquiryTopic {
  key: string;
  recipient_email: string | null;
  /** Read-only: the place in the list (1..n), set by the list order. */
  sort_order?: number;
  status: 0 | 1;
  translations: IPublicContactTranslation[];
}
export interface IPublicSocialAccount {
  key: string;
  platform: string;
  name: string;
  url: string;
  is_active: 0 | 1;
  is_public: 0 | 1;
  /** Typed by hand: the platforms' APIs need an app review. */
  followers: number | null;
  content_count: number | null;
  stats_updated_at?: string | null;
}
export interface IContactInsightSocial {
  key: string;
  platform: string;
  name: string;
  url: string;
  is_active: number;
  is_public: number;
  followers: number | null;
  content_count: number | null;
  clicks: number;
}
export interface IContactInsightChannel {
  key: string;
  type: string;
  label: string;
  description: string;
  clicks: number;
}
export interface IContactInsightAudit {
  total: number;
  sent: number;
  failed: number;
  other: number;
  today: number;
  active_topics: number;
  topics_without_recipient: number;
  mail_configured: boolean;
}
export interface IContactInsightMail {
  configured: boolean;
  address?: string;
  total?: number;
  unread?: number;
  answered?: number;
  read?: number;
}
export interface IPublicContactSettings {
  socials?: IPublicSocialAccount[];
  channels: IPublicContactChannel[];
  topics: IContactInquiryTopic[];
}
export type IPublicContactResponse = IApiResponse<IPublicContactSettings>;
