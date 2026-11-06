const ICONS: Record<string, string> = {
  facebook: 'ri-facebook-fill',
  instagram: 'ri-instagram-line',
  tiktok: 'ri-tiktok-line',
  youtube: 'ri-youtube-line',
  linkedin: 'ri-linkedin-fill',
};

/** The icon of a social platform. */
export function socialIcon(platform: string): string {
  return ICONS[platform] ?? 'ri-links-line';
}
