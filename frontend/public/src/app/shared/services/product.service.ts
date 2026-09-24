import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import { Product, ProductModel } from '../interface/product.interface';
import { PublicApiResponse } from '../interface/public-content.interface';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http=inject(HttpClient);private router=inject(Router);
  public skeletonLoader=false;public skeletonCategoryProductLoader=false;public productFilter=false;public searchSkeleton=false;
  getProducts(payload?:Params){let params=new HttpParams();for(const [key,value] of Object.entries(payload??{}))if(value!==''&&value!=null)params=params.set(key,String(value));return this.http.get<PublicApiResponse<ProductModel>>(`${environment.cmsApiURL}/products/${this.locale()}`,{params}).pipe(map(r=>r.data??{data:[],total:0}));}
  getProductBySlug(slug:string){return this.http.get<PublicApiResponse<Product>>(`${environment.cmsApiURL}/products/${this.locale()}/${encodeURIComponent(slug)}`).pipe(map(r=>r.data!));}
  private locale(){return this.router.url==='/en'||this.router.url.startsWith('/en/')?'en-US':'id-ID';}
}
