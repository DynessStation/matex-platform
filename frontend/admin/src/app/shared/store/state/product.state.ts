import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { Select2Data } from 'ng-select2-component';
import { tap } from 'rxjs';

import { IProduct, IProductModel, IVariation } from '../../interface/product.interface';
import { NotificationService } from '../../services/notification.service';
import { ProductService } from '../../services/product.service';
import {
  GetProductsAction,
  CreateProductAction,
  EditProductAction,
  UpdateProductAction,
  UpdateProductStatusAction,
  ApproveProductStatusAction,
  DeleteProductAction,
  DeleteAllProductAction,
  ReplicateProductAction,
  ExportProductAction,
  ImportProductAction,
  DownloadAction,
} from '../action/product.action';

export class ProductStateModel {
  product = {
    data: [] as IProduct[],
    total: 0,
  };
  selectedProduct: IProduct | null;
  topSellingProducts: IProduct[];
}

@State<ProductStateModel>({
  name: 'product',
  defaults: {
    product: {
      data: [],
      total: 0,
    },
    selectedProduct: null,
    topSellingProducts: [],
  },
})
@Injectable()
export class ProductState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private productService = inject(ProductService);

  @Selector()
  static product(state: ProductStateModel) {
    return state.product;
  }

  @Selector()
  static products(state: ProductStateModel) {
    return state.product.data
      .filter(data => data.id !== state.selectedProduct?.id)
      .map((res: IProduct) => {
        return {
          label: res?.name,
          value: res?.id,
          data: {
            type: res.type,
            name: res.name,
            slug: res.slug,
            stock_status: res.stock_status,
            image: res.product_thumbnail
              ? res.product_thumbnail.original_url
              : 'assets/images/product.png',
          },
        };
      });
  }

  @Selector()
  static digitalProducts(state: ProductStateModel) {
    let products: Select2Data = [];
    state.product.data
      .filter(data => data.id !== state.selectedProduct?.id && data.product_type == 'digital')
      .map((res: IProduct) => {
        products.push({
          label: res?.name,
          value: res?.id,
          data: {
            name: res.name,
            product_id: res?.id,
            variation_id: null,
            image: res.product_thumbnail
              ? res.product_thumbnail.original_url
              : 'assets/images/product.png',
          },
        });
        if (res?.variations?.length) {
          res.variations.map((variation: IVariation) => {
            products.push({
              label: variation?.name,
              value: variation?.id!,
              data: {
                name: variation.name,
                product_id: res?.id,
                variation_id: variation?.id,
                image: variation.variation_image
                  ? variation.variation_image.original_url
                  : 'assets/images/product.png',
              },
            });
          });
        }
      });
    return products;
  }

  @Selector()
  static selectedProduct(state: ProductStateModel) {
    return state.selectedProduct;
  }

  @Selector()
  static topSellingProducts(state: ProductStateModel) {
    return state.topSellingProducts;
  }

  @Action(GetProductsAction)
  getProducts(ctx: StateContext<ProductStateModel>, action: GetProductsAction) {
    return this.productService.getProducts(action.payload).pipe(
      tap({
        next: (result: IProductModel) => {
          let paginateProduct;
          if (action.payload!['page'] && action.payload!['paginate']) {
            paginateProduct = result.data
              .map(product => ({ ...product }))
              .slice(
                (action.payload!['page'] - 1) * action.payload!['paginate'],
                (action.payload!['page'] - 1) * action.payload!['paginate'] +
                action.payload!['paginate'],
              );
          } else {
            paginateProduct = result.data;
          }

          if (action?.payload!['top_selling']) {
            const state = ctx.getState();
            ctx.patchState({
              ...state,
              topSellingProducts: paginateProduct,
            });
          } else {
            ctx.patchState({
              product: {
                data: paginateProduct,
                total: result?.total ? result?.total : paginateProduct?.length,
              },
            });
          }
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateProductAction)
  create(_ctx: StateContext<ProductStateModel>, _action: CreateProductAction) {
    // Create Product Logic Here
  }

  @Action(EditProductAction)
  edit(ctx: StateContext<ProductStateModel>, { id }: EditProductAction) {
    return this.productService.getProducts().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(product => product.id == id);
          ctx.patchState({
            ...state,
            selectedProduct: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateProductAction)
  update(
    _ctx: StateContext<ProductStateModel>,
    { payload: _payload, id: _id }: UpdateProductAction,
  ) {
    // Update Product Login Here
  }

  @Action(UpdateProductStatusAction)
  updateStatus(
    _ctx: StateContext<ProductStateModel>,
    { id: _id, status: _status }: UpdateProductStatusAction,
  ) {
    // Update Product Status Login Here
  }

  @Action(ApproveProductStatusAction)
  approveStatus(
    _ctx: StateContext<ProductStateModel>,
    { id: _id, status: _status }: ApproveProductStatusAction,
  ) {
    // Approve Product Status Login Here
  }

  @Action(DeleteProductAction)
  delete(_ctx: StateContext<ProductStateModel>, { id: _id }: DeleteProductAction) {
    // Delete Product Login Here
  }

  @Action(DeleteAllProductAction)
  deleteAll(_ctx: StateContext<ProductStateModel>, { ids: _ids }: DeleteAllProductAction) {
    // Delete All Product Login Here
  }

  @Action(ReplicateProductAction)
  replicateProduct(_ctx: StateContext<ProductStateModel>, { ids: _ids }: ReplicateProductAction) {
    // Replicate Product Login Here
  }

  @Action(ImportProductAction)
  import(_ctx: StateContext<ProductStateModel>, _action: ImportProductAction) {
    // Import Product Login Here
  }

  @Action(ExportProductAction)
  export(_ctx: StateContext<ProductStateModel>, _action: ExportProductAction) {
    // Export Product Login Here
  }

  @Action(DownloadAction)
  download(_ctx: StateContext<ProductStateModel>, _action: DownloadAction) {
    // Download Product Login Here
  }
}
