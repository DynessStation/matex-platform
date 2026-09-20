import { Params } from '../../interface/core.interface';
import { IProduct } from '../../interface/product.interface';

export class GetProductsAction {
  static readonly type = '[Product] Get';
  constructor(public payload?: Params) {}
}

export class CreateProductAction {
  static readonly type = '[Product] Create';
  constructor(public payload: IProduct) {}
}

export class EditProductAction {
  static readonly type = '[Product] Edit';
  constructor(public id: number) {}
}

export class UpdateProductAction {
  static readonly type = '[Product] Update';
  constructor(
    public payload: IProduct,
    public id: number,
  ) {}
}

export class UpdateProductStatusAction {
  static readonly type = '[Product] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class ApproveProductStatusAction {
  static readonly type = '[Product] Approve Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteProductAction {
  static readonly type = '[Product] Delete';
  constructor(public id: number) {}
}

export class DeleteAllProductAction {
  static readonly type = '[Product] Delete All';
  constructor(public ids: number[]) {}
}

export class ReplicateProductAction {
  static readonly type = '[Product] Replicate';
  constructor(public ids: number[]) {}
}

export class ImportProductAction {
  static readonly type = '[Product] Import';
  constructor(public payload: File[]) {}
}

export class ExportProductAction {
  static readonly type = '[Product] Export';
  constructor(public payload: Params) {}
}

export class DownloadAction {
  static readonly type = '[Product] Download';
  constructor(public payload: { product_id: number; variation_id?: number | null }) {}
}
