import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';
import { IProduct, IProductModel } from '../../interface/product.interface';
import { ApiMessageService } from '../../services/api-message.service';
import { NotificationService } from '../../services/notification.service';
import { ProductService } from '../../services/product.service';
import {
  CreateProductAction, DeleteProductAction, EditProductAction, GetProductsAction,
  UpdateProductAction, UpdateProductStatusAction,
} from '../action/product.action';

export interface ProductStateModel {
  product: IProductModel;
  selectedProduct: IProduct | null;
  topSellingProducts: IProduct[];
}
@State<ProductStateModel>({
  name: 'product',
  defaults: { product: { data: [], total: 0 }, selectedProduct: null, topSellingProducts: [] },
})
@Injectable()
export class ProductState {
  private service = inject(ProductService);
  private notes = inject(NotificationService);
  private messages = inject(ApiMessageService);
  @Selector() static product(state: ProductStateModel) { return state.product; }
  @Selector() static selectedProduct(state: ProductStateModel) { return state.selectedProduct; }
  @Selector() static topSellingProducts(state: ProductStateModel) { return state.topSellingProducts; }
  @Selector() static products(state: ProductStateModel) {
    return state.product.data.map(item => ({ label: item.name, value: item.id, data: { name: item.name, slug: item.slug, type: item.product_type, stock_status: item.stock_status, image: item.product_thumbnail?.original_url || 'assets/images/product.png' } }));
  }
  @Selector() static digitalProducts(state: ProductStateModel) {
    return state.product.data.filter(item => item.product_type === 'digital').map(item => ({ label: item.name, value: item.id, data: { name: item.name, product_id: item.id, variation_id: null, image: item.product_thumbnail?.original_url || 'assets/images/product.png' } }));
  }
  @Action(GetProductsAction) get(ctx: StateContext<ProductStateModel>, action: GetProductsAction) {
    return this.service.getProducts(action.payload).pipe(tap(result => ctx.patchState({ product: result })));
  }
  @Action(EditProductAction) edit(ctx: StateContext<ProductStateModel>, action: EditProductAction) {
    ctx.patchState({ selectedProduct: null });
    return this.service.getProduct(action.id).pipe(tap(result => ctx.patchState({ selectedProduct: result.data ?? null })));
  }
  @Action(CreateProductAction) create(_: StateContext<ProductStateModel>, action: CreateProductAction) {
    return this.service.create(action.payload).pipe(tap(result => this.notes.showSuccess(this.messages.resolveResponse(result))));
  }
  @Action(UpdateProductAction) update(_: StateContext<ProductStateModel>, action: UpdateProductAction) {
    return this.service.update(action.id, action.payload).pipe(tap(result => this.notes.showSuccess(this.messages.resolveResponse(result))));
  }
  @Action(UpdateProductStatusAction) updateStatus(_: StateContext<ProductStateModel>, action: UpdateProductStatusAction) {
    return this.service.updateStatus(action.id, action.status).pipe(tap(result => this.notes.showSuccess(this.messages.resolveResponse(result))));
  }
  @Action(DeleteProductAction) delete(_: StateContext<ProductStateModel>, action: DeleteProductAction) {
    return this.service.delete(action.id).pipe(tap(result => this.notes.showSuccess(this.messages.resolveResponse(result))));
  }
}
