import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Params } from '../interface/core.interface';
import { ContactUsModel, FaqModel, PageModel } from '../interface/page.interface';
import { IStoresModel } from '../interface/store.interface';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  public skeletonLoader: boolean = false;

  constructor(private http: HttpClient) {}

  getPages(payload?: Params): Observable<PageModel> {
    return this.http.get<PageModel>(`${environment.URL}/page.json`, { params: payload });
  }

  getFaqs(): Observable<FaqModel> {
    return this.http.get<FaqModel>(`${environment.URL}/faq.json`);
  }

  contactUs(payload: ContactUsModel) {
    return this.http.post(`${environment.URL}/contact-us`, payload);
  }

  getStores(payload?: Params): Observable<IStoresModel> {
    return this.http.get<IStoresModel>(`${environment.URL}/store`, { params: payload });
  }
}
