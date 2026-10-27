export interface PublicFaqItem {
  key: string;
  question: string;
  answer: string;
  category: { key: string; name: string } | null;
}
export interface PublicFaqData {
  locale: string;
  items: PublicFaqItem[];
}
export interface PublicContactChannel {
  key: string;
  type: string;
  value: string;
  url: string | null;
  is_primary: boolean;
  label: string;
  description: string | null;
}
export interface PublicContactTopic {
  key: string;
  label: string;
}
export interface PublicOfficeOperatingHour {
  day_of_week: number;
  sequence: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}
export interface PublicOffice {
  code: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  email: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  slug: string;
  google_maps_url: string | null;
  google_business_url: string | null;
  operating_hours: PublicOfficeOperatingHour[];
}
export interface PublicContactData {
  locale: string;
  channels: PublicContactChannel[];
  topics: PublicContactTopic[];
  offices: PublicOffice[];
}
export interface PublicApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
}

/** A public API list (A-2): the items in `data`, the paging and counts in `meta`. */
export interface PublicListResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data?: T[];
  meta?: { page?: number; limit?: number; total: number; total_pages?: number };
}

/** The site's list models keep the items and the total. */
export const toListModel = <T>(response: PublicListResponse<T>) => ({
  data: response.data ?? [],
  total: response.meta?.total ?? 0,
});

/** The API list query: the site's page size `paginate` is `limit`, its order `sortBy` is `sort`. */
export const toListQuery = (payload?: Record<string, unknown>) => {
  const query: Record<string, unknown> = { ...(payload ?? {}) };
  for (const [from, to] of [
    ['paginate', 'limit'],
    ['sortBy', 'sort'],
  ]) {
    if (query[from] !== undefined) {
      query[to] ??= query[from];
      delete query[from];
    }
  }
  return query;
};
export interface PublicContactInquiry {
  locale: string;
  topic_key: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  consent: boolean;
  website: string;
  source_path: string;
}
