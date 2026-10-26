import { PublicContactData } from '../interface/public-content.interface';

// "MATEX Market segera hadir" (P-1): one text for the header panel and the /account page, so the
// account, favorites, and cart icons say the same thing. Owner decision 26 Oct: the icons stay
// as a sign that MATEX will have its own market; no "versi 2" wording for visitors.

export type MarketFeature = 'account' | 'favorites' | 'cart';

export const MARKET_FEATURES: MarketFeature[] = ['account', 'favorites', 'cart'];

export const MARKET_ICONS: Record<MarketFeature, string> = {
  account: 'user-2',
  favorites: 'heart',
  cart: 'basket-2',
};

export const marketText = (isEnglish: boolean) =>
  isEnglish
    ? {
        badge: 'Soon',
        title: 'MATEX Market is coming soon',
        body: 'Soon you can create an account, save favorite products, and order right here. For now, order through our team.',
        features: {
          account: 'Customer account',
          favorites: 'Save favorites',
          cart: 'Cart and online orders',
        } as Record<MarketFeature, string>,
        open: {
          account: 'Account, coming soon',
          favorites: 'Favorites, coming soon',
          cart: 'Cart, coming soon',
        } as Record<MarketFeature, string>,
        whatsapp: 'Order via WhatsApp',
        contact: 'Contact us',
        catalog: 'View catalog',
        close: 'Close',
      }
    : {
        badge: 'Segera',
        title: 'MATEX Market segera hadir',
        body: 'Nanti Anda bisa membuat akun, menyimpan produk favorit, dan memesan langsung di sini. Untuk sekarang, pesan lewat tim kami.',
        features: {
          account: 'Akun pelanggan',
          favorites: 'Simpan favorit',
          cart: 'Keranjang dan pesanan online',
        } as Record<MarketFeature, string>,
        open: {
          account: 'Akun, segera hadir',
          favorites: 'Favorit, segera hadir',
          cart: 'Keranjang, segera hadir',
        } as Record<MarketFeature, string>,
        whatsapp: 'Pesan via WhatsApp',
        contact: 'Hubungi kami',
        catalog: 'Lihat katalog',
        close: 'Tutup',
      };

/** The primary WhatsApp link from Pengaturan Kontak, or null when there is none. */
export const whatsappLink = (data: PublicContactData | null | undefined): string | null => {
  const channels = (data?.channels ?? []).filter((channel) => channel.type === 'whatsapp');
  const channel = channels.find((item) => item.is_primary) ?? channels[0];
  return channel?.url ?? null;
};
