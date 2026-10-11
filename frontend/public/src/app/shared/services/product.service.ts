import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import { Product, ProductModel } from '../interface/product.interface';
import { PublicApiResponse } from '../interface/public-content.interface';
import { SettingState } from '../store/state/setting.state';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private store = inject(Store);
  public skeletonLoader = false;
  public skeletonCategoryProductLoader = false;
  public productFilter = false;
  public searchSkeleton = false;
  getProducts(payload?: Params) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(payload ?? {}))
      if (value !== '' && value != null) params = params.set(key, String(value));
    if (!params.has('currency')) params = params.set('currency', this.currencyCode());
    return this.http
      .get<PublicApiResponse<ProductModel>>(
        `${environment.publicApiURL}/products/${this.locale()}`,
        {
          params,
        },
      )
      .pipe(map((r) => r.data ?? { data: [], total: 0 }));
  }
  getProductBySlug(slug: string, locale: 'id-ID' | 'en-US' = this.locale()) {
    return this.http
      .get<PublicApiResponse<Product>>(
        `${environment.publicApiURL}/products/${locale}/${encodeURIComponent(slug)}`,
        { params: { currency: this.currencyCode() } },
      )
      .pipe(map((r) => r.data!));
  }
  private locale() {
    return this.router.url === '/en' || this.router.url.startsWith('/en/') ? 'en-US' : 'id-ID';
  }
  private currencyCode() {
    const requestedCode = String(
      this.router.parseUrl(this.router.url).queryParams['currency'] ?? '',
    ).toUpperCase();
    if (requestedCode === 'IDR' || requestedCode === 'USD') return requestedCode;
    return this.store.selectSnapshot(SettingState.selectedCurrency)?.code || 'IDR';
  }
}
