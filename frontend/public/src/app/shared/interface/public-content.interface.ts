export interface PublicFaqItem { key: string; question: string; answer: string; category: { key: string; name: string } | null; }
export interface PublicFaqData { locale: string; items: PublicFaqItem[]; }
export interface PublicContactChannel { key: string; type: string; value: string; url: string | null; is_primary: boolean; label: string; description: string | null; }
export interface PublicContactTopic { key: string; label: string; }
export interface PublicOffice { code: string; name: string; description: string | null; address: string; city: string; province: string; postal_code: string; country_code: string; email: string | null; phone: string | null; lat: number | null; lng: number | null; website_url: string | null; slug: string; google_maps_url: string | null; google_business_url: string | null; }
export interface PublicContactData { locale: string; channels: PublicContactChannel[]; topics: PublicContactTopic[]; offices: PublicOffice[]; }
export interface PublicApiResponse<T> { success: boolean; code: string; message: string; data?: T; }
export interface PublicContactInquiry { locale: string; topic_key: string; name: string; email: string | null; phone: string | null; message: string; consent: boolean; website: string; source_path: string; }
