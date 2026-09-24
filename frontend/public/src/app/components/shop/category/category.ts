import { AsyncPipe, DOCUMENT } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable, Subscription, map } from 'rxjs';

import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { ICategory } from '../../../shared/interface/category.interface';
import { Params } from '../../../shared/interface/core.interface';
import { ProductModel } from '../../../shared/interface/product.interface';
import { LayoutService } from '../../../shared/services/layout.service';
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
  private meta = inject(Meta);
  private title = inject(Title);
  public layoutService = inject(LayoutService);
  product$: Observable<ProductModel> = this.store.select(ProductState.product);
  category$: Observable<ICategory | null> = this.store.select(CategoryState.selectedCategory);

  breadcrumb$: Observable<breadcrumb> = this.category$.pipe(
    map((category) => ({
      title: category?.name || '',
      items: [{ label: category?.name || '', active: false }],
    })),
  );
  public layout: string = 'collection_category_slider';
  public skeleton: boolean = true;
  public category: ICategory;
  public activeCategory: string | null;
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

  constructor(
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
  ) {
    if (this.route.snapshot.paramMap.get('slug')) {
      this.activeCategory = this.route.snapshot.paramMap.get('slug');
      this.filter['category'] = this.activeCategory;
    }
  }

  ngOnInit() {
    this.subscriptions.add(
      this.category$.subscribe((category) => {
        this.category = category!;
        if (category) this.applySeo(category);
        this.updateFilterAndFetchProducts();
      }),
    );

    this.filter['category'] = this.route.snapshot.paramMap.get('slug');
    this.store.dispatch(new GetProducts(this.filter));
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
    const title = category.meta_title || category.name;
    const description = category.meta_description || category.description || '';
    const canonical = category.canonical_url || this.document.location?.href || '';
    const image =
      category.category_meta_image?.original_url || category.category_image?.original_url;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:title', content: category.og_title || title });
    this.meta.updateTag({
      property: 'og:description',
      content: category.og_description || description,
    });
    if (image) this.meta.updateTag({ property: 'og:image', content: image });
    let link = this.document.querySelector<HTMLLinkElement>(
      'link[data-product-category-canonical]',
    );
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      link.dataset['productCategoryCanonical'] = 'true';
      this.document.head.appendChild(link);
    }
    link.href = canonical;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.document.querySelector('link[data-product-category-canonical]')?.remove();
  }
}
