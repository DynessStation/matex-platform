import { Injectable, inject } from '@angular/core';

import { catchError, forkJoin, map, of } from 'rxjs';

import { PublicSearchResults } from '../interface/public-search.interface';
import { BlogService } from './blog.service';
import { ProductService } from './product.service';

@Injectable({ providedIn: 'root' })
export class PublicSearchService {
  private productService = inject(ProductService);
  private blogService = inject(BlogService);

  search(term: string, locale: string, limit = 6) {
    const cleanTerm = term.trim().slice(0, 200);

    if (cleanTerm.length < 2) {
      return of(this.empty(cleanTerm));
    }

    return forkJoin({
      products: this.productService
        .getProducts({ search: cleanTerm, page: 1, paginate: limit, status: 1 })
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      articles: this.blogService
        .getBlogs(locale, { search: cleanTerm, page: 1, paginate: limit, status: 1 })
        .pipe(catchError(() => of({ data: [], total: 0 }))),
    }).pipe(
      map(({ products, articles }): PublicSearchResults => ({
        term: cleanTerm,
        products: products.data.slice(0, limit),
        articles: articles.data.slice(0, limit),
        total: Number(products.total || 0) + Number(articles.total || 0),
      })),
    );
  }

  private empty(term: string): PublicSearchResults {
    return { term, products: [], articles: [], total: 0 };
  }
}
