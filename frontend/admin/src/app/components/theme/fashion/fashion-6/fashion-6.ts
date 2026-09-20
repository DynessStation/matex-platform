import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, Renderer2, DOCUMENT } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Select2, Select2Data, Select2Module, Select2SearchEvent } from 'ng-select2-component';
import { Observable, Subject, debounceTime, forkJoin } from 'rxjs';

import { PageWrapper } from '../../../../shared/components/page-wrapper/page-wrapper';
import { Button } from '../../../../shared/components/ui/button/button';
import { FormFields } from '../../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../../shared/components/ui/image-upload/image-upload';
import { Link } from '../../../../shared/components/ui/link/link';
import { mediaConfig } from '../../../../shared/data/media-config';
import { HasPermissionDirective } from '../../../../shared/directive/has-permission.directive';
import { Params } from '../../../../shared/interface/core.interface';
import { IBanners, IFashionSix } from '../../../../shared/interface/theme.interface';
import { GetBlogsAction } from '../../../../shared/store/action/blog.action';
import { GetBrandsAction } from '../../../../shared/store/action/brand.action';
import { GetCategoriesAction } from '../../../../shared/store/action/category.action';
import { GetProductsAction } from '../../../../shared/store/action/product.action';
import {
  GetHomePageAction,
  UpdateHomePageAction,
} from '../../../../shared/store/action/theme.action';
import { BlogState } from '../../../../shared/store/state/blog.state';
import { BrandState } from '../../../../shared/store/state/brand.state';
import { CategoryState } from '../../../../shared/store/state/category.state';
import { ProductState } from '../../../../shared/store/state/product.state';
import { ThemeState } from '../../../../shared/store/state/theme.state';

@Component({
  selector: 'app-fashion-6',
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    Select2Module,
    HasPermissionDirective,
    NgbModule,
    PageWrapper,
    Button,
    FormFields,
    Link,
    ImageUpload,
  ],
  templateUrl: './fashion-6.html',
  styleUrl: './fashion-6.scss',
})
export class Fashion6 {
  private store = inject(Store);
  formBuilder = inject(FormBuilder);
  private renderer = inject(Renderer2);
  private document = inject<Document>(DOCUMENT);

  home_page$: Observable<IFashionSix> = inject(Store).select(ThemeState.homePage);
  product$: Observable<Select2Data> = inject(Store).select(ProductState.products);
  category$: Observable<Select2Data> = inject(Store).select(CategoryState.categories);
  blogs$: Observable<Select2Data> = inject(Store).select(BlogState.blogs);
  brand$: Observable<Select2Data> = inject(Store).select(BrandState.brands);

  public form: FormGroup;
  public page_data: IFashionSix;
  public active = 'home_banner';
  public banner = 1;
  public sliderProducts = 1;
  private search = new Subject<string>();
  public filter = {
    status: 1,
    search: '',
    paginate: 15,
    ids: '',
    with_union_products: 0,
    is_approved: 1,
  };
  public mediaConfig = mediaConfig;
  public isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
    this.store.dispatch(new GetHomePageAction({ slug: 'fashion_six' }));

    this.form = new FormGroup({
      content: new FormGroup({
        home_banner: new FormGroup({
          status: new FormControl(true),
          banners: new FormArray([]),
        }),
        offer_banner: new FormGroup({
          status: new FormControl(true),
          banner_1: new FormGroup({
            image_url: new FormControl(),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_2: new FormGroup({
            image_url: new FormControl(),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_3: new FormGroup({
            image_url: new FormControl(),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_4: new FormGroup({
            image_url: new FormControl(),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_5: new FormGroup({
            image_url: new FormControl(),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_6: new FormGroup({
            image_url: new FormControl(),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
        }),
        products_list_1: new FormGroup({
          tag: new FormControl(''),
          title: new FormControl(''),
          status: new FormControl(true),
          product_ids: new FormControl([]),
        }),
        product_banner: new FormGroup({
          status: new FormControl(true),
          image_url: new FormControl(''),
          product_slider_1: new FormGroup({
            title: new FormControl(),
            product_ids: new FormControl([]),
            status: new FormControl(true),
          }),
        }),
        products_list_2: new FormGroup({
          status: new FormControl(true),
          products: new FormGroup({
            tag: new FormControl(''),
            title: new FormControl(''),
            product_ids: new FormControl([]),
          }),
          right_panel: new FormGroup({
            image_url: new FormControl(''),
            status: new FormControl(false),
          }),
        }),
        featured_blogs: new FormGroup({
          title: new FormControl(''),
          tag: new FormControl(''),
          status: new FormControl(true),
          blog_ids: new FormControl([]),
        }),
        social_media: new FormGroup({
          title: new FormControl(''),
          status: new FormControl(true),
          banners: new FormArray([]),
        }),
        brand: new FormGroup({
          brand_ids: new FormControl(''),
          status: new FormControl(false),
        }),
        products_ids: new FormControl([]),
      }),
      slug: new FormControl('fashion_six'),
    });
  }

  ngOnInit() {
    const home_page$ = this.store.dispatch(new GetHomePageAction({ slug: 'fashion_six' }));
    const categories$ = this.store.dispatch(
      new GetCategoriesAction({ status: 1, type: 'product' }),
    );
    const blogs$ = this.store.dispatch(new GetBlogsAction({ status: 1 }));
    const brand$ = this.store.dispatch(new GetBrandsAction({ status: 1 }));

    forkJoin([home_page$, categories$, blogs$, brand$]).subscribe({
      complete: () => {
        this.store.select(ThemeState.homePage).subscribe({
          next: homePage => {
            if (homePage?.content?.products_ids) {
              this.filter['paginate'] =
                homePage?.content?.products_ids?.length >= 15
                  ? homePage?.content?.products_ids?.length
                  : 15;
              this.filter['ids'] = homePage?.content?.products_ids?.join();
              this.filter['with_union_products'] = homePage?.content?.products_ids?.length
                ? homePage?.content?.products_ids?.length >= 15
                  ? 0
                  : 1
                : 0;
            }
            this.store.dispatch(new GetProductsAction(this.filter)).subscribe({
              complete: () => {
                this.patchForm();
              },
            });
          },
        });
      },
    });

    this.search
      .pipe(debounceTime(300)) // Adjust the debounce time as needed (in milliseconds)
      .subscribe(inputValue => {
        this.store.dispatch(
          new GetProductsAction({ status: 1, is_approved: 1, paginate: 15, search: inputValue }),
        );
        this.renderer.addClass(this.document.body, 'loader-none');
      });
  }

  patchForm() {
    this.home_page$.subscribe(homePage => {
      this.page_data = homePage;
      if (homePage) {
        this.form.patchValue({
          content: {
            home_banner: {
              status: homePage?.content?.home_banner?.status,
            },
            offer_banner: {
              status: homePage?.content?.offer_banner?.status,
              banner_1: {
                image_url: homePage?.content?.offer_banner?.banner_1?.image_url,
                redirect_link: {
                  link: homePage?.content?.offer_banner?.banner_1?.redirect_link?.link,
                  link_type: homePage?.content?.offer_banner?.banner_1?.redirect_link?.link_type,
                  product_ids:
                    homePage?.content?.offer_banner?.banner_1?.redirect_link?.product_ids,
                },
              },
              banner_2: {
                image_url: homePage?.content?.offer_banner?.banner_2?.image_url,
                redirect_link: {
                  link: homePage?.content?.offer_banner?.banner_2?.redirect_link?.link,
                  link_type: homePage?.content?.offer_banner?.banner_2?.redirect_link?.link_type,
                  product_ids:
                    homePage?.content?.offer_banner?.banner_2?.redirect_link?.product_ids,
                },
              },
              banner_3: {
                image_url: homePage?.content?.offer_banner?.banner_3?.image_url,
                redirect_link: {
                  link: homePage?.content?.offer_banner?.banner_3?.redirect_link?.link,
                  link_type: homePage?.content?.offer_banner?.banner_3?.redirect_link?.link_type,
                  product_ids:
                    homePage?.content?.offer_banner?.banner_3?.redirect_link?.product_ids,
                },
              },
              banner_4: {
                image_url: homePage?.content?.offer_banner?.banner_4?.image_url,
                redirect_link: {
                  link: homePage?.content?.offer_banner?.banner_4?.redirect_link?.link,
                  link_type: homePage?.content?.offer_banner?.banner_4?.redirect_link?.link_type,
                  product_ids:
                    homePage?.content?.offer_banner?.banner_4?.redirect_link?.product_ids,
                },
              },
              banner_5: {
                image_url: homePage?.content?.offer_banner?.banner_5?.image_url,
                redirect_link: {
                  link: homePage?.content?.offer_banner?.banner_5?.redirect_link?.link,
                  link_type: homePage?.content?.offer_banner?.banner_5?.redirect_link?.link_type,
                  product_ids:
                    homePage?.content?.offer_banner?.banner_5?.redirect_link?.product_ids,
                },
              },
              banner_6: {
                image_url: homePage?.content?.offer_banner?.banner_6?.image_url,
                redirect_link: {
                  link: homePage?.content?.offer_banner?.banner_6?.redirect_link?.link,
                  link_type: homePage?.content?.offer_banner?.banner_6?.redirect_link?.link_type,
                  product_ids:
                    homePage?.content?.offer_banner?.banner_6?.redirect_link?.product_ids,
                },
              },
            },
            products_list_1: {
              tag: homePage?.content?.products_list_1?.tag,
              title: homePage?.content?.products_list_1?.title,
              status: homePage?.content?.products_list_1?.status,
              product_ids: homePage?.content?.products_list_1?.product_ids,
            },
            product_banner: {
              status: homePage?.content?.product_banner?.status,
              image_url: homePage?.content?.product_banner?.image_url,
              product_slider_1: {
                title: homePage?.content?.product_banner?.product_slider_1?.title,
                product_ids: homePage?.content?.product_banner?.product_slider_1?.product_ids,
                status: homePage?.content?.product_banner?.product_slider_1?.status,
              },
            },
            products_list_2: {
              status: homePage?.content?.products_list_2?.status,
              products: {
                tag: homePage?.content?.products_list_2?.products?.tag,
                title: homePage?.content?.products_list_2?.products?.title,
                product_ids: homePage?.content?.products_list_2?.products?.product_ids,
              },
              right_panel: {
                image_url: homePage?.content?.products_list_2?.right_panel?.image_url,
                status: homePage?.content?.products_list_2?.right_panel?.status,
              },
            },
            featured_blogs: {
              tag: homePage?.content?.featured_blogs?.tag,
              title: homePage?.content?.featured_blogs?.title,
              status: homePage?.content?.featured_blogs?.status,
              blog_ids: homePage?.content?.featured_blogs?.blog_ids,
            },
            social_media: {
              title: homePage?.content?.social_media?.title,
              status: homePage?.content?.social_media?.status,
            },
            brand: {
              brand_ids: homePage?.content?.brand?.brand_ids,
              status: homePage?.content?.brand?.status,
            },
            products_ids: homePage?.content?.products_ids,
          },
          slug: homePage?.slug,
        });

        this.homeBannersArray.clear();
        homePage?.content?.home_banner?.banners?.forEach((banner: IBanners) =>
          this.homeBannersArray.push(
            this.formBuilder.group({
              redirect_link: new FormGroup({
                link: new FormControl(banner?.redirect_link?.link),
                link_type: new FormControl(banner?.redirect_link?.link_type),
              }),
              status: new FormControl(banner?.status),
              image_url: new FormControl(banner?.image_url),
            }),
          ),
        );

        this.socialMediaArray.clear();
        homePage?.content?.social_media?.banners?.forEach((banner: IBanners) =>
          this.socialMediaArray.push(
            this.formBuilder.group({
              redirect_link: new FormGroup({
                link: new FormControl(banner?.redirect_link?.link),
                link_type: new FormControl(banner?.redirect_link?.link_type),
              }),
              status: new FormControl(banner?.status),
              image_url: new FormControl(banner?.image_url),
            }),
          ),
        );
      }
    });
  }

  getProducts(filter: Params) {
    this.filter['search'] = filter['search'];
    this.filter['ids'] = this.filter['search'].length
      ? ''
      : this.page_data?.content?.products_ids?.join();
    this.filter['paginate'] =
      this.page_data?.content?.products_ids?.length >= 15
        ? this.page_data?.content?.products_ids?.length
        : 15;
    this.store.dispatch(new GetProductsAction(this.filter));
    this.renderer.addClass(this.document.body, 'loader-none');
  }

  productDropdown(event: Select2) {
    if (event['innerSearchText']) {
      this.search.next('');
      this.getProducts(this.filter);
    }
  }

  searchProduct(event: Select2SearchEvent) {
    this.search.next(event.search);
  }

  get homeBannersArray(): FormArray {
    return this.form.get('content.home_banner.banners') as FormArray;
  }

  get socialMediaArray(): FormArray {
    return this.form.get('content.social_media.banners') as FormArray;
  }

  addHomeBanner(event: Event) {
    event.preventDefault();
    this.homeBannersArray.push(
      this.formBuilder.group({
        redirect_link: new FormGroup({
          link: new FormControl(''),
          link_type: new FormControl(''),
          product_ids: new FormControl(''),
        }),
        image_url: new FormControl(),
        status: new FormControl(true),
      }),
    );
  }

  addSocialMediaBanner(event: Event) {
    event.preventDefault();
    this.socialMediaArray.push(
      this.formBuilder.group({
        redirect_link: new FormGroup({
          link: new FormControl(''),
          link_type: new FormControl(''),
        }),
        image_url: new FormControl(),
        status: new FormControl(true),
      }),
    );
  }

  removeHomeBanner(index: number) {
    if (this.homeBannersArray.length <= 1) return;
    this.homeBannersArray.removeAt(index);
  }

  removeSocialMediaBanner(index: number) {
    if (this.socialMediaArray.length <= 1) return;
    this.socialMediaArray.removeAt(index);
  }

  selectHomeBannerArray(url: string, index: number) {
    this.homeBannersArray
      .at(index)
      .get('image_url')
      ?.setValue(url ? url : null);
  }

  selectSocialMediaImage(url: string, index: number) {
    this.socialMediaArray
      .at(index)
      .get('image_url')
      ?.setValue(url ? url : null);
  }

  selectImage(url: string, key: string) {
    this.form.get(key)?.setValue(url ? url : null);
  }

  // Merge Products Ids
  concatDynamicProductKeys(obj: IFashionSix): number[] {
    const result: number[] = [];

    function traverse(value: unknown): void {
      if (Array.isArray(value)) {
        value.forEach(traverse);
      } else if (value !== null && typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          if (
            key === 'product_ids' &&
            Array.isArray(nested) &&
            nested.every(item => typeof item === 'number')
          ) {
            result.push(...nested);
          } else {
            traverse(nested);
          }
        }
      }
    }

    traverse(obj);
    return result;
  }

  submit() {
    const productIds = Array.from(new Set(this.concatDynamicProductKeys(this.form.value)));
    this.form.get('content.products_ids')?.setValue(productIds);

    if (this.form.valid) {
      this.store.dispatch(new UpdateHomePageAction(this.page_data.id, this.form.value));
    }
  }
}
