import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable, Subscription, combineLatest, map } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { ICategory } from '../../../shared/interface/category.interface';
import { Params } from '../../../shared/interface/core.interface';
import { ProductModel } from '../../../shared/interface/product.interface';
import { LayoutService } from '../../../shared/services/layout.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { PublicSeoAlternate, PublicSeoService } from '../../../shared/services/public-seo.service';
import { GetProducts } from '../../../shared/store/action/product.action';
import { CategoryState } from '../../../shared/store/state/category.state';
import { ProductState } from '../../../shared/store/state/product.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { CollectionProducts } from '../collection/widgets/collection-products/collection-products';

@Component({
  selector: 'app-category',
  imports: [CollectionProducts, HomeNewsletter, Breadcrumb, AsyncPipe],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category {
  private store = inject(Store);
  private seo = inject(PublicSeoService);
  public layoutService = inject(LayoutService);
  private navigation = inject(PublicNavigationContextService);
  product$: Observable<ProductModel> = this.store.select(ProductState.product);
  category$: Observable<ICategory | null> = this.store.select(CategoryState.selectedCategory);

  breadcrumb$: Observable<breadcrumb> = this.category$.pipe(
    map((category) => ({
      title: category?.name || '',
      items: [
        {
          label: this.navigation.locale() === 'en-US' ? 'Product Catalog' : 'Katalog Produk',
          url: this.navigation.locale() === 'en-US' ? '/en/catalog' : '/katalog',
          active: false,
        },
        { label: category?.name || '', active: true },
      ],
    })),
  );
  public layout: string = 'collection_category_slider';
  public skeleton: boolean = true;
  public category: ICategory | null = null;
  public activeCategory: string | null = null;
  public filter: Params = {
    page: 1,
    paginate: 40,
    status: 1,
    field: 'created_at',
    price: '',
    category: '',
    tag: '',
    sort: 'asc',
    sortBy: 'asc',
    rating: '',
    attribute: '',
  };

  private subscriptions: Subscription = new Subscription();
  public totalItems: number = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.subscriptions.add(
      combineLatest([this.route.paramMap, this.category$]).subscribe(([params, category]) => {
        const slug = params.get('slug');
        this.activeCategory = slug;

        // Angular reuses this component when only the slug changes. Ignore the
        // previous store value until the resolver has loaded the requested category.
        if (!slug || !category || category.slug !== slug) return;

        this.category = category;
        this.applySeo(category);
        this.filter['page'] = 1;
        this.updateFilterAndFetchProducts();
      }),
    );
  }

  private updateFilterAndFetchProducts() {
    if (this.category) {
      this.filter['category'] = this.category.slug;
    }
    this.store.dispatch(new GetProducts(this.filter));
  }

  public changePage(page: number) {
    this.filter['page'] = page;
    this.updateFilterAndFetchProducts();
  }

  public changePaginate(paginate: number) {
    this.filter['paginate'] = paginate;
    this.updateFilterAndFetchProducts();
  }

  private applySeo(category: ICategory) {
    const locale: 'id-ID' | 'en-US' = this.navigation.locale() === 'en-US' ? 'en-US' : 'id-ID';
    const title = category.meta_title || category.name;
    const description = category.meta_description || category.description || '';
    const currentPath = `${locale === 'en-US' ? '/en/category/' : '/kategori/'}${encodeURIComponent(category.slug)}`;
    const canonical = this.seo.canonicalUrl(currentPath, category.canonical_url);
    const image =
      category.category_meta_image?.original_url || category.category_image?.original_url;
    const alternates: PublicSeoAlternate[] = [
      {
        locale: 'id-ID',
        path: `/kategori/${encodeURIComponent(category.localized_slugs?.['id-ID'] || category.slug)}`,
      },
      {
        locale: 'en-US',
        path: `/en/category/${encodeURIComponent(category.localized_slugs?.['en-US'] || category.slug)}`,
      },
    ];

    this.seo.apply({
      locale,
      title,
      description,
      canonicalPath: currentPath,
      canonicalUrl: canonical,
      alternates,
      socialTitle: category.og_title || title,
      socialDescription: category.og_description || description,
      image,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.name,
        description: this.seo.toPlainText(description),
        url: canonical,
        inLanguage: locale,
      },
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.seo.clear();
  }
}
