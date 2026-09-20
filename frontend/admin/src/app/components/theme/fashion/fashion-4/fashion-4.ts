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
import { AdvanceDropdown } from '../../../../shared/components/ui/advance-dropdown/advance-dropdown';
import { Button } from '../../../../shared/components/ui/button/button';
import { FormFields } from '../../../../shared/components/ui/form-fields/form-fields';
import { ImageUpload } from '../../../../shared/components/ui/image-upload/image-upload';
import { Link } from '../../../../shared/components/ui/link/link';
import { mediaConfig } from '../../../../shared/data/media-config';
import { HasPermissionDirective } from '../../../../shared/directive/has-permission.directive';
import { ICategoryModel } from '../../../../shared/interface/category.interface';
import { Params } from '../../../../shared/interface/core.interface';
import { IBanners, IFashionFour } from '../../../../shared/interface/theme.interface';
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
  selector: 'app-fashion-4',
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
    AdvanceDropdown,
  ],
  templateUrl: './fashion-4.html',
  styleUrl: './fashion-4.scss',
})
export class Fashion4 {
  private store = inject(Store);
  formBuilder = inject(FormBuilder);
  private renderer = inject(Renderer2);
  private document = inject<Document>(DOCUMENT);

  home_page$: Observable<IFashionFour> = inject(Store).select(ThemeState.homePage);
  product$: Observable<Select2Data> = inject(Store).select(ProductState.products);
  category$: Observable<ICategoryModel> = inject(Store).select(
    CategoryState.category,
  ) as Observable<ICategoryModel>;
  blogs$: Observable<Select2Data> = inject(Store).select(BlogState.blogs);
  brand$: Observable<Select2Data> = inject(Store).select(BrandState.brands);

  public form: FormGroup;
  public page_data: IFashionFour;
  public active = 'home_banner';
  public banner = 1;
  public product_list_tab = 1;
  public selectedCategories: number[] = [];
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
    this.form = new FormGroup({
      content: new FormGroup({
        home_banner: new FormGroup({
          status: new FormControl(true),
          banners: new FormArray([]),
        }),
        offer_banner_1: new FormGroup({
          banner_1: new FormGroup({
            image_url: new FormControl(),
            status: new FormControl(true),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_2: new FormGroup({
            image_url: new FormControl(),
            status: new FormControl(true),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
          banner_3: new FormGroup({
            image_url: new FormControl(),
            status: new FormControl(true),
            redirect_link: new FormGroup({
              link: new FormControl(''),
              link_type: new FormControl(''),
              product_ids: new FormControl(''),
            }),
          }),
        }),
        products_list: new FormGroup({
          status: new FormControl(),
          categories: new FormGroup({
            category_ids: new FormControl([]),
            status: new FormControl(false),
          }),
          products: new FormGroup({
            tag: new FormControl(''),
            title: new FormControl(''),
            product_ids: new FormControl([]),
            status: new FormControl(),
          }),
        }),
        offer_banner_2: new FormGroup({
          image_url: new FormControl(''),
          status: new FormControl(true),
        }),
        brand: new FormGroup({
          brand_ids: new FormControl(''),
          status: new FormControl(true),
        }),
        products_ids: new FormControl([]),
      }),
      slug: new FormControl('fashion_four'),
    });
  }

  ngOnInit() {
    const blogs$ = this.store.dispatch(new GetBlogsAction({ status: 1 }));
    const categories$ = this.store.dispatch(
      new GetCategoriesAction({ status: 1, type: 'product' }),
    );
    const home_page$ = this.store.dispatch(new GetHomePageAction({ slug: 'fashion_four' }));
    const brand$ = this.store.dispatch(new GetBrandsAction({ status: 1 }));

    forkJoin([blogs$, home_page$, categories$, brand$]).subscribe({
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
      this.selectedCategories = homePage?.content?.products_list?.categories?.category_ids || [];

      this.form.patchValue({
        content: {
          home_banner: {
            status: homePage?.content?.home_banner?.status,
          },
          offer_banner_1: {
            banner_1: {
              image_url: homePage?.content?.offer_banner_1?.banner_1?.image_url,
              status: homePage?.content?.offer_banner_1?.banner_1?.status,
              redirect_link: {
                link: homePage?.content?.offer_banner_1?.banner_1?.redirect_link?.link,
                link_type: homePage?.content?.offer_banner_1?.banner_1?.redirect_link?.link_type,
                product_ids:
                  homePage?.content?.offer_banner_1?.banner_1?.redirect_link?.product_ids,
              },
            },
            banner_2: {
              image_url: homePage?.content?.offer_banner_1?.banner_2?.image_url,
              status: homePage?.content?.offer_banner_1?.banner_2?.status,
              redirect_link: {
                link: homePage?.content?.offer_banner_1?.banner_2?.redirect_link?.link,
                link_type: homePage?.content?.offer_banner_1?.banner_2?.redirect_link?.link_type,
                product_ids:
                  homePage?.content?.offer_banner_1?.banner_2?.redirect_link?.product_ids,
              },
            },
            banner_3: {
              image_url: homePage?.content?.offer_banner_1?.banner_3?.image_url,
              status: homePage?.content?.offer_banner_1?.banner_3?.status,
              redirect_link: {
                link: homePage?.content?.offer_banner_1?.banner_3?.redirect_link?.link,
                link_type: homePage?.content?.offer_banner_1?.banner_3?.redirect_link?.link_type,
                product_ids:
                  homePage?.content?.offer_banner_1?.banner_3?.redirect_link?.product_ids,
              },
            },
          },
          products_list: {
            status: homePage?.content?.products_list?.status,
            categories: {
              category_ids: homePage?.content?.products_list?.categories?.category_ids,
              status: homePage?.content?.products_list?.categories?.status,
            },
            products: {
              tag: homePage?.content?.products_list?.products?.tag,
              title: homePage?.content?.products_list?.products?.title,
              product_ids: homePage?.content?.products_list?.products?.product_ids,
              status: homePage?.content?.products_list?.products?.status,
            },
          },
          offer_banner_2: {
            image_url: homePage?.content?.offer_banner_2?.image_url,
            status: homePage?.content?.offer_banner_2?.status,
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

      // this.bannersArray.clear();
      // homePage?.content?.value_banners?.banners?.forEach((banners: IBanners) =>
      // this.bannersArray.push(
      //   this.formBuilder.group({
      //     redirect_link: new FormGroup({
      //       link: new FormControl(banners?.redirect_link?.link),
      //       link_type: new FormControl(banners?.redirect_link?.link_type),
      //     }),
      //     status: new FormControl(banners?.status),
      //     image_url: new FormControl(banners?.image_url),
      //   })
      // ));
    });
  }

  selectCategoryItem(data: Number[], key: string) {
    if (Array.isArray(data)) {
      this.form.get(key)?.setValue(data);
    }
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

  get bannersArray(): FormArray {
    return this.form.get('content.value_banners.banners') as FormArray;
  }

  selectImage(url: string, key: string) {
    this.form.get(key)?.setValue(url ? url : null);
  }

  selectBannerArray(url: string, index: number) {
    this.bannersArray
      .at(index)
      .get('image_url')
      ?.setValue(url ? url : null);
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

  addBanner(event: Event) {
    event.preventDefault();
    this.bannersArray.push(
      this.formBuilder.group({
        redirect_link: new FormGroup({
          link: new FormControl(''),
          link_type: new FormControl(''),
        }),
        status: new FormControl(),
        image_url: new FormControl(''),
      }),
    );
  }

  selectHomeBannerArray(url: string, index: number) {
    this.homeBannersArray
      .at(index)
      .get('image_url')
      ?.setValue(url ? url : null);
  }

  removeHomeBanner(index: number) {
    if (this.homeBannersArray.length <= 1) return;
    this.homeBannersArray.removeAt(index);
  }

  remove(index: number) {
    if (this.bannersArray.length <= 1) return;
    this.bannersArray.removeAt(index);
  }

  // Merge Products Ids
  concatDynamicProductKeys(obj: IFashionFour): number[] {
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
