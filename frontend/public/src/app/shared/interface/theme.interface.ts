import { PaginateModel } from './core.interface';

export interface ThemesModel extends PaginateModel {
  data: Themes[];
}

export interface Themes {
  id: number;
  name: string;
  slug: string;
  image: string;
  status: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BannerLink {
  image_url: string;
  redirection_type: string;
  link: string;
}

export interface GadgetHomeSelection {
  main_banner: BannerLink;
  sub_banner_1: BannerLink;
  sub_banner_2: BannerLink;
  four_column_banner: ColumnBanner;
}

export interface SaleProduct {
  status?: boolean;
  title?: string;
  sub_title?: string;
  product_ids: number[];
  button_text?: string;
  button_link?: string;
}

export interface CategoryProduct {
  status: boolean;
  title: string;
  product_ids: number[];
}

export interface TopProductByCategories {
  status: boolean;
  categories_product: CategoryProduct[];
}

export interface CategoryList {
  status: boolean;
  category_ids: number[];
}
export interface ColumnBanner {
  status: boolean;
  banner_1?: BannerLink;
  banner_2?: BannerLink;
  banner_3?: BannerLink;
  banner_4?: BannerLink;
  banner_5?: BannerLink;
  banner_6?: BannerLink;
  banner_7?: BannerLink;
  banner_8?: BannerLink;
}

export interface Categories {
  status: boolean;
  title?: string;
  button_text?: string;
  button_link?: string;
  category_ids: number[];
}

export interface TabProductItem {
  tab: string;
  product_ids: number[];
}

export interface TabsProduct {
  title: string;
  button_text?: string;
  tabs: TabProductItem[];
  status: boolean;
}

export interface BannerWithTabsProduct {
  status: boolean;
  banner?: BannerLink;
  banner_top?: BannerLink;
  banner_bottom?: BannerLink;
  banner_portrait?: BannerLink;
  tabs_product: TabsProduct;
}

export interface OfferBanner extends BannerLink {
  status: boolean;
}

export interface Tags {
  status: boolean;
  title: string;
  tags_ids: number[];
}

export interface OffersProduct {
  status: boolean;
  title?: string;
  button_text?: string;
  button_link?: string;
  offers: BannerLink[];
}

export interface TrendingDealsBannerWithCategory {
  banner: BannerLink;
  category_ids: number[];
}

export interface TrendingTopTrending {
  title: string;
  button_text: string;
  button_link: string;
  product_ids: number[];
}

export interface TrendingDealsProduct {
  title: string;
  product_ids: number[];
}

export interface TrendingDealsSection {
  status: boolean;
  banner_with_category: TrendingDealsBannerWithCategory;
  top_trending: TrendingTopTrending;
  deals_product: TrendingDealsProduct;
}

export interface GadgetTheme {
  home_selection: GadgetHomeSelection;
  sale_product: SaleProduct;
  top_product_by_categories: TopProductByCategories;
  two_column_banner: ColumnBanner;
  categories: Categories;
  banner_with_tabs_product: BannerWithTabsProduct;
  offer_banner: OfferBanner;
  tags: Tags;
  offers_product: OffersProduct;
  trending_deals_section: TrendingDealsSection;
  newsletter?: { status: boolean };
  slug: string;
  products_ids?: number[];
}

export interface MegaMartTheme {
  categories: Categories;
  home_selection: HomeSelectionMegaMart;
  deal_product: SaleProduct;
  sale_banner: SectionBanner;
  most_wishes_product: SaleProduct;
  most_wishes_banner: SectionBanner;
  summer_sale_banner: SectionBanner;
  feature_brand_banner: FeatureBrandBanner;
  sports_healthcare_categories: SaleProduct;
  sports_healthcare_categories_banner: SectionBanner;
  product_section: ProductSection;
  beauty_food_product: SaleProduct;
  beauty_food_product_banner: SectionBanner;
  browsing_history: BrowsingHistory;
  tags: Tags;
  banner_section: BannerSection;
  slug: string;
  products_ids?: number[];
  services: Services;
}

export interface BannerSection {
  banner: BannerLink[];
}
export interface BrowsingHistory {
  status: boolean;
  title: string;
  sub_title?: string;
  category_ids?: number[];
  button_text?: string;
  button_link?: string;
}
export interface ProductSection {
  more_item: SaleProduct;
  shopping_continue: SaleProduct;
  new_collection: Categories;
  electronic_device: Categories;
}

export interface FeatureBrandBanner {
  status: boolean;
  title: string;
  feature_banner: BannerLink[];
  button_text?: string;
  button_link?: string;
}

export interface SectionBanner {
  banner: BannerLink;
}

export interface HomeSelectionMegaMart {
  banner_1: BannerLink;
  banner_2: BannerLink;
  banner_3: BannerLink;
  banner_4: BannerLink;
}
export interface OrganicStoreHomeSection {
  banner_1: BannerLink;
  banner_2: BannerLink;
}

export interface OfferProduct {
  status: boolean;
  product_id: number;
}

export interface LeftBannerSection {
  categories?: CategoryList;
  banner_1: BannerLink;
  banner_2: BannerLink;
  banner_3: BannerLink;
  banner_4: BannerLink;
  banner_5: BannerLink;
  banner_6: BannerLink;
  banner_7: BannerLink;
  banner_8: BannerLink;
  offer_product: OfferProduct;
}

export interface Services {
  status: boolean;
  service_ids: number[];
  banner?: BannerLink;
}

export interface BestsellersProductsColumn {
  banner: BannerLink;
  products_ids: number[];
}
export interface BestsellersProducts {
  status: boolean;
  title: string;
  products: BestsellersProductsColumn[];
}
export interface Brands {
  status: boolean;
  brand_ids: number[];
}

export interface RightProductSection {
  services: Services;
  featured_products: CategoryProduct;
  full_width_banner: BannerLink;
  bestsellers_products: BestsellersProducts;
  week_bestsellers_products: BestsellersProducts;
  three_column_banner: ColumnBanner;
  brand: Brands;
}

export interface OrganicStoreMainContent {
  left_banner_section: LeftBannerSection;
  right_product_section: RightProductSection;
}
export interface OrganicTheme {
  home_section: OrganicStoreHomeSection;
  main_content: OrganicStoreMainContent;
  products_ids: number[];
  slug: string;
}

export interface BabyShopRightBanner {
  top_banner?: BannerLink;
  bottom_banner?: BannerLink;
}

export interface BabyShopHomeSection {
  left_banner?: BannerLink;
  center_banner?: BannerLink;
  right_banner?: BabyShopRightBanner;
}

export interface BannersSlider {
  status: boolean;
  banners: BannerLink[];
}

export interface BannerWithProduct {
  status: boolean;
  title: string;
  button_text?: string;
  button_link?: string;
  banner: BannerLink;
  product_ids: number[];
}
export interface BabyShopTheme {
  home_section: BabyShopHomeSection;
  left_banner: BannerLink;
  arrivals_product: SaleProduct;
  full_width_banner?: BannerLink;
  category_section?: CategoryList;
  three_column_banner: ColumnBanner;
  banner_with_tabs_product?: BannerWithTabsProduct;
  banners_slider: BannersSlider;
  category_section_two?: CategoryList;
  discount_banner?: BannerLink;
  feature_product?: BannerWithProduct;
  brand?: Brands;
  products_ids: number[];
  slug: string;
}

export interface TodayDeal {
  deal_products: SaleProduct;
  full_width_banner: BannerLink;
}

export interface CategoryWithBanner {
  status: boolean;
  title: string;
  category_ids: number[];
  banner: BannerLink;
}

export interface TopBottomBanner {
  top_banner: BannerLink;
  bottom_banner: BannerLink;
}
export interface OfferSection {
  title: string;
  button_text: string;
  button_link: string;
  banner: BannerLink[];
}

export interface StyleTechTheme {
  home_section: BabyShopHomeSection;
  service_with_banner: Services;
  category_section: BrowsingHistory;
  today_deal: TodayDeal;
  category_with_banner: CategoryWithBanner;
  deals_product: SaleProduct;
  right_banner: TopBottomBanner;
  banner_with_tabs_product: BannerWithTabsProduct;
  banner_section: BannerLink;
  tabs_with_banner_product: BannerWithTabsProduct;
  tab_product_right_banner: TopBottomBanner;
  tags: Tags;
  offer_section: OfferSection;
  recent_view_product: SaleProduct;
  products_ids: number[];
  slug: string;
}

export interface ElectroHomeSelection {
  main_banner: BannerLink;
  sub_banner_1: BannerLink;
  sub_banner_2: BannerLink;
  sub_banner_3: BannerLink;
}

export interface BestSellerBanner {
  banner_1: BannerLink;
  banner_2: BannerLink;
}
export interface ElectroTheme {
  categories: Categories;
  home_selection: ElectroHomeSelection;
  daily_deal: SaleProduct;
  banner_1: BannerLink;
  banner_2: BannerLink;
  browse_by_categories: Categories;
  recommendations_tabs_product: BannerWithTabsProduct;
  recommendations_for_you_tabs_product: BannerWithTabsProduct;
  best_seller: SaleProduct;
  best_seller_banner: BestSellerBanner;
  feature_brand_banner: FeatureBrandBanner;
  banner_with_tabs_product: BannerWithTabsProduct;
  new_trending_laptop: FeatureBrandBanner;
  buy_guide_choice: SaleProduct;
  offer_section_banner: BestSellerBanner;
  tags: Tags;
  products_ids: number[];
  slug: string;
}
