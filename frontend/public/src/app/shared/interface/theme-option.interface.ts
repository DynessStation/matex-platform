import { Select2Option } from 'ng-select2-component';

import { Attachment } from './attachment.interface';
import { BannerLink } from './theme.interface';

export interface ThemeOptionStateModel {
  theme_option: any;
  exit: boolean;
  cookies: boolean;
  newsletter: boolean;
  productBox: string;
}

export interface ThemeOption {
  id: number;
  options: Option;
}

export interface Option {
  logo: Logo;
  general: General;
  seo: SEO;
  header: Header;
  footer: Footer;
  blog: Blog;
  product: ProductThemeOption;
  collection: Collection;
  seller: Seller;
  about_us: IAboutUs;
  contact_us: Contact;
  error_page: ErrorPage;
  popup: Popup;
  seller_store: SellerStore;
  coming_soon: IComingSoon;
}

export interface IComingSoon {
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  theme_logo: string;
}
export interface SellerStore {
  seller_layout: string;
}
export interface Logo {
  header_logo_id: number;
  footer_logo_id: number;
  favicon_icon_id: number;
  favicon_icon: Attachment;
  header_logo: Attachment;
  footer_logo: Attachment;
}

export interface General {
  site_title: string;
  site_tagline: string;
  sticky_cart_enable: boolean;
  preloader_enable: number | boolean;
  back_to_top_enable: number | boolean;
  cart_style: string;
  language_direction: string;
  hover_color: string;
  primary_color: string;
  secondary_color: string;
  link_color: string;
  mode: string;
  celebration_effect: boolean;
  seller_register_url: string;
  exit_tagline_enable: boolean;
  taglines: string[];
}

export interface SEO {
  meta_tags: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image_id: number;
  og_image: Attachment;
}

export interface Header {
  sticky_header_enable: number | boolean;
  header_options: string;
  page_top_bar_enable: number | boolean;
  top_bar_content: TopBarContent[];
  page_top_bar_dark: number | boolean;
  support_number: string;
  today_deals: [];
  category_ids: number[];
}

export interface TopBarContent {
  content: string;
}

export interface Footer {
  footer_style: string;
  bg_image: string;
  bg_color: string;
  title: string;
  sub_title: string;
  footer_copyright: number | boolean;
  copyright_content: string;
  footer_about: string;
  about_address: string;
  about_email: string;
  footer_categories: number[];
  footer_pages: [];
  our_service: CustomDropdown[];
  information: CustomDropdown[];
  my_account: CustomDropdown[];
  payment_option: PaymentOption[];
  footer_list: FooterList[];
  support_number: number;
  payment_option_image_url: string;
  support_email: string;
  play_store_url: string;
  app_store_url: string;
  play_store_image: string;
  app_store_image: string;
  social_media_enable: number | boolean;
  facebook: string;
  instagram: string;
  twitter: string;
  pinterest: string;
}
export interface PaymentOption {
  id: number;
  image: string;
}
export interface FooterList {
  value: string;
}
export interface CustomDropdown {
  id: number;
  name: string;
  value: string;
}

export interface Blog {
  blog_style: string;
  blog_sidebar_type: string;
  blog_author_enable: number | boolean;
  read_more_enable: number | boolean;
}

export interface Seller {
  about: About;
  services: Services;
  steps: Steps;
  start_selling: Step;
  store_layout: string;
  store_details: string;
  store_image_url: string;
  home_section: HomeSection;
  why_selling: WhySelling;
  seller_stories: SellerStories;
  selling_steps: SellingStaps;
}

export interface SellingStaps {
  status: boolean;
  title: string;
  description: string;
  sell_steps: SellSteps[];
}

export interface SellSteps {
  step_number: string;
  title: string;
  description: string;
}
export interface SellerStories {
  title: string;
  description: string;
  status: string;
  review: SellerReview[];
}

export interface SellerReview {
  icon: string;
  message: string;
  image: string;
  name: string;
  designation: string;
}
export interface WhySelling {
  title: string;
  description: string;
  seller_benefits: SellerBenefits[];
  status: boolean;
}

export interface SellerBenefits {
  icon: string;
  title: string;
  description: string;
}
export interface HomeSection {
  title: string;
  description: string;
  button_text: string;
  image: string;
  status: boolean;
}

export interface IAboutUs {
  about: AboutSection;
  team: Team;
  testimonial: Testimonial;
}

export interface AboutSection {
  status: boolean;
  content_bg_image_url: string;
  title: string;
  description: string;
  futures: AboutFutures[];
}

export interface AboutFutures {
  icon: string;
  title: string;
  description: string;
}

export interface About {
  status: boolean;
  title: string;
  description: string;
  image_url: string;
}

export interface ClientsContent {
  icon: string;
  title: string;
  description: string;
}

export interface Team {
  status: boolean;
  sub_title: string;
  description: string;
  title: string;
  members: Member[];
}

export interface Member {
  profile_image_url: string;
  name: string;
  designation: string;
  description: string;
  instagram: string;
  youtube: string;
  linkedin: string;
  facebook: string;
}

export interface Testimonial {
  status: boolean;
  sub_title: string;
  title: string;
  description: string;
  reviews: Review[];
}

export interface Review {
  icon: string;
  profile_image_url: string;
  name: string;
  designation: string;
  review: string;
}

export interface Blog {
  status: boolean;
  blog_ids: number[];
}

export interface Services {
  status: boolean;
  title: string;
  service_1: Service;
  service_2: Service;
  service_3: Service;
  service_4: Service;
}

export interface Service {
  status: boolean;
  title: string;
  description: string;
  image_url: string;
}

export interface Steps {
  status: boolean;
  title: string;
  step_1: Step;
  step_2: Step;
  step_3: Step;
}

export interface Step {
  status: boolean;
  title: string;
  description: string;
}

export interface Contact {
  title: string;
  description: string;
  contact_email: string;
  contact_number: string;
  imageUrl: string;
  main_title: string;
  topic: Select2Option[];
}

export interface ErrorPage {
  error_page_content: string;
  back_button_enable: number | boolean;
  back_button_text: string;
  error_400: ErrorPageDetails;
  error_404: ErrorPageDetails;
  error_500: ErrorPageDetails;
}

export interface ErrorPageDetails {
  title: string;
  description: string;
  image: string;
  back_button_text: string;
  back_button_enable: boolean;
}

export interface Popup {
  news_letter: NewsLetter;
  exit: Exit;
  sale: Sale;
  auth: Auth;
}

export interface NewsLetter {
  is_enable: boolean;
  image_url: string;
  offer: string;
  title: string;
  description: string;
}

export interface Exit {
  is_enable: boolean;
  image_url: string;
  title: string;
  sub_title: string;
  description: string;
}

export interface Sale {
  is_enable: boolean;
  text: string;
}

export interface Auth {
  is_enable: boolean;
  image_url: string;
}

export interface ProductThemeOption {
  product_layout: string;
  product_box_variant: string;
  is_trending_product: boolean;
  banner_enable: boolean;
  banner_image_url: string;
  safe_checkout: boolean;
  safe_checkout_image: string;
  secure_checkout: boolean;
  secure_checkout_image: string;
  encourage_order: boolean;
  encourage_max_order_count: number;
  encourage_view: boolean;
  encourage_max_view_count: number;
  sticky_checkout: boolean;
  sticky_product: boolean;
  social_share: boolean;
  shipping_and_return: string;
  image_variant: string;
  services: ProductServices;
}

export interface ProductServices {
  status: boolean;
  banners: BannerLink[];
}

export interface Collection {
  collection_layout: string;
  collection_banner_image_url: string;
  collection_categories_ids: number[];
  product_ids: number[];
}

export interface Images {
  image_url: string;
}
export interface ILanguages {
  language: string;
  code: string;
  icon: string;
}
export interface Link {
  id?: number;
  name: string;
  value: string;
}
