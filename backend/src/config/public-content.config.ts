export const PUBLIC_CONTENT_LOCALES = ["id-ID", "en-US"] as const;

export type PublicContentLocale = (typeof PUBLIC_CONTENT_LOCALES)[number];

export const isPublicContentLocale = (
  value: unknown,
): value is PublicContentLocale =>
  typeof value === "string" &&
  PUBLIC_CONTENT_LOCALES.includes(value as PublicContentLocale);

export const PUBLIC_CONTACT_CHANNEL_TYPES = [
  "whatsapp",
  "email",
  "phone",
  "social",
  "website",
  "other",
] as const;

export type PublicContactChannelType =
  (typeof PUBLIC_CONTACT_CHANNEL_TYPES)[number];

export const isPublicContactChannelType = (
  value: unknown,
): value is PublicContactChannelType =>
  typeof value === "string" &&
  PUBLIC_CONTACT_CHANNEL_TYPES.includes(value as PublicContactChannelType);

export const normalizePublicContentKey = (value: unknown): string =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")
    : "";
