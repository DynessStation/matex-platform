import { IBrand } from '../../interface/brand.interface';
import { Params } from '../../interface/core.interface';

export class GetBrandsAction {
  static readonly type = '[Brand] Get';
  constructor(public payload?: Params) {}
}

export class CreateBrandAction {
  static readonly type = '[Brand] Create';
  constructor(public payload: IBrand) {}
}

export class EditBrandAction {
  static readonly type = '[Brand] Edit';
  constructor(public id: number) {}
}

export class UpdateBrandAction {
  static readonly type = '[Brand] Update';
  constructor(
    public payload: IBrand,
    public id: number,
  ) {}
}

export class UpdateBrandStatusAction {
  static readonly type = '[Brand] Update Status';
  constructor(
    public id: number,
    public status: boolean,
  ) {}
}

export class DeleteBrandAction {
  static readonly type = '[Brand] Delete';
  constructor(public id: number) {}
}

export class DeleteAllBrandAction {
  static readonly type = '[Brand] Delete All';
  constructor(public ids: number[]) {}
}

export class ImportBrandAction {
  static readonly type = '[Brand] Import';
  constructor(public payload: File[]) {}
}

export class ExportBrandAction {
  static readonly type = '[Brand] Export';
}
