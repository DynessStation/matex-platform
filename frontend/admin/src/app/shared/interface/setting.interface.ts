import { IAttachment } from './attachment.interface';
import { ICurrency } from './currency.interface';
import { ICategoriesIconList, IFeaturedBanners } from './theme.interface';

export interface ISetting {
  id?: number;
  values: IValues;
}

export interface IValues {
  general: IGeneral;
  activation: IActivation;
  wallet_points: IWalletPoints;
  email: IEmail;
  sms_methods: ISMSMethods;
  media_configuration: IMediaConfig;
  vendor_commissions: IVendorCommissions;
  refund: IRefund;
  google_reCaptcha?: IGoogleReCaptcha;
  delivery: IDelivery;
  payment_methods: IPaymentMethods;
  analytics: IAnalytics;
  maintenance: IMaintenance;
}

export interface IMediaConfig {
  media_disk: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_bucket: string;
  aws_default_region: string;
}

export interface ISMSMethods {
  default_sms_method: string;
  twilio: ITwilio;
  config: IConfig;
}

export interface IConfig {
  cancel_order_sms: boolean | number;
  refund_request_sms: boolean | number;
  withdraw_request_sms: boolean | number;
  pending_order_sms: boolean | number;
  place_order_sms: boolean | number;
  signup_bonus_sms: boolean | number;
  update_order_status_sms: boolean | number;
  update_refund_request_sms: boolean | number;
  update_withdraw_request_sms: boolean | number;
  vendor_register_sms: boolean | number;
}

export interface ITwilio {
  title: string;
  status: true;
  twilio_sid: string;
  twilio_auth_token: string;
  twilio_number: string;
}

export interface ILanguage {
  language: string;
  code: string;
  icon: string;
}

export interface IDayInterval {
  title: string;
  description: string;
}

export interface IGeneral {
  light_logo_image?: IAttachment;
  dark_logo_image?: IAttachment;
  favicon_image?: IAttachment;
  tiny_logo_image?: IAttachment;
  light_logo_image_id?: number;
  dark_logo_image_id?: number;
  tiny_logo_image_id?: number;
  favicon_image_id?: number;
  site_name: string;
  site_url: string;
  site_title: string;
  site_tagline: string;
  default_timezone: string;
  default_currency_id: number;
  admin_site_language_direction: string;
  min_order_amount: number;
  min_order_free_shipping: number;
  product_sku_prefix: string;
  default_currency: ICurrency;
  mode: string;
  copyright: string;
}

export interface IActivation {
  multivendor: number | boolean;
  point_enable: number | boolean;
  coupon_enable: number | boolean;
  wallet_enable: number | boolean;
  catalog_enable: number | boolean;
  stock_product_hide: number | boolean;
  store_auto_approve: number | boolean;
  product_auto_approve: number | boolean;
  guest_checkout: number | boolean;
  track_order: number | boolean;
  send_sms: number | boolean;
  login_number: number | boolean;
}

export interface IWalletPoints {
  signup_points: number;
  min_per_order_amount: number;
  point_currency_ratio: number;
  reward_per_order_amount: number;
}

export interface IEmail {
  email: string;
  mail_host: string;
  mail_port: number;
  mail_mailer: string;
  mail_password: string;
  mail_username: string;
  mail_encryption: string;
  mail_from_name: string;
  mail_from_address: string;
  mailgun_domain: string;
  mailgun_secret: string;
  system_test_mail: number | boolean;
  password_reset_mail: number | boolean;
  visitor_inquiry_mail: number | boolean;
  cancel_order_mail: number | boolean;
  refund_request_mail: number | boolean;
  withdrawal_request_mail: number | boolean;
  pending_order_alert_mail: number | boolean;
  order_confirmation_mail: number | boolean;
  signup_welcome_mail: number | boolean;
  order_status_update_mail: number | boolean;
  refund_status_update_mail: number | boolean;
  withdrawal_status_update_mail: number | boolean;
  new_vendor_notification_mail: number | boolean;
}

export interface IVendorCommissions {
  status: number;
  min_withdraw_amount: number;
  default_commission_rate: number;
  is_category_based_commission: number;
}

export interface IRefund {
  status: boolean;
  refundable_days: number;
}

export interface IGoogleReCaptcha {
  secret: string;
  status: number | boolean;
  site_key: string;
}

export interface IDelivery {
  default_delivery: number | boolean;
  default: IDeliveryDay;
  same_day_delivery: boolean;
  same_day: IDeliveryDay;
  same_day_intervals: IDayInterval[];
}

export interface IDeliveryDay {
  title: ISetting;
  description: string;
}

export interface IDeliveryBlock {
  delivery_description: string | null;
  delivery_interval: string | null;
}

export interface IPaymentMethods {
  paypal: IPaypal;
  stripe: IStripeAndRazorpay;
  razorpay: IStripeAndRazorpay;
  mollie: IMollie;
  cod: ICOD;
  phonepe: IPhonepe;
  instamojo: IInstamojo;
  ccavenue: ICcavenue;
  bkash: IBkash;
  flutter_wave: IFlutterWave;
  paystack: IPaystack;
  sslcommerz: ISslcommerz;
  bank_transfer: IBankTransfer;
}

export interface IPaypal {
  status: number | boolean;
  title: string;
  client_id: string;
  client_secret: string;
  sandbox_mode: string;
}

export interface IStripeAndRazorpay {
  key: string;
  title: string;
  secret: string;
  status: number | boolean;
}

export interface IMollie {
  status: number | boolean;
  title: string;
  secret_key: string;
}

export interface ICOD {
  title: string;
  status: number | boolean;
}

export interface IPhonepe {
  status: number | boolean;
  title: string;
  merchant_id: string;
  salt_Key: string;
  salt_index: string;
  sandbox_mode: string;
}

export interface IInstamojo {
  status: number | boolean;
  title: string;
  client_id: string;
  client_secret: string;
  salt_key: string;
  sandbox_mode: string;
}

export interface ICcavenue {
  status: number | boolean;
  title: string;
  merchant_id: string;
  working_key: string;
  access_code: string;
  sandbox_mode: number | boolean;
}

export interface IBkash {
  status: number | boolean;
  title: string;
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
  sandbox_mode: number | boolean;
}

export interface IFlutterWave {
  status: number | boolean;
  title: string;
  public_key: string;
  secret_key: string;
  secret_hash: string;
  sandbox_mode: number | boolean;
}

export interface IPaystack {
  status: number | boolean;
  title: string;
  public_key: string;
  secret_key: string;
  sandbox_mode: number | boolean;
}

export interface ISslcommerz {
  status: number | boolean;
  title: string;
  store_id: string;
  store_password: string;
  sandbox_mode: number | boolean;
}

export interface IBankTransfer {
  status: number | boolean;
  title: string;
}

export interface IMaintenance {
  title: string;
  maintenance_mode: boolean;
  maintenance_image_id: number;
  maintenance_image: IAttachment;
  description: string;
  start_date: string;
  end_date: string;
}

export interface IAppSetting {
  id?: number;
  values: IAppValues;
}

export interface IAppValues {
  home_banner: IFeaturedBanners;
  categories_list: ICategoriesIconList;
  offer_products: IProductSection;
  section_1_products: IProductSection;
  section_2_products: IProductSection;
  coupons: ICoupons;
  section_3_products: IProductSection;
  seller: ISeller;
  brands: IBrands;
  blogs: IBlogs;
  navigate_button: INavigateButton;
  products_ids: number[];
}

export interface ISeller {
  status: boolean;
  title: number[];
  sub_title: number[];
  store_ids: number[];
}

export interface IBlogs {
  title: string;
  sub_title?: string;
  status: boolean;
  blog_ids: number[];
}

export interface IBrands {
  status: boolean;
  title: string;
  brand_ids: number[];
}

export interface INavigateButton {
  status: boolean;
  title: string;
  button_text: string;
  path: string;
}

export interface ICoupons {
  status: boolean;
  title: string;
  sub_title: string;
  coupon_ids: number[];
}

export interface IAnalytics {
  facebook_pixel: {
    status: number | boolean;
    pixel_id: string;
  };
  google_analytics: {
    status: number | boolean;
    measurement_id: string;
  };
}

export interface IProductSection {
  title: string;
  sub_title?: string;
  product_ids: number[];
  status: boolean;
}
