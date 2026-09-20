import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment.development';
import { Params } from '../interface/core.interface';
import { IPageModel } from '../interface/page.interface';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private http = inject(HttpClient);

  getPages(payload?: Params): Observable<IPageModel> {
    return this.http.get<IPageModel>(`${environment.URL}/page.json`, { params: payload });
  }
}
