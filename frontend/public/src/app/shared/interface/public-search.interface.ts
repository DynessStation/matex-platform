import { IBlog } from './blog.interface';
import { Product } from './product.interface';

export interface PublicSearchResults {
  term: string;
  products: Product[];
  articles: IBlog[];
  total: number;
}
