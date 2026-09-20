import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Brand, BrandModel } from '../interface/brand.interface';
import { Params } from '../interface/core.interface';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  public skeletonLoader: boolean = false;

  constructor(private http: HttpClient) {}

  getBrands(payload?: Params): Observable<BrandModel> {
    return this.http.get<BrandModel>(`${environment.URL}/brand.json`, { params: payload });
  }

  getBrandBySlug(slug: string): Observable<Brand> {
    return this.http.get<Brand>(`${environment.URL}/brand/slug/${slug}`);
  }
}
