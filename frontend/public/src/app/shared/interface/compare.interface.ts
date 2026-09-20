import { PaginateModel } from './core.interface';
import { Product } from './product.interface';

export interface ICompareModel extends PaginateModel {
  data: Product[];
}
