import { IApiResponse } from './api-response.interface';

export type FaqLocale = 'id-ID' | 'en-US';

export interface IFaqTranslation {
  locale: FaqLocale;
  question: string;
  answer: string;
  status: 0 | 1;
}

export interface IFaq {
  id: string;
  key: string;
  question: string;
  answer: string;
  sort_order: number;
  status: 0 | 1;
  locale_status: 0 | 1;
  translation_complete: boolean;
  created: string;
  updated: string;
}

export interface IFaqDetail {
  id: string;
  key: string;
  sort_order: number;
  status: 0 | 1;
  translations: IFaqTranslation[];
  created: string;
  updated: string;
}

export interface IFaqPayload {
  key: string;
  sort_order: number;
  status: 0 | 1;
  translations: IFaqTranslation[];
}

export interface IFaqModel {
  data: IFaq[];
  pagination: { current_page: number; per_page: number; total: number };
}

export type IFaqDetailResponse = IApiResponse<IFaqDetail>;
export type IFaqMutationResponse = IApiResponse<{ id: string } | null>;
