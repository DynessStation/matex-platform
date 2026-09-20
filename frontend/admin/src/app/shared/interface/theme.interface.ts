import { IPaginateModel } from './core.interface';

export interface IThemesModel extends IPaginateModel {
  data: IThemes[];
}

export interface IThemes {
  id: number;
  name: string;
  slug: string;
  image: string;
  status: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IHomeBanner {
  status: boolean;
  background_image: string;
  banners: IBanners[];
}

export interface IBanners {
  title?: string;
  description?: string;
  tag?: string;
  button_text: string;
  offer?: string;
  redirect_link: IRedirectLink;
  image_url: string;
  status: boolean;
}
export interface IRedirectLink {
  link_type: string;
  link: string | number;
  product_ids: number;
}

export interface IFeaturedBannersFashionOne {
  banner_1?: IFeaturedBanner;
  banner_2: IFeaturedBanner;
}
export interface IFeaturedBanner {
  redirect_link?: IRedirectLink;
  image_url: string;
  tag?: string;
  title?: string;
  sub_title?: string;
  status: boolean;
}

export interface IProductList {
  tag?: string;
  title: string;
  sub_title?: string;
  description?: string;
  image_url?: string;
  product_ids: number[];
  status?: boolean;
}

export interface ILink {
  redirect_link: IRedirectLink;
  image_url: string;
}

export interface IParallaxBanner {
  main_title: string;
  title: string;
  sub_title: string;
  description?: string;
  image_url: string;
  status: boolean;
}

export interface IProductTabSection {
  tag?: string;
  title?: string;
  sub_title?: string;
  image_url?: string;
  description?: string;
  category_ids: number[];
  status: boolean;
}

export interface IService {
  status: boolean;
  banners: IBanners[];
}

export interface ISocialMedia {
  title?: string;
  status: boolean;
  banners: IBanners[];
}

export interface IBrands {
  brand_ids: number[];
  status: boolean;
}

export interface IFeaturedBanners {
  title?: string;
  status: boolean;
  banners: IBanners[];
}

export interface IMainContent {
  status: boolean;
  sidebar: ISidebar;
  section1_products: IProductSection;
  section2_categories_list: ICategoriesSection;
  section3_two_column_banners: ITwoBanners;
  section4_products: IProductSection;
  section5_coupons: IFullWidthBanners;
  section6_two_column_banners: ITwoBanners;
  section7_products: IProductSection;
  section8_full_width_banner: IFullWidthBanners;
  section9_featured_blogs: IBlogSection;
}

export interface ISidebar {
  status: boolean;
  categories_icon_list: ICategoriesIconList;
  left_side_banners: ITwoBanners;
  sidebar_products: ISidebarProducts;
}

export interface ICategoriesIconList {
  title: string;
  description?: string;
  category_ids: number[];
  status: boolean;
}

export interface ITwoBanners {
  status: boolean;
  banner_1: ILink;
  banner_2: ILink;
}

export interface ISidebarProducts {
  tag?: string;
  title: string;
  product_ids: number[];
  status: boolean;
}

export interface IProductSection {
  title: string;
  description?: string;
  product_ids: number[];
  status: boolean;
}

export interface ICategoriesSection {
  title: string;
  description: string;
  category_ids?: number[];
  image_url: string;
  status: boolean;
}

export interface IFullWidthBanners {
  redirect_link: IRedirectLink;
  image_url: string;
  status: boolean;
}

export interface IBlogSection {
  tag?: string;
  title: string;
  sub_title?: string;
  description?: string;
  status: boolean;
  blog_ids: number[];
}

export interface INewsLetter {
  title: string;
  sub_title: string;
  image_url: string;
  status: boolean;
}

// Gradient Interface
export interface IGradient {
  id: number;
  content: IGradientContent;
  slug: string;
}

export interface IGradientContent {
  home_banner: IHomeBanner;
  categories_1: IProductCategoryFashionFour;
  offer_banner: IHomeBanner;
  category_product: IProductTabSection;
  categories_2: IProductCategoryFashionFour;
  products_list: IProductList;
  parallax_banner: IParallaxBannerGradient;
  coupons: IGradientCoupons;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IGradientCoupons {
  status: boolean;
  coupon_ids: number[];
}

export interface IParallaxBannerGradient {
  banner_1?: IParallaxBanner;
  banner_2: IParallaxBanner;
}

// IFashionOne Interface
export interface IFashionOne {
  id: number;
  content: IFashionOneContent;
  slug: string;
}

export interface IFashionOneContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionOne;
  products_list: IProductList;
  banner: IFeaturedBanner;
  category_product: IProductTabSection;
  services: IService;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Fashion Two Interface
export interface IFashionTwo {
  id: number;
  content: IFashionTwoContent;
  slug: string;
}

export interface IFashionTwoContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionTwo;
  category_product: IProductTabSection;
  full_banner: IFeaturedBanner;
  slider_products: ISliderProduct;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IFeaturedBannersFashionTwo {
  status?: boolean;
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
  banner_3: IFeaturedBanner;
  banner_4: IFeaturedBanner;
}

export interface ISliderProduct {
  status: boolean;
  product_slider_1: IProductSection;
  product_slider_2: IProductSection;
  product_slider_3: IProductSection;
  product_slider_4: IProductSection;
}

// Fashion Three Interface
export interface IFashionThree {
  id: number;
  content: IContentFashionThree;
  slug: string;
}

export interface IContentFashionThree {
  home_banner: IHomeBanner;
  products_list: IProductList;
  full_banner: IFeaturedBanner;
  category_product: IProductTabSection;
  brand: IBrands;
  products_ids: number[];
}

// Fashion Four Interface
export interface IFashionFour {
  id: number;
  content: IFashionFourContent;
  slug: string;
}

export interface IFashionFourContent {
  home_banner: IHomeBanner;
  offer_banner_1: IFeaturedBannersFashionFour;
  products_list: IProductListFashionFour;
  offer_banner_2: IParallaxBannerFashionFour;
  brand: IBrands;
  products_ids: number[];
}

export interface IFeaturedBannersFashionFour {
  status?: boolean;
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
  banner_3: IFeaturedBanner;
}

export interface IProductListFashionFour {
  status: boolean;
  categories: IProductCategoryFashionFour;
  products: IProductList;
}

export interface IProductCategoryFashionFour {
  title?: string;
  category_ids: number[];
  status: boolean;
}

export interface IParallaxBannerFashionFour {
  image_url: string;
  status: boolean;
}

// Fashion Five Interface
export interface IFashionFive {
  id: number;
  content: IFashionFiveContent;
  slug: string;
}

export interface IFashionFiveContent {
  home_banner: IHomeBannerFashionFive;
  categories: IProductCategoryFashionFour;
  deals_banner: IFeaturedBanner;
  category_product: IProductTabSection;
  products_list: IProductList;
  offer_banner: IFeaturedBanner;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IHomeBannerFashionFive {
  status: boolean;
  image_url: string;
  redirect_link: IRedirectLink;
}

export interface IKnockOutDealFashionFive {
  title?: string;
  main_banner: IFeaturedBanner;
  grid_banner_1: IFeaturedBanner;
  grid_banner_2: IFeaturedBanner;
  grid_banner_3: IFeaturedBanner;
}

export interface IBankWalletOffers {
  title: string;
  status: boolean;
  offers: IOffer[];
}

export interface IOffer {
  coupon_code: string;
  image_url: string;
  redirect_link: IRedirectLink;
  status: boolean;
}

export interface IProductWithDeals {
  title: string;
  status: boolean;
  products_list: IProductSection;
  deal_of_days: IDealOfDays;
}

export interface IDealOfDays {
  title: string;
  status: boolean;
  image_url: string;
  label: string;
  deals: IDeal[];
}

export interface IDeal {
  offer_title: string;
  product_id: number;
  status: boolean;
  end_date: string;
}

export interface IServicesBanner {
  status: boolean;
  services: IServices[];
}

export interface IServices {
  title: string;
  sub_title: string;
  status: boolean;
  image_url: string;
}

// Fashion Six Interface
export interface IFashionSix {
  id: number;
  content: IFashionSixContent;
  slug: string;
}

export interface IFashionSixContent {
  home_banner: IHomeBanner;
  offer_banner: IBannerFashionSix;
  products_list_1: IProductList;
  product_banner: ISliderProductFashionSix;
  products_list_2: IProductListFashionSix;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IBannerFashionSix {
  status: boolean;
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
  banner_3: IFeaturedBanner;
  banner_4: IFeaturedBanner;
  banner_5: IFeaturedBanner;
  banner_6: IFeaturedBanner;
}

export interface ISliderProductFashionSix {
  status: boolean;
  image_url: string;
  product_slider_1: IProductSection;
}

export interface IProductListFashionSix {
  status: boolean;
  products: IProductList;
  right_panel: IRightPanelFashionSix;
}

export interface IRightPanelFashionSix {
  image_url: string;
  status: boolean;
}

// Fashion 7 Interface
export interface IFashionSeven {
  id: number;
  content: IFashionSevenContent;
  slug: string;
}

export interface IFashionSevenContent {
  home_banner: IHomeBannerFashionFive;
  featured_banners: IBannerFashionSeven;
  products_list_1: IProductListFashionSeven;
  product_banner: IParallaxBannerFashionSeven;
  products_list_2: IProductList2FashionSeven;
  offer_banner: IBannerFashionSeven;
  brand: IBrands;
  products_ids: number[];
}

export interface IBannerFashionSeven {
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
  banner_3?: IFeaturedBanner;
}

export interface IProductListFashionSeven {
  title: string;
  tag?: string;
  description: string;
  category_id: number[];
  more_button: boolean;
  button_text: string;
  redirect_link: IRedirectLink;
  main_title?: string;
  image_url?: string;
  status?: boolean;
}

export interface IParallaxBannerFashionSeven {
  image_url: string;
  product_ids: number[];
  status: string;
}

export interface IProductList2FashionSeven {
  status: boolean;
  image_url?: string;
  left_panel: IProductListFashionSeven;
  products: IFashionSevenProducts;
}

export interface IFashionSevenProducts {
  product_ids: number[];
}

// Furniture One Interface
export interface IFurnitureOne {
  id: number;
  content: IFurnitureOneContent;
  slug: string;
}

export interface IFurnitureOneContent {
  home_banner: IHomeBanner;
  offer_banner: IBannerFashionSeven;
  category_product: IProductTabSection;
  full_banner: IFeaturedBanner;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

// Furniture Two Interface
export interface IFurnitureTwo {
  id: number;
  content: IFurnitureTwoContent;
  slug: string;
}

export interface IFurnitureTwoContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionFour;
  categories_icon_list: IProductCategoryFashionFour;
  products_list_1: IProductList;
  grid_banner: IHomeBanner;
  product_list_2: IProductListFurnitureTwo;
  brand: IBrands;
  social_media: ISocialMedia;
  products_ids: number[];
}

export interface IBannerFurnitureTwo {
  status: boolean;
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
  banner_3: IFeaturedBanner;
  banner_4: IFeaturedBanner;
  banner_5: IFeaturedBanner;
  banner_6: IFeaturedBanner;
}

export interface IProductListFurnitureTwo {
  status: boolean;
  products: IFurnitureTwoProducts;
  right_panel: IProductSection;
}

export interface IFurnitureTwoProducts {
  product_item: IFashionSevenProducts;
  product_banner: IFurnitureTwoProductBanner;
}

export interface IFurnitureTwoProductBanner {
  status?: string;
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
}

// Furniture Dark Interface
export interface IFurnitureDark {
  id: number;
  content: IFurnitureDarkContent;
  slug: string;
}

export interface IFurnitureDarkContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionFour;
  products_list_1: IProductList;
  categories_icon_list: IProductCategoryFashionFour;
  banner: IFeaturedBannersFashionFour;
  product_list_2: IProductListFurnitureDark;
  services: IService;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

export interface IProductListFurnitureDark {
  status: boolean;
  left_panel: IFurnitureDarkLeftPanel;
  products: IFashionSevenProducts;
}

export interface IFurnitureDarkLeftPanel {
  image_url: string;
  status: boolean;
  redirect_link: IRedirectLink;
}

// Electronic One Interface
export interface IElectronicOne {
  id: number;
  content: IElectronicOneContent;
  slug: string;
}

export interface IElectronicOneContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionFour;
  category_product: IProductTabSection;
  brand: IBrands;
  products_ids: number[];
}

// Electronic Two Interface
export interface IElectronicTwo {
  id: number;
  content: IElectronicTwoContent;
  slug: string;
}

export interface IElectronicTwoContent {
  home_banner: IFeaturedBannersFashionFour;
  offer_banner: IFeaturedBannersFashionFour;
  category_product: IProductTabSection;
  brand: IBrands;
  products_ids: number[];
}

// Electronic Three Interface
export interface IElectronicThree {
  id: number;
  content: IElectronicThreeContent;
  slug: string;
}

export interface IElectronicThreeContent {
  home_banner: IHomeBanner;
  services: IService;
  products_list_1: IProductList;
  category_product_1: IProductListFashionFour;
  banner: IKnockOutDealFashionFive;
  category_product_2: IProductTabSection;
  brand: IBrands;
  offer_banner_1: IHomeBannerFashionFive;
  offer_banner_2: IFeaturedBannersFashionOne;
  products_ids: number[];
}

// MarketplaceOne Interface
export interface IMarketplaceOne {
  id: number;
  content: IMarketplaceOneContent;
  slug: string;
}

export interface IMarketplaceOneContent {
  home_banner: IHomeBanner;
  offer_banner_1: IFeaturedBannersFashionTwo;
  product_list_1: IProductList;
  offer_banner_2: IHomeBannerFashionFive;
  services: IService;
  social_media: ISocialMedia;
  category_product: IMarketPlaceOneSliderProduct;
  brand: IBrands;
  products_ids: number[];
}

export interface IMarketPlaceOneSliderProduct {
  status: boolean;
  left_panel: IMarketPlaceOneProductSlider;
  right_panel: IMarketPlaceOneRightPanel;
}

export interface IMarketPlaceOneRightPanel {
  product_category: IProductTabSection;
  product_banner: IFullWidthBanners;
}

export interface IMarketPlaceOneProductSlider {
  title: string;
  product_ids: number[];
  status: boolean;
}

// MarketplaceTwo Interface
export interface IMarketplaceTwo {
  id: number;
  content: IMarketplaceTwoContent;
  slug: string;
}

export interface IMarketplaceTwoContent {
  home_banner: IHomeBanner;
  offer_banner_1: IFeaturedBannersFashionTwo;
  products_list_1: IProductList;
  products_list_2: IProductList;
  products_list_3: IMarketPlaceOneProductSlider;
  products_list_4: IMarketPlaceOneProductSlider;
  offer_banner_2: IShoesBanner;
  slider_products: ISliderProduct;
  services: IService;
  products_list_5: IProductList;
  products_list_6: IProductList;
  offer_banner_3: IFullWidthBanners;
  brand: IBrands;
  products_ids: number[];
}

// MarketplaceThree Interface
export interface IMarketplaceThree {
  id: number;
  content: IMarketplaceThreeContent;
  slug: string;
}

export interface IMarketplaceThreeContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionFour;
  categories_products: IMarketPlaceThreeCategoriesProducts;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

export interface IMarketPlaceThreeCategoriesProducts {
  status: boolean;
  left_panel: IMarketPlaceThreeLeftContent;
  right_panel: IMarketPlaceThreeRightContent;
}

export interface IMarketPlaceThreeLeftContent {
  categories: IProductCategoryFashionFour;
  products_list: ISidebarProducts;
  banner: IFeaturedBanner;
}

export interface IMarketPlaceThreeRightContent {
  products_list: ISidebarProducts;
  offer_banner: IShoesBanner;
  category_product: IProductTabSection;
}

// MarketplaceFour Interface
export interface IMarketplaceFour {
  id: number;
  content: IMarketplaceFourContent;
  slug: string;
}

export interface IMarketplaceFourContent {
  home_banner: IHomeBanner;
  services: IService;
  products_list_1: ISidebarProducts;
  product_banner_1: IMarketplaceFourProductBanner;
  slider_products: ISliderProductFashionSix;
  products_list_2: ISidebarProducts;
  product_banner_2: IMarketplaceFourBannerProduct;
  product_banner_3: IMarketplaceFourProductBanner;
  products_list_3: ISidebarProducts;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IMarketplaceFourBannerProduct {
  status: boolean;
  left_panel: IJewelryTwoProductBannerPanel;
  center_panel: IFeaturedBannersFashionOne;
  right_panel: IJewelryTwoProductBannerPanel;
}

export interface IMarketplaceFourProductBanner {
  status?: boolean;
  left_panel: IFullWidthBanners;
  right_panel: IProductsListRightContent;
}

export interface IProductsListRightContent {
  product_ids: number[];
  status: boolean;
}

// VegetablesDemoOne Interface
export interface IVegetablesOne {
  id: number;
  content: IVegetablesOneContent;
  slug: string;
}

export interface IVegetablesOneContent {
  home_banner: IHomeBanner;
  services: IService;
  products_list_1: ISidebarProducts;
  full_banner: IFeaturedBanner;
  products_list_2: ISidebarProducts;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

// VegetablesDemoTwo Interface
export interface IVegetablesTwo {
  id: number;
  content: IVegetablesTwoContent;
  slug: string;
}

export interface IVegetablesTwoContent {
  home_banner: IHomeBanner;
  services: IService;
  products_list_1: ISidebarProducts;
  banner: IHomeBanner;
  offer_banner: IFullWidthBanners;
  products_list_2: ISidebarProducts;
  category_product: IProductTabSection;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

// VegetablesDemoThree Interface
export interface IVegetablesThree {
  id: number;
  content: IVegetablesThreeContent;
  slug: string;
}

export interface IVegetablesThreeContent {
  sidebar_category: IVegetableThreeCategory;
  home_banner: IHomeBanner;
  services: IService;
  category_product: IProductTabSection;
  banner: IHomeBanner;
  products_list: ISidebarProducts;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

export interface IVegetableThreeCategory {
  category_ids: number[];
  status: boolean;
}
// VegetablesDemoFour Interface
export interface IVegetablesFour {
  id: number;
  content: IVegetablesFourContent;
  slug: string;
}

export interface IVegetablesFourContent {
  home_banner: IHomeBannerFashionFive;
  categories: IProductCategoryFashionFour;
  offer_banner_1: IHomeBanner;
  products_list_1: IProductList;
  products_list_2: IProductList;
  offer_banner_2: IHomeBanner;
  products_list_3: IProductList;
  services: IService;
  products_list_4: IProductList;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

// jewelryOne Interface
export interface IJewelryOne {
  id: number;
  content: IJewelryOneContent;
  slug: string;
}

export interface IJewelryOneContent {
  home_banner: IHomeBanner;
  categories: IProductCategoryFashionFour;
  products_list: IProductList;
  services: IService;
  full_banner: IFeaturedBanner;
  category_product: IProductTabSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// JewelryTwo Interface
export interface IJewelryTwo {
  id: number;
  content: IJewelryTwoContent;
  slug: string;
}

export interface IJewelryTwoContent {
  home_banner: IHomeBanner;
  offer_banner_1: IHomeBanner;
  categories: IProductCategoryFashionFour;
  products_list_1: IProductList;
  products_list_2: IProductList;
  banner: IFeaturedBanner;
  services: IService;
  product_banner: IMarketplaceFourBannerProduct;
  social_media: ISocialMedia;
  offer_banner_2: IHomeBannerFashionFive;
  brand: IBrands;
  products_ids: number[];
}

export interface IJewelryCategoriesTwo {
  title: string;
  description: string;
  category_ids: number[];
  status: boolean;
}

export interface IJewelryTwoProductBanner {
  status: boolean;
  left_panel: IJewelryTwoProductBannerPanel;
  center_panel: IFeaturedBanner;
  right_panel: IJewelryTwoProductBannerPanel;
}

export interface IJewelryTwoProductBannerPanel {
  product_ids: number[];
  tag?: string;
  title: string;
  status: boolean;
}

// JewelryThree Interface
export interface IJewelryThree {
  id: number;
  content: IJewelryThreeContent;
  slug: string;
}

export interface IJewelryThreeContent {
  home_banner: IHomeBanner;
  services: IService;
  offer_banner: IFeaturedBannersFashionFour;
  products_list: IProductList;
  full_banner: IFeaturedBanner;
  category_product: IProductCategoryFashionFour;
  product_banner: IJewelryTwoProductBanner;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Bag Interface
export interface IBag {
  id: number;
  content: IBagContent;
  slug: string;
}

export interface IBagContent {
  home_banner: IHomeBanner;
  category_product: IProductTabSection;
  category: IProductTabSection;
  full_banner: IFeaturedBanner;
  product_banner: IBagProductList;
  services: IService;
  grid_banner: IHomeBanner;
  products_list: IProductList;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IBagProductList {
  status: boolean;
  left_content: IJewelryTwoProductBannerPanel;
  center_content: IJewelryTwoProductBannerPanel;
  right_content: IJewelryTwoProductBannerPanel;
}

export interface IParallaxBannerBags {
  main_title: string;
  title: string;
  sub_title: string;
  description?: string;
  image_url: string;
  redirect_link: IRedirectLink;
  button_text: string;
  status: boolean;
}

// watch Interface
export interface IWatch {
  id: number;
  content: IWatchContent;
  slug: string;
}

export interface IWatchContent {
  home_banner: IHomeBanner;
  brand: IBrands;
  offer_banner_1: IFeaturedBanner;
  categories: IProductCategoryFashionFour;
  category_product: IProductTabSection;
  products_list_1: IProductList;
  offer_banner_2: IFeaturedBannersFashionFour;
  products_list_2: IProductList;
  featured_blogs: IBlogSection;
  services: IService;
  social_media: ISocialMedia;
  products_ids: number[];
}

// Medical Interface
export interface IMedical {
  id: number;
  content: IMedicalContent;
  slug: string;
}

export interface IMedicalContent {
  home_banner: IHomeBanner;
  categories: IProductCategoryFashionFour;
  brand: IBrands;
  category_product: IProductTabSection;
  featured_blogs: IBlogSection;
  products_ids: number[];
  services: IService;
  column_banner_product: IMedicalProductBanner;
  offer_banner: IHomeBanner;
}

export interface IMedicalProductBanner {
  status: boolean;
  product_list_1: IJewelryTwoProductBannerPanel;
  offer_banner_1: IFullWidthBanners;
  product_list_2: IJewelryTwoProductBannerPanel;
  offer_banner_2: IFullWidthBanners;
}

// Perfume Interface
export interface IPerfume {
  //
  id: number;
  content: IPerfumeContent;
  slug: string;
}

export interface IPerfumeContent {
  home_banner: IHomeBannerFashionFive;
  offer_banner_1: IFeaturedBannersFashionTwo;
  category_product: IProductTabSection;
  parallax_banner: IParallaxBannerFashionSeven;
  product_list: IProductList2FashionSeven;
  offer_banner_2: IHomeBannerFashionFive;
  collection_banner: IHomeBannerFashionFive;
  brand: IBrands;
  products_ids: number[];
}

// Yoga Interface
export interface IYoga {
  id: number;
  content: IYogaContent;
  slug: string;
}

export interface IYogaContent {
  home_banner: IHomeBannerFashionFive;
  products_list_1: IProductList;
  products_list_2: IProductList;
  offer_banner_1: IFeaturedBannersFashionFour;
  offer_banner_2: IFeaturedBannersFashionFour;
  products_list_3: IProductList;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Christmas Interface
export interface IChristmas {
  id: number;
  content: IChristmasContent;
  slug: string;
}

export interface IChristmasContent {
  home_banner: IHomeBanner;
  offer_banner_1: IFeaturedBannersFashionOne;
  products_list: IProductList;
  offer_banner_2: IFeaturedBanner;
  category_product_1: IProductTabSection;
  offer_banner_3: IFeaturedBanner;
  category_product_2: IProductTabSection;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Bicycle Interface
export interface IBicycle {
  id: number;
  content: IBicycleContent;
  slug: string;
}

export interface IBicycleContent {
  home_banner: IHomeBanner;
  products_list: IProductList;
  category_product: IProductTabSection;
  offer_banner: IFeaturedBannersFashionOne;
  banner: IFullWidthBanners;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Marijuana Interface
export interface IMarijuana {
  id: number;
  content: IMarijuanaContent;
  slug: string;
}

export interface IMarijuanaContent {
  home_banner: IHomeBanner;
  services: IService;
  offer_banner: IShoesAboutBanner;
  details_section: IHomeBanner;
  products_list: IProductList;
  category_product: IProductTabSection;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

// Gym Interface
export interface IGymSection {
  id: number;
  content: IGymSectionContent;
  slug: string;
}

export interface IGymSectionContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionOne;
  products_list: IProductList;
  parallax_product: IGymParallaxProduct;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}
export interface IGymParallaxProduct {
  tag: string;
  title: string;
  description: string;
  product_ids: number[];
  image_url: string;
  status?: boolean;
}

// Tools Interface
export interface ITools {
  id: number;
  content: IToolsContent;
  slug: string;
}

export interface IToolsContent {
  home_banner: IHomeBanner;
  services: IService;
  categories: IJewelryCategoriesTwo;
  products_list_1: IProductList;
  products_list_2: IProductList;
  category_product: IMarketPlaceOneSliderProduct;
  brand: IBrands;
  products_ids: number[];
}

// Shoes Interface
export interface IShoes {
  id: number;
  content: IShoesContent;
  slug: string;
}

export interface IShoesContent {
  home_banner: IHomeBanner;
  categories_1: IProductCategoryFashionFour;
  about_banner: IShoesAboutBanner;
  products_list: IShoesProductList;
  categories_2: IProductTabSection;
  slider_products: ISliderProduct;
  attribute: IShoesAttribute;
  category_product: IProductTabSection;
  featured_blogs: IBlogSection;
  services: IService;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface IShoesAboutBanner {
  title: string;
  tag: string;
  collection_banner?: IShoesBanner;
  banner?: IShoesBanner;
  description?: string;
  status?: boolean;
}

export interface IShoesBanner {
  status: boolean;
  banner_1: IFeaturedBanner;
  banner_2: IFeaturedBanner;
}

export interface IShoesProductList {
  title: string;
  tag: string;
  product_ids: number[];
  status: boolean;
}

export interface IShoesAttribute {
  attribute_id: number;
  status: boolean;
}

// Books Interface
export interface IBooks {
  id: number;
  content: IBooksContent;
  slug: string;
}

export interface IBooksContent {
  home_banner: IHomeBanner;
  categories_1: IProductCategoryFashionFour;
  category_product: IProductTabSection;
  categories_2: IProductCategoryFashionFour;
  slider_products: IBooksSliderProduct;
  offer_banner: IFeaturedBannersFashionOne;
  products_list: IProductList;
  featured_blogs: IBlogSection;
  brand: IBrands;
  products_ids: number[];
}

export interface IBooksSliderProduct {
  tag: string;
  title: string;
  status: boolean;
  image_url: string;
  product_slider_1: IProductSection;
  product_slider_2: IProductSection;
  product_slider_3: IProductSection;
}

// Kids Interface
export interface IKids {
  id: number;
  content: IKidsContent;
  slug: string;
}

export interface IKidsContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionOne;
  products_list: IProductList;
  full_banner: IFeaturedBanner;
  slider_products: ISliderProduct;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Game Interface
export interface IGame {
  id: number;
  content: IGameContent;
  slug: string;
}

export interface IGameContent {
  home_banner: IHomeBanner;
  offer_banner_1: IFeaturedBannersFashionOne;
  category_product: IProductTabSection;
  offer_banner_2: IFeaturedBanner;
  products_list: IProductList;
  slider_products: ISliderProduct;
  parallax_banner: IParallaxBanner;
  brand: IBrands;
  products_ids: number[];
}

// Beauty Interface
export interface IBeauty {
  id: number;
  content: IBeautyContent;
  slug: string;
}

export interface IBeautyContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionOne;
  products_list_1: IProductList;
  product_video: IBeautyProductVideo;
  products_list_2: IProductList;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  about_us: IBeautyAboutUs;
  brand: IBrands;
  products_ids: number[];
}

export interface IBeautyProductVideo {
  title: string;
  tag: string;
  status: boolean;
  image_url: string;
  video_url: string;
}

export interface IBeautyAboutUs {
  title: string;
  description: string;
  image_url: string;
  services: IService;
  status: boolean;
}

// Left Sidebar Interface
export interface ISurfboard {
  id: number;
  content: SurfboardContent;
  slug: string;
}

export interface SurfboardContent {
  home_banner: IHomeBanner;
  categories: IProductCategoryFashionFour;
  products_list: IProductList;
  offer_banner: IHomeBanner;
  category_product: IProductTabSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// VideoSlider Interface
export interface IVideoSlider {
  id: number;
  content: IVideoSliderContent;
  slug: string;
}

export interface IVideoSliderContent {
  home_banner: IHomeBanner;
  collection_banner: IFeaturedBannersFashionFour;
  category_product: IProductTabSection;
  parallax_banner: IParallaxBanner;
  products_list: IProductList;
  services: IService;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Metro Interface
export interface IMetro {
  id: number;
  content: IMetroContent;
  slug: string;
}

export interface IMetroContent {
  home_banner: IHomeBanner;
  services: IService;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Goggles Interface
export interface IGoggles {
  id: number;
  content: IGogglesContent;
  slug: string;
}

export interface IGogglesContent {
  home_banner: IHomeBanner;
  services: IService;
  offer_banner: IFeaturedBannersFashionFour;
  products_list: IProductList;
  full_banner: IFeaturedBanner;
  category_product: IProductTabSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Flower Interface
export interface IFlower {
  id: number;
  content: IFlowerContent;
  slug: string;
}

export interface IFlowerContent {
  home_banner: IHomeBanner;
  offer_banner: IFeaturedBannersFashionOne;
  products_list_1: IProductList;
  category_product: IProductTabSection;
  products_list_2: IProductList;
  featured_blogs: IBlogSection;
  services: IService;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Nursery Interface
export interface INursery {
  id: number;
  content: INurseryContent;
  slug: string;
}

export interface INurseryContent {
  home_banner: IHomeBanner;
  products_list: IProductList;
  category_product: IProductTabSection;
  featured_blogs: IBlogSection;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

// Pets Interface
export interface IPets {
  id: number;
  content: IPetsContent;
  slug: string;
}

export interface IPetsContent {
  home_banner: IHomeBanner;
  brand: IBrands;
  offer_banner: IHomeBanner;
  products_list_1: IProductList;
  parallax_banner: IParallaxBanner;
  products_list_2: IProductList;
  featured_blogs: IBlogSection;
  products_ids: number[];
}

// Video Interface
export interface IVideo {
  id: number;
  content: IVideoContent;
  slug: string;
}

export interface IVideoContent {
  video: IVideoSection;
}

export interface IVideoSection {
  status: boolean;
  video_url: string;
}

// FullPage Interface
export interface IFullPage {
  id: number;
  content: IFullPageContent;
  slug: string;
}

export interface IFullPageContent {
  home_banner: IHomeBanner;
  products_ids: number[];
}

// Parallax Interface
export interface IParallax {
  id: number;
  content: IParallaxContent;
  slug: string;
}

export interface IParallaxContent {
  parallax_banner: IParallaxBannerParallax;
}

export interface IParallaxBannerParallax {
  status: boolean;
  banners: IParallaxBanner[];
}

// Digital Download
export interface IDigitalDownload {
  id: number;
  content: IDigitalDownloadContent;
  slug: string;
}

export interface IDigitalDownloadContent {
  home_banner: IDigitalHomeBanner;
  categories_icon_list: ICategoriesIconList;
  products_list: IProductList;
  products_list_2: IProductList2FashionSeven;
  category_product: IProductTabSection;
  featured_blogs: IBlogSection;
  products_ids: number[];
}

export interface IDigitalHomeBanner {
  status: boolean;
  title: string;
  description: string;
  background_image: string;
  sub_image_1: string;
  sub_image_2: string;
}

// Single Product Interface
export interface ISingleProduct {
  id: number;
  content: ISingleProductContent;
  slug: string;
}

export interface ISingleProductContent {
  home_banner: ISingleProductHomeBanner;
  services: ISingleProductServices;
  grid_banner: IFeaturedBannersFashionFour;
  product_video: ISingleProductVideo;
  single_product: IProductList;
  products_list: IProductList;
  testimonial: ITestimonial;
  social_media: ISocialMedia;
  brand: IBrands;
  products_ids: number[];
}

export interface ISingleProductHomeBanner {
  status: boolean;
  title: string;
  description: string;
  show_button: boolean;
  button_text: string;
  redirect_link: IRedirectLink;
  banner_image: string;
}

export interface ISingleProductServices {
  status: boolean;
  left_panel: ISingleProductLeftPanel;
  right_panel: IService;
}

export interface ISingleProductLeftPanel {
  title: string;
  description: string;
  status: boolean;
}

export interface ISingleProductVideo {
  status: boolean;
  image: string;
  video: string;
}

export interface ITestimonial {
  title: string;
  status: boolean;
  banners: ITestimonialBanner[];
}

export interface ITestimonialBanner {
  name: string;
  image_url: string;
  review: string;
  status: boolean;
}
