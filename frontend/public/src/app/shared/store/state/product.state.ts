import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { finalize, tap } from 'rxjs';

import { Product, ProductModel } from '../../interface/product.interface';
import { ProductService } from '../../services/product.service';
import { ThemeOptionService } from '../../services/theme-option.service';
import {
  GetCategoryProducts,
  GetMenuProducts,
  GetMoreProduct,
  GetProductByIds,
  GetProductBySearch,
  GetProductBySlug,
  GetProducts,
  GetRelatedProducts,
  GetStoreProducts,
} from '../action/product.action';

export class ProductStateModel {
  product = {
    data: [] as Product[],
    total: 0,
  };
  selectedProduct: Product | null;
  categoryProducts: Product[] | [];
  relatedProducts: Product[] | [];
  storeProducts: Product[] | [];
  dealProducts: Product[] | [];
  menuProducts: Product[] | [];
  productBySearch: Product[] | [];
  productBySearchList: Product[] | [];
  productByIds: Product[] | [];
  moreProduct: Product[] | [];
}

@State<ProductStateModel>({
  name: 'product',
  defaults: {
    product: {
      data: [],
      total: 0,
    },
    selectedProduct: null,
    categoryProducts: [],
    relatedProducts: [],
    storeProducts: [],
    dealProducts: [],
    menuProducts: [],
    productBySearch: [],
    productBySearchList: [],
    productByIds: [],
    moreProduct: [],
  },
})
@Injectable()
export class ProductState {
  constructor(
    private store: Store,
    private router: Router,
    private productService: ProductService,
    private themeOptionService: ThemeOptionService,
  ) {}

  @Selector()
  static product(state: ProductStateModel) {
    return state.product;
  }

  @Selector()
  static productByIds(state: ProductStateModel) {
    return state.productByIds;
  }

  @Selector()
  static productBySearch(state: ProductStateModel) {
    return state.productBySearch;
  }

  @Selector()
  static productBySearchList(state: ProductStateModel) {
    return state.productBySearchList;
  }

  @Selector()
  static selectedProduct(state: ProductStateModel) {
    return state.selectedProduct;
  }

  @Selector()
  static relatedProducts(state: ProductStateModel) {
    return state.relatedProducts;
  }

  @Selector()
  static categoryProducts(state: ProductStateModel) {
    return state.categoryProducts;
  }

  @Selector()
  static storeProducts(state: ProductStateModel) {
    return state.storeProducts;
  }

  @Selector()
  static menuProducts(state: ProductStateModel) {
    return state.menuProducts;
  }

  @Selector()
  static moreProduct(state: ProductStateModel) {
    return state.moreProduct;
  }

  @Action(GetProducts)
  getProducts(ctx: StateContext<ProductStateModel>, action: GetProducts) {
    this.productService.skeletonLoader = true;
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: ProductModel) => {
          ctx.patchState({
            product: {
              data: result.data ?? [],
              total: result.total ?? 0,
            },
          });
        },
        complete: () => {
          this.productService.skeletonLoader = false;
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetProductByIds)
  getProductByIds(ctx: StateContext<ProductStateModel>, action: GetProductByIds) {
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: ProductModel) => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            productByIds: result.data,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetProductBySlug)
  getProductBySlug(ctx: StateContext<ProductStateModel>, { slug, locale }: GetProductBySlug) {
    this.themeOptionService.preloader.set(true);
    return this.productService.getProductBySlug(slug, locale).pipe(
      tap({
        next: (result) => {
          result.related_products =
            result.related_products && result.related_products.length
              ? result.related_products
              : [];
          result.cross_sell_products =
            result.cross_sell_products && result.cross_sell_products.length
              ? result.cross_sell_products
              : [];

          const category = result.categories?.[0]?.slug;
          this.store.dispatch(
            new GetRelatedProducts({
              category: category ?? '',
              exclude_id: result.id,
              page: 1,
              paginate: 8,
              sortBy: 'asc',
            }),
          );

          ctx.patchState({ selectedProduct: result });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
      finalize(() => this.themeOptionService.preloader.set(false)),
    );
  }

  @Action(GetRelatedProducts)
  getRelatedProducts(ctx: StateContext<ProductStateModel>, action: GetProducts) {
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: ProductModel) => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            relatedProducts: result.data,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetCategoryProducts)
  getCategoryProducts(ctx: StateContext<ProductStateModel>, action: GetProducts) {
    this.productService.skeletonCategoryProductLoader = true;
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result) => {
          const state = ctx.getState();

          result.data.map((product: Product) => {
            product['categories_ids'] = product?.categories?.map((category) => category.id!);
          });

          let products = result.data.filter((product: Product) =>
            product?.categories_ids?.includes(action.payload!['category_id']),
          );
          products.splice(action.payload!['paginate']);

          ctx.patchState({
            ...state,
            product: {
              data: [...state.product.data, ...result.data],
              total: state.product.data.length + result.data.length,
            },
            categoryProducts: products,
          });
          this.productService.skeletonCategoryProductLoader = false;
        },
        complete: () => {
          this.productService.skeletonCategoryProductLoader = false;
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetStoreProducts)
  getStoreProducts(ctx: StateContext<ProductStateModel>, action: GetProducts) {
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: ProductModel) => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            storeProducts: result.data,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetMenuProducts)
  getMenuProducts(ctx: StateContext<ProductStateModel>, action: GetMenuProducts) {
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: ProductModel) => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            menuProducts: result.data,
          });
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetProductBySearch)
  getProductBySearch(ctx: StateContext<ProductStateModel>, action: GetProductBySearch) {
    this.productService.searchSkeleton = true;
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result) => {
          let products;
          if (action?.payload?.['search']) {
            products = result.data.filter((product: Product) =>
              product.name.toLowerCase().includes(action?.payload?.['search'].toLowerCase()),
            );
          } else {
            products = result.data;
          }

          ctx.patchState({
            productBySearch: products.splice(0, 4),
          });
        },
        complete: () => {
          this.productService.searchSkeleton = false;
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetMoreProduct)
  getMoreProduct(ctx: StateContext<ProductStateModel>, action: GetMoreProduct) {
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: ProductModel) => {
          const state = ctx.getState();

          result.data.map((product) => {
            product['categories_ids'] = product.categories.map((category) => category.id);
          });

          let filteredProducts = result.data;
          const page = action.payload!['page']; // e.g., 1 for the first page
          const itemsPerPage = action.payload!['paginate']; // e.g., 4 items per page

          const startIndex = (page - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;

          let paginatedProducts = filteredProducts.slice(startIndex, endIndex);

          if (action.value) {
            ctx.patchState({
              moreProduct: [...state.moreProduct, ...paginatedProducts],
            });
          } else {
            ctx.patchState({
              moreProduct: [...paginatedProducts],
            });
          }
        },
        error: (err) => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }
}
